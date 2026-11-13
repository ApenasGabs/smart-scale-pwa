import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Registrar Service Worker para PWA Offline-First
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Nova versão do SmartScale PWA disponível.');
  },
  onOfflineReady() {
    console.log('SmartScale PWA pronto para funcionamento offline.');
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
