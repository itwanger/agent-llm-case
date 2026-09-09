import * as THREE from 'three';
import { CONFIG } from './config';
import { Racer, TrafficCar } from './entities';
import { Road, scratchFrame } from './road';

export interface CollisionEvents {
  crash: Racer[];
  scrape: { racer: Racer; pos: THREE.Vector3 }[];
  spark: { pos: THREE.Vector3 }[];
}

export function newEvents(): CollisionEvents {
  return { crash: [], scrape: [], spark: [] };
}

const tmpV = new THREE.Vector3();

export function collideBikesWithWorld(
  racers: Racer[],
  cars: TrafficCar[],
  road: Road,
  ev: CollisionEvents,
  crashFn: (r: Racer) => void,
  damageFn: (r: Racer, dmg: number) => void,
) {
  const tClamp = CONFIG.bike.tClamp;
  for (const r of racers) {
    if (r.state !== 'race') continue;
    // guard rails
    if (Math.abs(r.t) > tClamp) {
      r.t = THREE.MathUtils.clamp(r.t, -tClamp, tClamp);
      r.tVel *= -0.3;
      r.v *= 0.97;
      if (r.v > 18) {
        road.positionAt(r.s, r.t, tmpV);
        tmpV.y += 0.8;
        ev.spark.push({ pos: tmpV.clone() });
      }
    }
    // oncoming cars
    for (const c of cars) {
      if (!c.active) continue;
      const ds = c.s - r.s;
      if (ds > -4.5 && ds < 5.5 && Math.abs(c.t - r.t) < 2.3) {
        const closing = r.v + c.v;
        const frontal = ds > -1.5;
        road.positionAt(r.s, (r.t + c.t) / 2, tmpV);
        tmpV.y += 0.8;
        if (frontal && closing > CONFIG.crash.headOnClosing && r.invuln <= 0) {
          ev.crash.push(r);
          crashFn(r);
        } else if (r.invuln <= 0) {
          r.v *= 0.88;
          r.tVel += Math.sign(r.t - c.t || 1) * 2.6;
          damageFn(r, CONFIG.crash.scrapeDmg);
          ev.scrape.push({ racer: r, pos: tmpV.clone() });
        } else {
          r.tVel += Math.sign(r.t - c.t || 1) * 1.2;
        }
      }
    }
  }
  // bike vs bike
  for (let i = 0; i < racers.length; i++) {
    for (let j = i + 1; j < racers.length; j++) {
      const a = racers[i];
      const b = racers[j];
      if (a.state === 'finished' && b.state === 'finished') continue;
      const ds = Math.abs(a.s - b.s);
      const dt = a.t - b.t;
      if (ds > 2.4 || Math.abs(dt) > 1.7) continue;
      if (a.state === 'crashed' || b.state === 'crashed') {
        const live = a.state === 'crashed' ? b : a;
        if (live.state === 'race' && live.invuln <= 0) {
          live.v *= 0.9;
          live.tVel += Math.sign(live.t - (a.state === 'crashed' ? a.t : b.t) || 1) * 2.2;
          damageFn(live, CONFIG.crash.scrapeDmg);
          road.positionAt(live.s, live.t, tmpV);
          tmpV.y += 0.8;
          ev.scrape.push({ racer: live, pos: tmpV.clone() });
        }
        continue;
      }
      if (a.state !== 'race' || b.state !== 'race') continue;
      const push = Math.sign(dt || 1) * 0.6;
      a.tVel += push;
      b.tVel -= push;
      const avg = (a.v + b.v) / 2;
      a.v = avg * 0.995 + (a.v > b.v ? -0.4 : 0.4);
      b.v = avg * 0.995 + (b.v > a.v ? -0.4 : 0.4);
    }
  }
}
