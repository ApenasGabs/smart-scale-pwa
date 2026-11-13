export type Gender = 'male' | 'female';

export type ActivityLevel = 'sedentary' | 'moderate' | 'active' | 'athlete';

export interface UserProfile {
  id: string;
  name: string;
  gender: Gender;
  heightCm: number;
  birthDate: string; // YYYY-MM-DD
  activityLevel: ActivityLevel;
  targetWeightKg?: number;
  createdAt: string;
}

export type HealthRating = 'low' | 'healthy' | 'moderate' | 'high' | 'very_high';

export interface MetricDetail {
  value: number;
  unit: string;
  label: string;
  rating: HealthRating;
  ratingLabel: string;
  minHealthy?: number;
  maxHealthy?: number;
}

export interface BodyMetrics {
  weightKg: number;
  impedanceOhms?: number;
  bmi: MetricDetail;
  bodyFatPercentage: MetricDetail;
  fatMassKg: MetricDetail;
  leanBodyMassKg: MetricDetail;
  muscleMassKg: MetricDetail;
  waterPercentage: MetricDetail;
  waterLiters: MetricDetail;
  visceralFat: MetricDetail;
  boneMassKg: MetricDetail;
  bmrKcal: MetricDetail;
  metabolicAge: MetricDetail;
  proteinPercentage: MetricDetail;
}

export interface MeasurementRecord {
  id: string;
  userId: string;
  timestamp: string; // ISO string
  metrics: BodyMetrics;
  isStabilized: boolean;
  notes?: string;
}

export type BluetoothStatus = 
  | 'unsupported'
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'measuring'
  | 'stabilized'
  | 'error';

export interface BluetoothReading {
  weightKg: number;
  impedanceOhms?: number;
  isStabilized: boolean;
  rawBytes?: string;
  unit?: 'kg' | 'lbs';
}
