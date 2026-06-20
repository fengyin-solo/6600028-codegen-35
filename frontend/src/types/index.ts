export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  density: number;
  pressure: number;
  fx: number;
  fy: number;
}

export interface SimParams {
  gravity: number;
  viscosity: number;
  restDensity: number;
  gasConstant: number;
  smoothingRadius: number;
  particleMass: number;
  dt: number;
  damping: number;
  boundaryStiffness: number;
}

export interface Preset {
  name: string;
  label: string;
  description: string;
  params: Partial<SimParams>;
  particleCount: number;
  initialConfig: 'dam' | 'drop' | 'fountain' | 'wave';
}

export interface TargetZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  targetCount: number;
  color: string;
}

export interface ChallengeLevel {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  presetName: string;
  targetZones: TargetZone[];
  timeLimit: number;
  successThreshold: number;
}

export interface ZoneStats {
  zoneId: string;
  currentCount: number;
  percentage: number;
  completed: boolean;
}

export interface ChallengeResult {
  success: boolean;
  totalParticles: number;
  collectedParticles: number;
  overallPercentage: number;
  timeUsed: number;
  zoneResults: ZoneStats[];
}

export type ChallengeStatus = 'idle' | 'ready' | 'running' | 'paused' | 'finished';
