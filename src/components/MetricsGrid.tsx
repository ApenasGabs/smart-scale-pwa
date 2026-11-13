import React from 'react';
import { BodyMetrics, HealthRating } from '../types';
import { 
  Activity, 
  Flame, 
  Droplets, 
  Dumbbell, 
  Heart, 
  Zap, 
  Clock, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface MetricsGridProps {
  metrics: BodyMetrics | null;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="p-8 text-center text-slate-500 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
        <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-600" />
        <p className="text-sm font-medium">Nenhuma pesagem ativa no momento.</p>
        <p className="text-xs text-slate-400 mt-1">Conecte sua balança ou clique em "Simular" para calcular sua composição corporal.</p>
      </div>
    );
  }

  const getRatingBadge = (rating: HealthRating, label: string) => {
    switch (rating) {
      case 'healthy':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">{label}</span>;
      case 'moderate':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">{label}</span>;
      case 'high':
      case 'very_high':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md">{label}</span>;
      case 'low':
      default:
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-md">{label}</span>;
    }
  };

  const cards = [
    {
      id: 'fat',
      icon: <Flame className="w-4 h-4 text-amber-400" />,
      label: 'Gordura Corporal',
      value: `${metrics.bodyFatPercentage.value}%`,
      subtitle: `${metrics.fatMassKg.value} kg de massa gorda`,
      rating: metrics.bodyFatPercentage.rating,
      ratingLabel: metrics.bodyFatPercentage.ratingLabel,
      min: metrics.bodyFatPercentage.minHealthy,
      max: metrics.bodyFatPercentage.maxHealthy,
    },
    {
      id: 'muscle',
      icon: <Dumbbell className="w-4 h-4 text-emerald-400" />,
      label: 'Massa Muscular',
      value: `${metrics.muscleMassKg.value} kg`,
      subtitle: `Massa magra total: ${metrics.leanBodyMassKg.value} kg`,
      rating: metrics.muscleMassKg.rating,
      ratingLabel: metrics.muscleMassKg.ratingLabel,
    },
    {
      id: 'water',
      icon: <Droplets className="w-4 h-4 text-sky-400" />,
      label: 'Água Corporal',
      value: `${metrics.waterPercentage.value}%`,
      subtitle: `${metrics.waterLiters.value} Litros de água`,
      rating: metrics.waterPercentage.rating,
      ratingLabel: metrics.waterPercentage.ratingLabel,
      min: metrics.waterPercentage.minHealthy,
      max: metrics.waterPercentage.maxHealthy,
    },
    {
      id: 'visceral',
      icon: <Heart className="w-4 h-4 text-rose-400" />,
      label: 'Gordura Visceral',
      value: `${metrics.visceralFat.value}`,
      subtitle: 'Índice de 1 a 50',
      rating: metrics.visceralFat.rating,
      ratingLabel: metrics.visceralFat.ratingLabel,
      min: 1,
      max: 9,
    },
    {
      id: 'bmi',
      icon: <Activity className="w-4 h-4 text-teal-400" />,
      label: 'IMC',
      value: `${metrics.bmi.value}`,
      subtitle: 'kg/m²',
      rating: metrics.bmi.rating,
      ratingLabel: metrics.bmi.ratingLabel,
      min: 18.5,
      max: 24.9,
    },
    {
      id: 'bmr',
      icon: <Zap className="w-4 h-4 text-indigo-400" />,
      label: 'Metabolismo Basal',
      value: `${metrics.bmrKcal.value}`,
      subtitle: 'kcal / dia',
      rating: metrics.bmrKcal.rating,
      ratingLabel: metrics.bmrKcal.ratingLabel,
    },
    {
      id: 'bone',
      icon: <ShieldCheck className="w-4 h-4 text-slate-300" />,
      label: 'Massa Óssea',
      value: `${metrics.boneMassKg.value} kg`,
      subtitle: 'Estrutura esquelética',
      rating: metrics.boneMassKg.rating,
      ratingLabel: metrics.boneMassKg.ratingLabel,
    },
    {
      id: 'metabolic_age',
      icon: <Clock className="w-4 h-4 text-purple-400" />,
      label: 'Idade Metabólica',
      value: `${metrics.metabolicAge.value} anos`,
      subtitle: metrics.metabolicAge.ratingLabel,
      rating: metrics.metabolicAge.rating,
      ratingLabel: metrics.metabolicAge.ratingLabel,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
      {cards.map((c) => (
        <div 
          key={c.id}
          className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex flex-col justify-between hover:border-slate-600 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-slate-700/50 rounded-lg">
              {c.icon}
            </div>
            {getRatingBadge(c.rating, c.ratingLabel)}
          </div>

          <div>
            <span className="text-[11px] font-medium text-slate-400">{c.label}</span>
            <div className="text-xl font-bold text-white tracking-tight mt-0.5">
              {c.value}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">
              {c.subtitle}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
