import type * as THREE from 'three';
export type ActionKind = 'stack' | 'read' | 'music' | 'hug' | 'ball' | 'climb' | 'ride';
export interface ToyDefinition {
  id: string;
  name: string;
  subtitle: string;
  action: ActionKind;
  color: string;
  icon: string;
  position: [number, number, number];
  approach: [number, number];
  facing: number;
  duration: number;
  obstacle?: { x: number; z: number; radius: number };
  build: () => ToyModel;
}
export interface ToyModel {
  root: THREE.Group;
  animate?: (time: number, active: boolean, progress: number) => void;
  reset?: () => void;
}
export interface Toy extends ToyDefinition, ToyModel {}
