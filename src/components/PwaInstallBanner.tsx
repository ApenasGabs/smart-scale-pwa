import React, { useState, useEffect } from 'react';
import { BluetoothScaleService } from '../services/bluetooth';
import { Download, Share, Smartphone, X, Info } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallBanner: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const isIOS = BluetoothScaleService.isIOS();
  const isBTSupported = BluetoothScaleService.isSupported();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (isDismissed) return null;

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // Banner para iOS sem Web Bluetooth nativo
  if (isIOS && !isBTSupported) {
    return (
      <div className="p-3.5 mb-4 bg-sky-950/40 border border-sky-800/60 rounded-2xl flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div className="flex-1 text-xs text-slate-300">
          <p className="font-semibold text-sky-300 mb-0.5">Dica para iPhone (iOS):</p>
          <p>
            O Safari da Apple restringe a Web Bluetooth API. Para conectar à sua balança diretamente no iPhone, abra este endereço no navegador gratuito <strong>Bluefy</strong> (App Store) ou adicione este app à Tela de Início via botão <Share className="w-3.5 h-3.5 inline mx-0.5 text-sky-400" /> <em>Compartilhar</em>.
          </p>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-slate-400 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Banner padrão para instalação PWA
  if (installPrompt) {
    return (
      <div className="p-3.5 mb-4 bg-brand-950/40 border border-brand-800/60 rounded-2xl flex items-center justify-between gap-3 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-500/10 text-brand-400 rounded-xl">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Instalar SmartScale PWA</h4>
            <p className="text-[11px] text-slate-400">Tenha acesso rápido e 100% offline direto da sua tela inicial</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" /> Instalar
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};
