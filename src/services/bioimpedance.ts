import { UserProfile, BodyMetrics, MetricDetail, HealthRating } from '../types';

export const calculateAge = (birthDateStr: string): number => {
  const birth = new Date(birthDateStr);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(10, Math.min(100, age));
};

export const calculateMetrics = (
  weightKg: number,
  impedanceOhms: number | undefined,
  user: UserProfile
): BodyMetrics => {
  const age = calculateAge(user.birthDate);
  const heightM = user.heightCm / 100;
  const bmiVal = Number((weightKg / (heightM * heightM)).toFixed(1));

  // 1. BMI Rating
  let bmiRating: HealthRating = 'healthy';
  let bmiLabel = 'Normal / Saudável';
  if (bmiVal < 18.5) {
    bmiRating = 'low';
    bmiLabel = 'Abaixo do Peso';
  } else if (bmiVal >= 25 && bmiVal < 30) {
    bmiRating = 'moderate';
    bmiLabel = 'Sobrepeso';
  } else if (bmiVal >= 30) {
    bmiRating = 'high';
    bmiLabel = 'Obesidade';
  }

  const bmiMetric: MetricDetail = {
    value: bmiVal,
    unit: 'kg/m²',
    label: 'IMC (Índice de Massa Corporal)',
    rating: bmiRating,
    ratingLabel: bmiLabel,
    minHealthy: 18.5,
    maxHealthy: 24.9
  };

  // 2. Gordura Corporal e Massa Magra
  let fatPercentage = 0;
  let leanBodyMassKg = 0;

  if (impedanceOhms && impedanceOhms > 100 && impedanceOhms < 1500) {
    // Equação de bioimpedância de Kushner baseada na resistência corporal (Ω)
    const heightSq = user.heightCm * user.heightCm;
    const genderConstant = user.gender === 'male' ? 5.2 : 0;
    leanBodyMassKg = 0.734 * (heightSq / impedanceOhms) + 0.116 * weightKg + genderConstant;

    // Travas fisiológicas de segurança
    leanBodyMassKg = Math.max(weightKg * 0.45, Math.min(weightKg * 0.95, leanBodyMassKg));
    const fatMassKg = weightKg - leanBodyMassKg;
    fatPercentage = Number(((fatMassKg / weightKg) * 100).toFixed(1));
  } else {
    // Fallback: Fórmula empírica de Deurenberg para adultos
    const genderFactor = user.gender === 'male' ? 1 : 0;
    fatPercentage = Number((1.20 * bmiVal + 0.23 * age - 10.8 * genderFactor - 5.4).toFixed(1));
    fatPercentage = Math.max(5, Math.min(60, fatPercentage));
    const fatMass = weightKg * (fatPercentage / 100);
    leanBodyMassKg = weightKg - fatMass;
  }

  // Avaliação de Gordura
  let fatRating: HealthRating = 'healthy';
  let fatRatingLabel = 'Ideal';
  const minFat = user.gender === 'male' ? 10 : 18;
  const maxFat = user.gender === 'male' ? 20 : 28;

  if (fatPercentage < minFat) {
    fatRating = 'low';
    fatRatingLabel = 'Baixo';
  } else if (fatPercentage > maxFat && fatPercentage <= maxFat + 5) {
    fatRating = 'moderate';
    fatRatingLabel = 'Moderadamente Alto';
  } else if (fatPercentage > maxFat + 5) {
    fatRating = 'high';
    fatRatingLabel = 'Elevado';
  }

  const fatMassKgVal = Number((weightKg * (fatPercentage / 100)).toFixed(1));
  const leanMassKgVal = Number(leanBodyMassKg.toFixed(1));

  // 3. Massa Óssea estimada
  const boneFactor = user.gender === 'male' ? 0.045 : 0.040;
  const boneMassKgVal = Number((weightKg * boneFactor).toFixed(1));

  // 4. Massa Muscular (Massa Magra menos Massa Óssea)
  const muscleMassKgVal = Number(Math.max(10, leanMassKgVal - boneMassKgVal).toFixed(1));

  // 5. Água Corporal (Água compõe ~73.2% da massa livre de gordura)
  const waterLitersVal = Number((leanMassKgVal * 0.732).toFixed(1));
  const waterPercentageVal = Number(((waterLitersVal / weightKg) * 100).toFixed(1));

  let waterRating: HealthRating = 'healthy';
  let waterLabel = 'Hidratação Normal';
  const minWater = user.gender === 'male' ? 55 : 45;
  const maxWater = user.gender === 'male' ? 65 : 60;
  if (waterPercentageVal < minWater) {
    waterRating = 'low';
    waterLabel = 'Baixa Hidratação';
  } else if (waterPercentageVal > maxWater) {
    waterRating = 'high';
    waterLabel = 'Alta Hidratação';
  }

  // 6. Gordura Visceral (Escala 1 a 50)
  const baseVisceral = Math.round(
    (bmiVal - 18) * 0.5 + 
    (fatPercentage - (user.gender === 'male' ? 15 : 22)) * 0.25 + 
    age * 0.08
  );
  const visceralVal = Math.max(1, Math.min(30, baseVisceral));
  let visceralRating: HealthRating = 'healthy';
  let visceralLabel = 'Excelente (1-9)';
  if (visceralVal >= 10 && visceralVal <= 14) {
    visceralRating = 'moderate';
    visceralLabel = 'Atenção (10-14)';
  } else if (visceralVal >= 15) {
    visceralRating = 'high';
    visceralLabel = 'Risco Cardiovascular (15+)';
  }

  // 7. TMB (Taxa Metabólica Basal) - Fórmula Mifflin-St Jeor
  const bmrBase = 10 * weightKg + 6.25 * user.heightCm - 5 * age + (user.gender === 'male' ? 5 : -161);
  const bmrVal = Math.round(bmrBase);

  // 8. Idade Metabólica
  const idealFat = user.gender === 'male' ? 15 : 23;
  const ageDelta = Math.round((fatPercentage - idealFat) * 0.5);
  const metabolicAgeVal = Math.max(18, Math.min(90, age + ageDelta));

  // 9. Proteína %
  const proteinVal = Number(Math.max(10, Math.min(25, 100 - (fatPercentage + waterPercentageVal + 4.5))).toFixed(1));

  return {
    weightKg: Number(weightKg.toFixed(1)),
    impedanceOhms,
    bmi: bmiMetric,
    bodyFatPercentage: {
      value: fatPercentage,
      unit: '%',
      label: 'Gordura Corporal',
      rating: fatRating,
      ratingLabel: fatRatingLabel,
      minHealthy: minFat,
      maxHealthy: maxFat
    },
    fatMassKg: {
      value: fatMassKgVal,
      unit: 'kg',
      label: 'Massa Gorda',
      rating: fatRating,
      ratingLabel: fatRatingLabel
    },
    leanBodyMassKg: {
      value: leanMassKgVal,
      unit: 'kg',
      label: 'Massa Livre de Gordura',
      rating: 'healthy',
      ratingLabel: 'Saudável'
    },
    muscleMassKg: {
      value: muscleMassKgVal,
      unit: 'kg',
      label: 'Massa Muscular',
      rating: 'healthy',
      ratingLabel: 'Saudável'
    },
    waterPercentage: {
      value: waterPercentageVal,
      unit: '%',
      label: 'Água Corporal',
      rating: waterRating,
      ratingLabel: waterLabel,
      minHealthy: minWater,
      maxHealthy: maxWater
    },
    waterLiters: {
      value: waterLitersVal,
      unit: 'L',
      label: 'Volume de Água',
      rating: waterRating,
      ratingLabel: waterLabel
    },
    visceralFat: {
      value: visceralVal,
      unit: 'pts',
      label: 'Gordura Visceral',
      rating: visceralRating,
      ratingLabel: visceralLabel,
      minHealthy: 1,
      maxHealthy: 9
    },
    boneMassKg: {
      value: boneMassKgVal,
      unit: 'kg',
      label: 'Massa Óssea',
      rating: 'healthy',
      ratingLabel: 'Normal'
    },
    bmrKcal: {
      value: bmrVal,
      unit: 'kcal',
      label: 'Metabolismo Basal (TMB)',
      rating: 'healthy',
      ratingLabel: 'Estimativa'
    },
    metabolicAge: {
      value: metabolicAgeVal,
      unit: 'anos',
      label: 'Idade Metabólica',
      rating: metabolicAgeVal <= age ? 'healthy' : 'moderate',
      ratingLabel: metabolicAgeVal <= age ? 'Mais jovem ou igual' : 'Acima da idade real'
    },
    proteinPercentage: {
      value: proteinVal,
      unit: '%',
      label: 'Taxa de Proteína',
      rating: proteinVal >= 16 ? 'healthy' : 'moderate',
      ratingLabel: proteinVal >= 16 ? 'Adequada' : 'Baixa'
    }
  };
}
