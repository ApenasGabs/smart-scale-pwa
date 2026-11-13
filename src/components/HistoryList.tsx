import React from 'react';
import { MeasurementRecord } from '../types';
import { StorageService } from '../services/storage';
import { Trash2, Calendar, FileSpreadsheet, Database } from 'lucide-react';

interface HistoryListProps {
  records: MeasurementRecord[];
  onDelete: (id: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ records, onDelete }) => {
  const handleExportCSV = () => {
    const csv = StorageService.exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-scale-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const json = StorageService.exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-scale-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white">Histórico de Pesagens</h3>
          <p className="text-xs text-slate-400">{records.length} medições salvas localmente</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={records.length === 0}
            title="Exportar CSV (compatível com openScale)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Exportar CSV
          </button>

          <button
            onClick={handleExportJSON}
            disabled={records.length === 0}
            title="Backup JSON completo"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-brand-400" /> JSON
          </button>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="p-8 text-center bg-slate-800/30 border border-slate-800 rounded-2xl text-slate-500">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-600" />
          <p className="text-sm">Nenhum registro no histórico.</p>
          <p className="text-xs text-slate-400 mt-1">As pesagens estabilizadas serão salvas aqui automaticamente.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {records.map((r) => (
            <div
              key={r.id}
              className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex items-center justify-between hover:border-slate-600 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center">
                  <span className="text-sm font-bold text-white font-mono leading-none">
                    {r.metrics.weightKg.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-brand-400 font-medium">kg</span>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    {formatDate(r.timestamp)}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                    <span>Gordura: <strong className="text-slate-200">{r.metrics.bodyFatPercentage.value}%</strong></span>
                    <span>•</span>
                    <span>Músculo: <strong className="text-slate-200">{r.metrics.muscleMassKg.value}kg</strong></span>
                    <span>•</span>
                    <span>IMC: <strong className="text-slate-200">{r.metrics.bmi.value}</strong></span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onDelete(r.id)}
                title="Excluir medição"
                className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
