/* ============================================================
 * config.ts — all gameplay tuning constants in one place
 * ============================================================ */

export const CONFIG = {
  /* ---- track ---- */
  road: {
    halfWidth: 9.0, // asphalt half-width (18 m wide road)
    shoulder: 4.5, // dirt shoulder beyond asphalt
    sampleStep: 4.0, // metres between centerline samples
    treeSeed: 1337,
  },

  /* ---- race ---- */
  race: {
    laps: 3,
    racers: 6, // player + 5 AI
    countdown: 3.2,
    finishHold: 2.4, // seconds after crossing before results
  },

  /* ---- player physics ---- */
  bike: {
    maxSpeed: 66, // m/s  (~238 km/h)
    reverseSpeed: -6,
    accel: 15.5, // m/s^2 at full throttle
    brake: 26,
    coastDrag: 3.4,
    engineBrake: 6.5,
    offroadDrag: 12,
    steerRate: 2.15, // lateral m/s per unit of steering at reference speed
    steerLerp: 7.5,
    maxLean: 0.82, // radians (~47 deg) visual lean
    wheelRadius: 0.42,
    wheelBase: 1.62,
    collisionHalfWidth: 0.62,
    collisionHalfLength: 1.15,
    crashSpeedDelta: 15.5, // relative closing speed that causes a crash
    hitSlowdown: 0.72, // speed multiplier when you land a hit
    takeHitSlowdown: 0.78,
  },

  /* ---- combat ---- */
  combat: {
    maxHealth: 100,
    punchDamage: 9,
    clubDamage: 19,
    punchRange: 2.9, // forward distance
    clubRange: 3.7,
    punchSide: 1.55, // lateral reach
    clubSide: 2.25,
    punchCooldown: 0.42,
    clubCooldown: 0.78,
    clubSwingTime: 0.34,
    punchTime: 0.26,
    hitStun: 0.55,
    knockback: 3.4, // lateral shove on hit (m/s)
    aiAttackCooldownMin: 1.5,
    aiAttackCooldownMax: 3.6,
    aiAttackRange: 3.4,
  },

  /* ---- crash / ragdoll ---- */
  crash: {
    slideTime: 2.9, // seconds of ragdoll before recovery
    gravity: 19,
    friction: 0.55, // ground friction while sliding
    recoverHealth: 45,
    recoverSpeedFrac: 0.22,
    invuln: 1.6,
  },

  /* ---- traffic ---- */
  traffic: {
    count: 12,
    minSpeed: 16,
    maxSpeed: 30,
    oncomingRatio: 0.5,
    respawnAhead: 640,
    despawnBehind: 300,
  },

  /* ---- camera ---- */
  camera: {
    fovBase: 66,
    fovSpeedGain: 14,
    distance: 5.9,
    height: 2.45,
    lookAhead: 8.2,
    lookHeight: 1.05,
    posLerp: 12.0,
    lookLerp: 13.0,
    shakeDecay: 5.2,
  },

  /* ---- rendering ---- */
  render: {
    fogNear: 88,
    fogFar: 580,
    skyTop: 0x1a2a6b,
    skyBottom: 0xff8a3d,
    sunDir: [0.42, 0.72, 0.55] as [number, number, number],
    shadowSize: 2048,
    shadowRange: 62,
  },
} as const;

export type Config = typeof CONFIG;

/** Palette used by the code-generated models. */
export const PALETTE = {
  bikeFrames: [0xe63329, 0x2f7dff, 0x22c55e, 0xffb020, 0xa855f7, 0x10d5c8],
  riderSuits: [0x1b1b24, 0x14213d, 0x2a1230, 0x123a22, 0x3a2408, 0x0d2a33],
  carBodies: [0xd94f4f, 0x4f7fd9, 0xd9c14f, 0x5fb85f, 0xd9d9d9, 0x8a5fd9, 0x4fbfc4],
  asphalt: 0x3a3a42,
  asphaltDark: 0x2e2e36,
  line: 0xe8e8e8,
  dirt: 0x8a6a3f,
  grass: 0x4f7a35,
  treeTrunk: 0x5a3d21,
  treeLeaf: [0x2f6b2a, 0x3d8433, 0x255c22],
};
