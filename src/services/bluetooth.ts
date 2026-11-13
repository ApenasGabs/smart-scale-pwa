import { BluetoothReading, BluetoothStatus } from '../types';
import { decodeScalePacket } from './decoder';

export class BluetoothScaleService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private status: BluetoothStatus = 'disconnected';
  private onStatusChangeCallback: ((status: BluetoothStatus) => void) | null = null;
  private onReadingCallback: ((reading: BluetoothReading) => void) | null = null;
  private simulationInterval: number | null = null;

  public static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator && !!navigator.bluetooth;
  }

  public static isIOS(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  public onStatusChange(callback: (status: BluetoothStatus) => void): void {
    this.onStatusChangeCallback = callback;
  }

  public onReading(callback: (reading: BluetoothReading) => void): void {
    this.onReadingCallback = callback;
  }

  private setStatus(newStatus: BluetoothStatus): void {
    this.status = newStatus;
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(newStatus);
    }
  }

  public getStatus(): BluetoothStatus {
    return this.status;
  }

  public async connect(): Promise<void> {
    if (!BluetoothScaleService.isSupported()) {
      this.setStatus('unsupported');
      throw new Error('Web Bluetooth não é suportado neste navegador. Se estiver no iOS, utilize o app Bluefy.');
    }

    try {
      this.setStatus('scanning');

      // Filtros comuns de balanças OKOK / Chipsea e perfis padrão BLE
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'OK' },
          { namePrefix: 'Chip' },
          { namePrefix: 'Yoda' },
          { namePrefix: 'Scale' },
          { namePrefix: 'BLE' },
          { namePrefix: 'SWAN' },
          { namePrefix: 'Senssun' },
          { namePrefix: 'electronic' }
        ],
        optionalServices: [
          0xFFF0,
          0xFFE0,
          '0000fff0-0000-1000-8000-00805f9b34fb',
          0x181D, // Weight Scale Service standard
          0x181B  // Body Composition Service standard
        ]
      });

      this.device = device;
      this.device.addEventListener('gattserverdisconnected', () => {
        this.setStatus('disconnected');
        this.device = null;
        this.server = null;
        this.characteristic = null;
      });

      this.setStatus('connecting');
      const server = await device.gatt?.connect();
      if (!server) throw new Error('Não foi possível conectar ao servidor GATT da balança.');
      this.server = server;

      // Descobrir serviço proprietário Chipsea (0xFFF0) ou padrão (0x181D)
      let primaryService: BluetoothRemoteGATTService | null = null;
      try {
        primaryService = await server.getPrimaryService(0xFFF0);
      } catch {
        try {
          primaryService = await server.getPrimaryService(0x181D);
        } catch {
          // Tentar obter qualquer serviço disponível
          const services = await server.getPrimaryServices();
          if (services.length > 0) primaryService = services[0];
        }
      }

      if (!primaryService) {
        throw new Error('Serviço de medição não encontrado na balança.');
      }

      // Descobrir característica de notificação (geralmente 0xFFF1, 0xFFF4 ou 0x2A9D)
      const characteristics = await primaryService.getCharacteristics();
      const notifyChar = characteristics.find(c => c.properties.notify || c.properties.indicate) || characteristics[0];

      if (!notifyChar) {
        throw new Error('Nenhuma característica de medição com notificações encontrada.');
      }

      this.characteristic = notifyChar;
      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', (e: Event) => {
        const target = e.target as unknown as { value: DataView };
        if (target && target.value) {
          this.parseScaleData(target.value);
        }
      });

      this.setStatus('connected');
    } catch (err: unknown) {
      this.setStatus('error');
      throw err;
    }
  }

  public disconnect(): void {
    this.stopSimulation();
    if (this.server && this.server.connected) {
      this.server.disconnect();
    } else if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.server = null;
    this.characteristic = null;
    this.setStatus('disconnected');
  }

  private parseScaleData(dataView: DataView): void {
    if (dataView.byteLength < 4) return;

    const bytes: number[] = [];
    for (let i = 0; i < dataView.byteLength; i++) {
      bytes.push(dataView.getUint8(i));
    }

    const reading = decodeScalePacket(bytes);
    if (reading.weightKg > 0) {
      this.setStatus(reading.isStabilized ? 'stabilized' : 'measuring');
      if (this.onReadingCallback) {
        this.onReadingCallback(reading);
      }
    }
  }

  /**
   * Simulador de Medição para testes em desktop ou navegadores sem balança física
   */
  public startSimulation(targetWeight = 72.4): void {
    this.stopSimulation();
    this.setStatus('measuring');

    let current = Number((targetWeight - 1.5).toFixed(1));
    let steps = 0;

    this.simulationInterval = window.setInterval(() => {
      steps++;
      // Variação de subida de peso
      const jitter = (Math.random() * 0.4) - 0.15;
      current = Number((current + jitter).toFixed(1));

      if (steps < 8) {
        // Medindo
        if (this.onReadingCallback) {
          this.onReadingCallback({
            weightKg: Math.max(20, current),
            isStabilized: false
          });
        }
      } else {
        // Estabilizado!
        this.stopSimulation();
        this.setStatus('stabilized');
        if (this.onReadingCallback) {
          this.onReadingCallback({
            weightKg: targetWeight,
            impedanceOhms: 512, // Resistência humana típica em ohms
            isStabilized: true,
            rawBytes: 'ca 10 02 02 d4 02 00 96'
          });
        }
      }
    }, 400);
  }

  public stopSimulation(): void {
    if (this.simulationInterval !== null) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }
}

export const scaleService = new BluetoothScaleService();
