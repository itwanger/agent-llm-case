import type { ActionKind } from '../toys/types';
import type { Pose } from './Xiaoer';
export interface ActionFrame {
  pose: Partial<Pose>;
  offset?: [number, number, number];
  facing?: number;
}
export type Action = (time: number, progress: number) => ActionFrame;
const ease = (n: number) => {
  n = Math.max(0, Math.min(1, n));
  return n * n * (3 - 2 * n);
};
export const actions: Record<ActionKind, Action> = {
  stack: (t) => ({
    pose: {
      bodyY: -0.21,
      bodyX: 0.14,
      headX: 0.3,
      armLX: -0.64,
      armRX: -0.8 - Math.sin(t * 2.5) * 0.36,
      elbowR: -0.45,
      legLX: -1.05,
      legRX: -1.05,
      kneeL: 1.3,
      kneeR: 1.3,
      headY: Math.sin(t) * 0.1,
    },
  }),
  read: (t) => ({
    pose: {
      bodyY: -0.28,
      bodyX: 0.06,
      headX: 0.4,
      headY: Math.sin(t * 0.7) * 0.09,
      armLX: -0.85,
      armRX: -0.85 - Math.max(0, Math.sin(t * 1.25)) * 0.22,
      elbowL: -0.55,
      elbowR: -0.6,
      legLX: -1.25,
      legRX: -1.25,
      kneeL: 0.6,
      kneeR: 0.6,
    },
  }),
  music: (t) => ({
    pose: {
      bodyY: -0.19,
      headX: 0.3,
      headZ: Math.sin(t * 3.5) * 0.07,
      armLX: -0.85 - Math.max(0, Math.sin(t * 7)) * 0.5,
      armRX: -0.85 - Math.max(0, Math.sin(t * 7 + Math.PI)) * 0.5,
      elbowL: -0.25,
      elbowR: -0.25,
      legLX: -0.9,
      legRX: -0.9,
      kneeL: 1.3,
      kneeR: 1.3,
    },
  }),
  hug: (t) => ({
    pose: {
      headZ: Math.sin(t * 2.4) * 0.1,
      bodyZ: Math.sin(t * 2.4) * 0.05,
      bodyY: -0.08,
      armLX: -1.15,
      armRX: -1.15,
      armLZ: -0.25,
      armRZ: 0.25,
      elbowL: -0.7,
      elbowR: -0.7,
      headX: 0.13,
      legLX: -0.15,
      legRX: -0.15,
      kneeL: 0.3,
      kneeR: 0.3,
    },
  }),
  ball: (t) => ({
    pose: {
      bodyY: -0.08 + Math.sin(t * 3) * 0.035,
      bodyX: 0.12,
      headX: 0.3 + Math.sin(t * 3) * 0.14,
      armRX: -0.7 - Math.sin(t * 3) * 0.65,
      armLX: -0.3,
      elbowR: -0.2,
      legLX: -0.12,
      legRX: -0.12,
      kneeL: 0.25,
      kneeR: 0.25,
    },
  }),
  ride: (t, p) => {
    const mount = ease(p / 0.15) * (1 - ease((p - 0.85) / 0.15));
    return {
      pose: {
        bodyY: 0.23 * mount,
        bodyX: Math.sin(t * 2.8) * 0.13,
        headZ: Math.sin(t * 1.4) * 0.04,
        armLX: -0.9,
        armRX: -0.9,
        elbowL: -0.25,
        elbowR: -0.25,
        legLX: -1.05,
        legRX: -1.05,
        kneeL: 1.25,
        kneeR: 1.25,
      },
      offset: [0.78 * mount, 0, -0.11 * mount],
      facing: Math.PI,
    };
  },
  climb: (t, p) => {
    if (p < 0.36) {
      const k = ease(p / 0.36);
      return {
        offset: [0, 0.9 * k, -0.87 * k],
        facing: Math.PI,
        pose: {
          bodyX: 0.13,
          armLX: -2 + Math.sin(t * 6) * 0.35,
          armRX: -2 - Math.sin(t * 6) * 0.35,
          legLX: -0.4 + Math.sin(t * 6) * 0.4,
          legRX: -0.4 - Math.sin(t * 6) * 0.4,
          kneeL: 0.65,
          kneeR: 0.65,
          headX: -0.15,
        },
      };
    }
    if (p < 0.53) {
      const k = ease((p - 0.36) / 0.17);
      return {
        offset: [1.03 * k, 0.9, -0.87],
        facing: Math.PI / 2,
        pose: {
          armLX: Math.sin(t * 7) * 0.25,
          armRX: -Math.sin(t * 7) * 0.25,
          legLX: -Math.sin(t * 7) * 0.3,
          legRX: Math.sin(t * 7) * 0.3,
        },
      };
    }
    if (p < 0.82) {
      const k = ease((p - 0.53) / 0.29);
      return {
        offset: [1.03, 0.9 * (1 - k), -0.87 + 1.58 * k],
        facing: 0,
        pose: {
          bodyY: -0.22,
          bodyX: -0.12,
          legLX: -1.3,
          legRX: -1.3,
          armLX: -0.4,
          armRX: -0.4,
          armLZ: 0.5,
          armRZ: -0.5,
          headZ: Math.sin(t * 5) * 0.05,
        },
      };
    }
    return {
      offset: [1.03, 0, 0.71],
      facing: 0,
      pose: { armRX: -2.5, elbowR: Math.sin(t * 8) * 0.3, headZ: 0.1 },
    };
  },
};
export function walkPose(time: number, speed: number): Partial<Pose> {
  const phase = time * 8.5,
    s = Math.sin(phase);
  return {
    bodyY: Math.abs(Math.sin(phase)) * 0.027,
    bodyZ: Math.sin(phase) * 0.035,
    headY: Math.sin(time * 1.2) * 0.06,
    armLX: s * 0.35 * speed,
    armRX: -s * 0.35 * speed,
    legLX: -s * 0.42 * speed,
    legRX: s * 0.42 * speed,
    kneeL: Math.max(0, s) * 0.38,
    kneeR: Math.max(0, -s) * 0.38,
  };
}
