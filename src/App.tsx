import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, BluetoothStatus, BluetoothReading, BodyMetrics, MeasurementRecord } from './types';
import { StorageService } from './services/storage';
import { calculateMetrics } from './services/bioimpedance';
import { scaleService } from './services/bluetooth';
import { ScaleGauge } from './components/ScaleGauge';
import { MetricsGrid } from './components/MetricsGrid';
import { HistoryList } from './components/HistoryList';
import { UserModal } from './components/UserModal';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { 
  Activity, 
  History, 
  Info, 
  User, 
  Sparkles, 
  ShieldCheck, 
  Radio
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'measure' | 'history' | 'about'>('measure');
  const [user, setUser] = useState<UserProfile>(StorageService.getActiveUser());
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [status, setStatus] = useState<BluetoothStatus>(scaleService.getStatus());
  const [reading, setReading] = useState<BluetoothReading>({ weightKg: 0, isStabilized: false });
  const [metrics, setMetrics] = useState<BodyMetrics | null>(null);
  const [records, setRecords] = useState<MeasurementRecord[]>(StorageService.getMeasurements(user.id));
  
  const lastSavedTimestampRef = useRef<number>(0);

  useEffect(() => {
    scaleService.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    scaleService.onReading((newReading) => {
      setReading(newReading);

      if (newReading.weightKg > 0) {
        const calculated = calculateMetrics(newReading.weightKg, newReading.impedanceOhms, user);
        setMetrics(calculated);

        // Se o peso estabilizou e não foi salvo nos últimos 5 segundos
        const now = Date.now();
        if (newReading.isStabilized && (now - lastSavedTimestampRef.current > 5000)) {
          lastSavedTimestampRef.current = now;
          const newRecord: MeasurementRecord = {
            id: `rec-${now}`,
            userId: user.id,
            timestamp: new Date().toISOString(),
            metrics: calculated,
            isStabilized: true
          };
          StorageService.saveMeasurement(newRecord);
          setRecords(StorageService.getMeasurements(user.id));
        }
      }
    });

    return () => {
      scaleService.stopSimulation();
    };
  }, [user]);

  const handleConnect = async () => {
    try {
      await scaleService.connect();
    } catch (err: unknown) {
      console.warn('Conexão Bluetooth cancelada ou com erro:', err);
    }
  };

  const handleDisconnect = () => {
    scaleService.disconnect();
  };

  const handleSimulate = () => {
    const target = user.targetWeightKg ? user.targetWeightKg + 0.8 : 73.2;
    scaleService.startSimulation(target);
  };

  const handleSaveUser = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    StorageService.saveUser(updatedUser);
    // Recalcular métricas se já houver leitura
    if (reading.weightKg > 0) {
      setMetrics(calculateMetrics(reading.weightKg, reading.impedanceOhms, updatedUser));
    }
  };

  const handleDeleteRecord = (id: string) => {
    StorageService.deleteMeasurement(id);
    setRecords(StorageService.getMeasurements(user.id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-brand-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-slate-950 shadow-md shadow-brand-500/20">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                SmartScale <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-brand-500/20 text-brand-400 border border-brand-500/30">PWA</span>
              </h1>
              <p className="text-[11px] text-slate-400">Bioimpedância & Web Bluetooth</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl border border-slate-700 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-brand-400" />
              <span>{user.name}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-3xl w-full mx-auto p-4 flex-1">
        <PwaInstallBanner />

        {/* Tab Navigation */}
        <div className="flex items-center p-1 bg-slate-900/90 border border-slate-800 rounded-2xl mb-5">
          <button
            onClick={() => setActiveTab('measure')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'measure'
                ? 'bg-brand-500 text-slate-950 shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" /> Medição
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'history'
                ? 'bg-brand-500 text-slate-950 shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" /> Histórico ({records.length})
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'about'
                ? 'bg-brand-500 text-slate-950 shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Info className="w-4 h-4" /> Sobre
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'measure' && (
          <div className="space-y-4 animate-fade-in">
            <ScaleGauge
              weight={reading.weightKg}
              isStabilized={reading.isStabilized}
              status={status}
              targetWeight={user.targetWeightKg}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onSimulate={handleSimulate}
            />

            <div className="pt-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-brand-400" /> Composição Corporal Completa
                </h3>
                {reading.impedanceOhms && (
                  <span className="text-[11px] font-mono text-slate-400">
                    Impedância: {reading.impedanceOhms} Ω
                  </span>
                )}
              </div>
              <MetricsGrid metrics={metrics} />
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-fade-in">
            <HistoryList records={records} onDelete={handleDeleteRecord} />
          </div>
        )}

        {activeTab === 'about' && (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-5 animate-fade-in text-sm text-slate-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-500/10 text-brand-400 rounded-2xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Privacidade & Código Aberto</h3>
                <p className="text-xs text-slate-400">Alternativa livre e sem rastreamento ao app OKOK</p>
              </div>
            </div>

            <div className="space-y-3 leading-relaxed text-xs">
              <p>
                O <strong>SmartScale PWA</strong> foi desenvolvido para conectar diretamente a balanças corporais inteligentes baseadas no protocolo <strong>Chipsea / OKOK</strong> através da <strong>Web Bluetooth API</strong>.
              </p>
              <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-1.5">
                <h4 className="font-semibold text-white text-xs">Diferenciais e Garantias:</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li><strong>Zero Anúncios:</strong> Sem telas de publicidade ou cadastros forçados.</li>
                  <li><strong>100% Offline:</strong> Todos os seus dados corporais permanecem salvos apenas no seu navegador.</li>
                  <li><strong>Algoritmos do openScale:</strong> Modelos matemáticos de Deurenberg, Kushner e Mifflin-St Jeor para cálculo preciso de gordura, água e massa magra.</li>
                  <li><strong>Exportação Livre:</strong> Exporte seu histórico em formato CSV compatível com o openScale a qualquer momento.</li>
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Licença GNU GPLv3</span>
              <a
                href="https://github.com/ApenasGabs/smart-scale-pwa"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-brand-400 hover:text-brand-300 font-semibold"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                Repositório no GitHub
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-800/60 mt-8">
        SmartScale PWA • Desenvolvido com autonomia pelo Kraken
      </footer>

      {/* User Modal */}
      <UserModal
        user={user}
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSave={handleSaveUser}
      />
    </div>
  );
};

export default App;
