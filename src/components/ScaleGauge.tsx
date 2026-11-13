import React from 'react';
import { BluetoothStatus } from '../types';
import { Bluetooth, CheckCircle2, Loader2, Target, AlertTriangle } from 'lucide-react';

interface ScaleGaugeProps {
  weight: number;
  isStabilized: boolean;
  status: BluetoothStatus;
  targetWeight?: number;
  onConnect: () => void;
  onDisconnect: () => void;
  onSimulate: () => void;
}

export const ScaleGauge: React.FC<ScaleGaugeProps> = ({
  weight,
  isStabilized,
  status,
  targetWeight,
  onConnect,
  onDisconnect,
  onSimulate
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'scanning':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando balança...
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Conectando GATT...
          </span>
        );
      case 'measuring':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-teal-500/20 text-teal-300 border border-teal-500/40 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" /> Medindo... Fique imóvel
          </span>
        );
      case 'stabilized':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Peso Estabilizado
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Falha na conexão
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-slate-500" /> Balança desconectada
          </span>
        );
    }
  };

  const deltaTarget = targetWeight ? Number((weight - targetWeight).toFixed(1)) : null;

  return (
    <div className="relative flex flex-col items-center justify-center p-6 bg-slate-800/80 backdrop-blur-sm border border-slate-700/80 rounded-3xl shadow-2xl">
      {/* Top Status */}
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {getStatusBadge()}
        </div>

        <div className="flex items-center gap-2">
          {status === 'disconnected' || status === 'error' ? (
            <button
              onClick={onConnect}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 active:scale-95 text-slate-950 font-semibold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all"
            >
              <Bluetooth className="w-4 h-4" /> Conectar Balança
            </button>
          ) : (
            <button
              onClick={onDisconnect}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-xl transition-all"
            >
              Desconectar
            </button>
          )}

          <button
            onClick={onSimulate}
            title="Simular pesagem sem balança física"
            className="px-2.5 py-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-600/50 hover:border-slate-500 transition-all"
          >
            Simular
          </button>
        </div>
      </div>

      {/* Main Digital Display */}
      <div className="relative my-4 flex flex-col items-center justify-center w-64 h-64 rounded-full border-4 border-slate-700/60 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 shadow-inner">
        {/* Animated Ring when Measuring */}
        {status === 'measuring' && (
          <div className="absolute inset-0 rounded-full border-4 border-brand-400 animate-ping opacity-25" />
        )}
        
        {/* Glow */}
        <div className={`absolute inset-4 rounded-full blur-2xl transition-all duration-700 ${
          isStabilized ? 'bg-emerald-500/15' : status === 'measuring' ? 'bg-brand-500/20' : 'bg-transparent'
        }`} />

        <div className="z-10 flex flex-col items-center">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">
            Massa Corporal
          </span>
          <div className="flex items-baseline">
            <span className="text-5xl font-black tracking-tight text-white font-mono">
              {weight > 0 ? weight.toFixed(1) : '--.-'}
            </span>
            <span className="text-xl font-bold text-brand-400 ml-1.5">kg</span>
          </div>

          {deltaTarget !== null && weight > 0 && (
            <div className="flex items-center gap-1 mt-2 text-xs font-medium text-slate-400">
              <Target className="w-3.5 h-3.5 text-brand-400" />
              <span>
                {deltaTarget > 0 ? `+${deltaTarget}` : deltaTarget} kg da meta ({targetWeight} kg)
              </span>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center mt-2 max-w-xs">
        Suba descalço na balança para fechar o circuito elétrico dos sensores metálicos de bioimpedância.
      </p>
    </div>
  );
};
