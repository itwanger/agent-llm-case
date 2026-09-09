import { CONFIG } from './config';
import { Racer, TrafficCar, type AttackType } from './entities';
import { Road } from './road';
import { startAttack } from './combat';

export interface AIContext {
  road: Road;
  racers: Racer[];
  cars: TrafficCar[];
  player: Racer;
  aggroCount: number;
  raceTime: number;
}

const OWN_LANES = [2.0, 5.2];
const ONCOMING_LANES = [-2.0, -5.2];

function laneClearAhead(cars: TrafficCar[], racers: Racer[], self: Racer, laneT: number, span: number): boolean {
  for (const c of cars) {
    if (!c.active) continue;
    const rel = c.s - self.s;
    if (rel > -10 && rel < span && Math.abs(c.t - laneT) < 3.0) return false;
  }
  for (const o of racers) {
    if (o === self || o.state !== 'race') continue;
    const rel = o.s - self.s;
    // head-on check for oncoming lanes
    if (laneT < 0 && rel < 0 && rel > -span && Math.abs(o.t - laneT) < 2.5) return false;
    if (laneT > 0 && rel > 0 && rel < span * 0.5 && Math.abs(o.t - laneT) < 2.2 && o.v < self.v) return false;
  }
  return true;
}

export function updateAI(r: Racer, ctx: AIContext, dt: number) {
  if (r.state !== 'race') return;
  if (r.hold) {
    r.throttle = 0;
    r.brake = 0;
    r.steerInput = 0;
    return;
  }
  const { road, player, racers, cars } = ctx;

  r.attackCd -= dt;
  r.aggroTimer -= dt;
  r.overtakeTimer -= dt;

  // --- speed target from skill + upcoming curvature
  const kAhead = road.maxKappaAhead(r.s + r.v * 0.8, 60 + r.v * 1.6);
  const vCurve = Math.sqrt(CONFIG.ai.latAccel / Math.max(kAhead, 1e-5));
  const gap = r.s - player.s;
  let rubber = 1;
  if (gap > 120) rubber = 0.55;
  else if (gap > 50) rubber = 0.75;
  else if (gap < -100) rubber = 1.06;
  let targetV = Math.min(r.cruiseV * rubber, vCurve);

  // --- lane / obstacle logic
  let targetT = r.laneT;
  if (r.overtakeTimer <= 0) {
    // default lane is always one of our own (right-half) lanes; ending up left
    // of the centerline without an active overtake means "merge back", never
    // "adopt the oncoming lane".
    r.laneT = Math.max(0, r.t) < 3.6 ? OWN_LANES[0] : OWN_LANES[1];
    targetT = r.laneT;
  }

  // oncoming cars conflict: if we are in an oncoming lane and a car is close ahead, bail out
  for (const c of cars) {
    if (!c.active) continue;
    const rel = c.s - r.s;
    if (rel > -6 && rel < 170 && Math.abs(c.t - r.t) < 3.2) {
      if (r.t < 0) {
        r.overtakeTimer = 0;
        r.laneT = OWN_LANES[r.s % 2 < 1 ? 0 : 1];
        targetT = r.laneT;
        targetV = Math.min(targetV, r.v * 0.9);
      } else {
        // car drifting near center: hug outer own lane
        targetT = OWN_LANES[1];
        r.laneT = targetT;
      }
    }
  }

  // slow bike ahead -> overtake (suppressed for the first seconds after the
  // start so the grid doesn't scatter across the centerline immediately)
  if (r.overtakeTimer <= 0 && ctx.raceTime > 4) {
    for (const o of racers) {
      if (o === r || o.state !== 'race') continue;
      const rel = o.s - r.s;
      if (rel > 0 && rel < 32 && Math.abs(o.t - r.t) < 2.6 && o.v < r.v - 1.5) {
        const candidates = [...OWN_LANES, ...ONCOMING_LANES].sort(
          (a, b) => Math.abs(a - r.t) - Math.abs(b - r.t) || (a > 0 ? -1 : 1),
        );
        for (const lane of candidates) {
          if (Math.abs(lane - o.t) < 2.4) continue;
          const span = lane < 0 ? 260 : 90;
          if (laneClearAhead(cars, racers, r, lane, span)) {
            r.laneT = lane;
            r.overtakeTimer = lane < 0 ? 3.0 : 2.5;
            targetT = lane;
            break;
          }
        }
        break;
      }
    }
  } else {
    targetT = r.laneT;
    if (r.laneT < 0 && !laneClearAhead(cars, racers, r, r.laneT, 240)) {
      r.overtakeTimer = 0;
      r.laneT = OWN_LANES[1];
      targetT = r.laneT;
    }
  }

  // --- combat state machine vs player
  const dsP = player.s - r.s;
  const dtP = player.t - r.t;
  const dist = Math.abs(dsP);
  if (r.aggro === 'none') {
    if (
      r.attackCd <= 0 &&
      dist < CONFIG.ai.aggroRange &&
      player.state === 'race' &&
      ctx.aggroCount < CONFIG.ai.aggroMax &&
      Math.random() < dt * 0.7 * r.skill
    ) {
      r.aggro = 'approach';
      r.side = dtP >= 0 ? 1 : -1; // side of player relative to us; we sit on opposite side
    }
  }
  if (r.aggro === 'approach') {
    if (dist > CONFIG.ai.aggroRange * 1.5 || player.state !== 'race') {
      r.aggro = 'none';
    } else {
      // match player speed to close in, sit beside player
      targetV = player.v + Math.sign(dsP) * 2.2;
      targetV = Math.max(targetV, 12);
      const wantT = player.t - r.side * 1.7;
      targetT = clampNum(wantT, -CONFIG.bike.tClamp + 1, CONFIG.bike.tClamp - 1);
      if (Math.abs(dsP) < 3.4 && Math.abs(r.t - wantT) < 0.9) {
        r.aggro = 'taunt';
        r.aggroTimer = 0.55;
      }
    }
  } else if (r.aggro === 'taunt') {
    targetV = player.v;
    targetT = r.t;
    if (r.aggroTimer <= 0) {
      r.aggro = 'attack';
      const type: AttackType = Math.abs(dtP) < 0.9 ? 'club' : dtP > 0 ? 'punchR' : 'punchL';
      r.pendingAttack = type;
    }
  } else if (r.aggro === 'attack') {
    targetV = player.v;
    targetT = r.t;
    if (r.pendingAttack && !r.attack) {
      if (startAttack(r, r.pendingAttack)) r.pendingAttack = undefined;
    }
    if (!r.attack && !r.pendingAttack) {
      r.aggro = 'disengage';
      r.aggroTimer = CONFIG.ai.disengageTime;
      r.attackCd = CONFIG.ai.attackCdMin + Math.random() * (CONFIG.ai.attackCdMax - CONFIG.ai.attackCdMin);
    }
  } else if (r.aggro === 'disengage') {
    targetV = r.cruiseV;
    if (r.aggroTimer <= 0) r.aggro = 'none';
  }

  // --- steering PD + centrifugal feedforward
  if (r.hitStun <= 0) {
    const kappa = road.kappaAt(r.s);
    const drift = -kappa * r.v * r.v * CONFIG.bike.driftCoef;
    const sf = Math.max(Math.min(1, r.v / 15), 0.35);
    const err = targetT - r.t;
    r.steerInput = clampNum(err * 0.4 - r.tVel * 0.25 - drift / (CONFIG.bike.steerSpeed * sf), -1, 1);
  } else {
    r.steerInput = 0;
  }

  // --- throttle / brake
  r.throttle = r.v < targetV ? 1 : 0;
  r.brake = r.v > targetV + 2 ? 1 : 0;
}

function clampNum(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}

export function countAggro(racers: Racer[]): number {
  let n = 0;
  for (const r of racers) {
    if (r.aggro === 'approach' || r.aggro === 'taunt' || r.aggro === 'attack') n++;
  }
  return n;
}
