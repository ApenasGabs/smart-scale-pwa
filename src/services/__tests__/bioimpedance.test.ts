import { describe, it, expect } from 'vitest';
import { calculateAge, calculateMetrics } from '../bioimpedance';
import { UserProfile } from '../../types';

describe('Motor de Bioimpedância', () => {
  const mockUser: UserProfile = {
    id: 'test-user',
    name: 'Teste Silva',
    gender: 'male',
    heightCm: 180,
    birthDate: '1990-01-01',
    activityLevel: 'moderate',
    targetWeightKg: 75.0,
    createdAt: new Date().toISOString()
  };

  it('deve calcular a idade corretamente a partir da data de nascimento', () => {
    const age = calculateAge('1990-01-01');
    expect(age).toBeGreaterThanOrEqual(30);
    expect(age).toBeLessThanOrEqual(50);
  });

  it('deve calcular IMC e métricas sem impedância utilizando fórmula de Deurenberg', () => {
    const metrics = calculateMetrics(80.0, undefined, mockUser);
    
    // IMC esperado para 80kg e 1.80m = 80 / (1.8^2) ≈ 24.7
    expect(metrics.bmi.value).toBe(24.7);
    expect(metrics.bmi.rating).toBe('healthy');
    expect(metrics.bodyFatPercentage.value).toBeGreaterThan(10);
    expect(metrics.bodyFatPercentage.value).toBeLessThan(30);
    expect(metrics.muscleMassKg.value).toBeGreaterThan(30);
    expect(metrics.waterPercentage.value).toBeGreaterThan(45);
  });

  it('deve calcular composição corporal com bioimpedância real em Ohms (Kushner)', () => {
    const metrics = calculateMetrics(75.0, 520, mockUser);
    
    expect(metrics.weightKg).toBe(75.0);
    expect(metrics.impedanceOhms).toBe(520);
    expect(metrics.bodyFatPercentage.value).toBeGreaterThan(5);
    expect(metrics.bodyFatPercentage.value).toBeLessThan(35);
    expect(metrics.leanBodyMassKg.value).toBeGreaterThan(45);
    expect(metrics.bmrKcal.value).toBeGreaterThan(1400);
    expect(metrics.visceralFat.value).toBeGreaterThanOrEqual(1);
  });

  it('deve respeitar as travas fisiológicas de segurança corporal', () => {
    // Teste com impedância extrema muito baixa
    const metrics = calculateMetrics(70.0, 110, mockUser);
    expect(metrics.bodyFatPercentage.value).toBeGreaterThanOrEqual(5);
    expect(metrics.bodyFatPercentage.value).toBeLessThanOrEqual(60);
  });
});
