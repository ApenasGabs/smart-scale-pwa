# 📱 SmartScale PWA - Bioimpedância & Web Bluetooth

[![Release & Deploy](https://github.com/ApenasGabs/smart-scale-pwa/actions/workflows/release.yml/badge.svg)](https://github.com/ApenasGabs/smart-scale-pwa/actions/workflows/release.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline--First-0d9488.svg)](https://scale.apenasgabs.dev)
[![Production](https://img.shields.io/badge/Production-scale.apenasgabs.dev-success.svg)](https://scale.apenasgabs.dev)

> **Progressive Web App (PWA)** de código aberto para leitura e sincronização de balanças corporais inteligentes Bluetooth (protocolos Chipsea / OKOK e Bluetooth SIG padrão), com cálculo científico de bioimpedância, 100% offline e privacidade total.

---

## 🌐 Acesso em Produção
* **Domínio Oficial:** **[https://scale.apenasgabs.dev](https://scale.apenasgabs.dev)**
* **Alias Cloudflare:** [https://smart-scale-pwa.pages.dev](https://smart-scale-pwa.pages.dev)
* **Fork de Referência Upstream:** [ApenasGabs/openScale](https://github.com/ApenasGabs/openScale)

---

## 🚀 Funcionalidades
- **Conexão Web Bluetooth Nativa:** Conecta diretamente à balança física via Bluetooth Low Energy (BLE) sem intermediários.
- **Protocolo Chipsea / OKOK:** Suporte aos serviços proprietários `0xFFF0` e decodificação dos pacotes hexadecimais `0xCA`.
- **Cálculo de Bioimpedância (openScale):** Fórmulas de Kushner (resistência elétrica em $\Omega$), Deurenberg e Mifflin-St Jeor para cálculo de % de gordura, massa muscular, água corporal, gordura visceral, massa óssea, TMB e idade metabólica.
- **PWA Offline-First:** Funciona 100% desconectado da internet com cache automático via Workbox (`dist/sw.js`).
- **Múltiplos Perfis:** Gerencie perfis biométricos para toda a família no mesmo dispositivo.
- **Exportação de Dados:** Exportação em formato CSV compatível com o **openScale** e backup JSON.
- **Simulador Integrado:** Permite testar o app e a visualização de métricas mesmo sem a balança por perto.

---

## 🔄 Pipeline de CI/CD & Release Automática
O repositório utiliza **GitHub Actions** (`.github/workflows/release.yml`) para automação contínua:
1. **Pull Requests:** Executa testes unitários com Vitest (`npm test`) e validação de compilação TypeScript (`npm run build`).
2. **Merge na branch `main`:**
   * Executa a suíte completa de testes e validação.
   * Analisa os commits convencionais (`feat:`, `fix:`, `perf:`).
   * Calcula o bump de versão semântico (`patch`, `minor`, `major`).
   * Gera o changelog categorizado automaticamente (`.github/release.yml`).
   * Publica a tag Git (`vX.Y.Z`) e a **GitHub Release** oficial.
   * Realiza o deploy contínuo na CDN da Cloudflare Pages.

---

## 💻 Desenvolvimento Local
```bash
# Clonar o repositório
git clone https://github.com/ApenasGabs/smart-scale-pwa.git
cd smart-scale-pwa

# Instalar dependências
npm install --include=dev

# Executar suíte de testes
npm test

# Iniciar servidor de desenvolvimento local
npm run dev

# Compilar para produção
npm run build
```

---

## 📄 Licença
Distribuído sob a licença **GNU General Public License v3.0 (GPLv3)**. Veja `LICENSE` para mais detalhes.
