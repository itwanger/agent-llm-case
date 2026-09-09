import { CONFIG } from './config';
import { Racer, type AttackType } from './entities';

export interface AttackSpec {
  dmg: number;
  windup: number;
  active: number;
  recover: number;
  cooldown: number;
  rangeS: number;
  rangeT: number;
}

export function attackSpec(type: AttackType): AttackSpec {
  return type === 'club' ? CONFIG.combat.club : CONFIG.combat.punch;
}

export function attackTotal(spec: AttackSpec): number {
  return spec.windup + spec.active + spec.recover;
}

export function startAttack(r: Racer, type: AttackType): boolean {
  if (r.state !== 'race' || r.attack || r.hitStun > 0) return false;
  if (type === 'club') {
    if (r.clubCd > 0) return false;
    r.clubCd = attackTotal(CONFIG.combat.club) + CONFIG.combat.club.cooldown;
  } else {
    if (r.punchCd > 0) return false;
    r.punchCd = attackTotal(CONFIG.combat.punch) + CONFIG.combat.punch.cooldown;
  }
  r.attack = { type, t: 0, hit: new Set() };
  return true;
}

export type HitCallback = (attacker: Racer, target: Racer, type: AttackType) => void;

export function updateAttack(r: Racer, dt: number, racers: Racer[], onHit: HitCallback, onSwing?: (r: Racer, type: AttackType) => void) {
  const a = r.attack;
  if (!a) return;
  const spec = attackSpec(a.type);
  const prev = a.t;
  a.t += dt;
  if (prev < spec.windup && a.t >= spec.windup) onSwing?.(r, a.type);
  const inActive = a.t >= spec.windup && a.t <= spec.windup + spec.active;
  if (inActive) {
    let best: Racer | null = null;
    let bestD = Infinity;
    for (const o of racers) {
      if (o === r || o.state !== 'race' || o.invuln > 0 || a.hit.has(o.id)) continue;
      const ds = o.s - r.s;
      const dtLat = o.t - r.t;
      if (Math.abs(ds) > spec.rangeS || Math.abs(dtLat) > spec.rangeT) continue;
      if (a.type === 'punchL' && dtLat > -0.3) continue;
      if (a.type === 'punchR' && dtLat < 0.3) continue;
      if (a.type === 'club' && Math.abs(dtLat) < 0.3) continue;
      const d = Math.abs(ds) + Math.abs(dtLat);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    if (best) {
      a.hit.add(best.id);
      onHit(r, best, a.type);
    }
  }
  if (a.t >= attackTotal(spec)) r.attack = null;
}
