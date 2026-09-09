/* ============================================================
 * ai.ts — rival rider brains
 *
 * Each AI follows the racing line, brakes for corners using a
 * physical speed limit, avoids traffic (especially oncoming),
 * overtakes slower riders and pulls alongside to throw punches.
 * ============================================================ */

import { CONFIG } from './config';
import { Racer } from './entities';
import { Track } from './track';
import { Traffic } from './traffic';
import { clamp } from './utils';

export interface AIWorld {
  track: Track;
  racers: Racer[];
  traffic: Traffic;
  player: Racer;
  time: number;
}

const LAT_ACCEL = 12.5; // m/s^2 the AI is willing to use mid-corner

export function updateAI(r: Racer, dt: number, w: AIWorld): void {
  const track = w.track;

  if (r.state === 'sliding') {
    r.updateCrash(dt);
    return;
  }

  /* ---------- 1. corner speed limit ---------- */
  const v = Math.max(6, r.speed);
  const k1 = Math.abs(track.sample(r.s + v * 0.5).curv);
  const k2 = Math.abs(track.sample(r.s + v * 0.95).curv);
  const k3 = Math.abs(track.sample(r.s + v * 1.5).curv);
  const k = Math.max(k1, k2 * 0.9, k3 * 0.7, 1e-5);
  let vLimit = Math.sqrt(LAT_ACCEL / k) * (0.9 + 0.1 * r.aiSkill);
  vLimit = Math.min(vLimit, r.maxSpeed);
  if (r.offroad) vLimit *= 0.78;

  // small per-rider ebb and flow so the pack breathes
  const wobble = 0.97 + 0.05 * Math.sin(w.time * 0.7 + r.aiWobblePhase);
  const targetSpeed = vLimit * wobble;
  r.aiTargetSpeed = targetSpeed;

  const stunned = r.stunTimer > 0;
  const err = targetSpeed - r.speed;
  const throttle = !stunned && err > 0.4;
  const brake = err < -2.2;

  /* ---------- 2. where to aim laterally ---------- */
  const look = 7 + v * 0.45;
  let targetX = track.idealAt(r.s + look) + r.aiWobble * 0.6;

  // hugging the apex should never drag us off the asphalt
  const safe = track.halfWidth - 1.0;
  targetX = clamp(targetX, -safe, safe);

  // stay on the black stuff if we just went farming
  if (r.offroad) targetX = Math.sign(r.x || 1) * track.halfWidth * 0.55;

  /* ---------- 3. avoid / overtake other riders ---------- */
  let push = 0;
  let bestAttack: { side: number; ds: number; dist: number } | null = null;
  let overtakeBoost = 1;

  for (const o of w.racers) {
    if (o === r || o.state === 'sliding') continue;
    const ds = track.delta(r.s, o.s);
    if (ds < -6 || ds > 30) continue;
    const dx = o.x - r.x;
    const gap = Math.abs(dx);

    // overtaking: somebody slower directly ahead
    if (ds > 0.5 && ds < 14 && gap < 2.8) {
      const closing = r.speed - o.speed;
      if (closing > -3) {
        push += (dx >= 0 ? -1 : 1) * (2.9 - gap) * 1.35;
        overtakeBoost = 1.05;
      } else {
        push += (dx >= 0 ? -1 : 1) * (2.4 - gap) * 0.5;
      }
    } else if (Math.abs(ds) < 8 && gap < 2.2) {
      push += (dx >= 0 ? -1 : 1) * (2.2 - gap) * 0.8;
    }

    // combat: pick the closest victim on either side
    if (
      !stunned &&
      ds > -0.8 &&
      ds < CONFIG.combat.aiAttackRange + (o === w.player ? 0.5 : 0)
    ) {
      const d = Math.hypot(ds, dx);
      if (gap < 2.5 && (!bestAttack || d < bestAttack.dist)) {
        bestAttack = { side: Math.sign(dx) || 1, ds, dist: d };
      }
    }
  }

  /* ---------- 4. avoid traffic ---------- */
  for (const car of w.traffic.cars) {
    if (!car.alive) continue;
    const ds = track.delta(r.s, car.s);
    const closingRange = car.dir < 0 ? 40 : 18;
    if (ds < -4 || ds > closingRange) continue;
    const dx = car.x - r.x;
    const gap = Math.abs(dx);
    const margin = car.dir < 0 ? 3.4 : 2.8;
    if (gap < margin) {
      const away = dx >= 0 ? -1 : 1;
      const urgency = 1 - ds / closingRange;
      push += away * (margin - gap) * (2.2 + 2.6 * urgency);
    }
  }

  targetX += clamp(push, -6, 6);

  // bloodlust: drift toward the player when close and aggressive
  if (!stunned) {
    const pds = track.delta(r.s, w.player.s);
    if (pds > 0 && pds < 18 && r.aiAggression > 0.85) {
      const pull = 1 - pds / 18;
      targetX += (w.player.x - r.x) * 0.5 * pull * r.aiAggression;
    }
  }

  targetX = clamp(targetX, -safe - 1.5, safe + 1.5);
  r.aiTargetX = targetX;

  /* ---------- 5. steering ---------- */
  const steerErr = targetX - r.x;
  const steer = clamp(steerErr * 0.42, -1, 1) * (0.55 + 0.45 * r.aiSkill);
  r.drive(dt, throttle, brake, steer);
  r.speed *= overtakeBoost > 1 ? 1.0008 : 1;

  /* ---------- 6. attack decision ---------- */
  r.aiNextAttack -= dt;
  if (
    !stunned &&
    bestAttack &&
    r.aiNextAttack <= 0 &&
    r.cooldown <= 0 &&
    r.attack === 'none'
  ) {
    const useClub = r.aiRng.chance(0.32);
    const kind = useClub ? 'club' : bestAttack.side > 0 ? 'punchR' : 'punchL';
    r.startAttack(kind);
    r.aiNextAttack =
      r.aiRng.range(CONFIG.combat.aiAttackCooldownMin, CONFIG.combat.aiAttackCooldownMax) /
      r.aiAggression;
  } else if (!bestAttack && r.aiNextAttack < -0.3) {
    r.aiNextAttack = r.aiRng.range(0.3, 0.9);
  }

  r.updateTimers(dt);
}
