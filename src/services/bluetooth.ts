import { BluetoothReading, BluetoothStatus, UserProfile } from '../types';
import {
  decodeScalePacket,
  decodeOkOkAdvertisement,
  decodeChipseaGattFrame,
  buildChipseaUserSync,
  OKOK_MANUFACTURER_IDS
} from './decoder';

export type BluetoothConnectionMode = 'broadcast' | 'gatt' | 'simulation' | 'idle';

export class BluetoothScaleService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private status: BluetoothStatus = 'disconnected';
  private connectionMode: BluetoothConnectionMode = 'idle';
  private deviceName: string = '';
  private userProfile: UserProfile | null = null;
  private advertisementAbortController: AbortController | null = null;
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

  public setUserProfile(profile: UserProfile): void {
    this.userProfile = profile;
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

  public getCharacteristic(): BluetoothRemoteGATTCharacteristic | null {
    return this.characteristic;
  }

  public getConnectionMode(): BluetoothConnectionMode {
    return this.connectionMode;
  }

  public getDeviceName(): string {
    return this.deviceName;
  }

  public async connect(): Promise<void> {
    if (!BluetoothScaleService.isSupported()) {
      this.setStatus('unsupported');
      throw new Error('Web Bluetooth não é suportado neste navegador. Se estiver no iOS, utilize o app Bluefy.');
    }

    try {
      this.setStatus('scanning');

      const optionalServices = [
        0xFFF0,
        '0000fff0-0000-1000-8000-00805f9b34fb',
        0xFFE0,
        '0000ffe0-0000-1000-8000-00805f9b34fb',
        0x181D, // Weight Scale Service standard
        '0000181d-0000-1000-8000-00805f9b34fb',
        0x181B, // Body Composition Service standard
        '0000181b-0000-1000-8000-00805f9b34fb',
        0x180F, // Battery Level
        '0000180f-0000-1000-8000-00805f9b34fb',
        0x180A  // Device Information
      ];

      const optionalManufacturerData = [
        OKOK_MANUFACTURER_IDS.V20,
        OKOK_MANUFACTURER_IDS.V11,
        OKOK_MANUFACTURER_IDS.VF0,
        OKOK_MANUFACTURER_IDS.V26,
        OKOK_MANUFACTURER_IDS.V10,
        OKOK_MANUFACTURER_IDS.C0_LOW_BYTE
      ];

      // Busca universal com acceptAllDevices para não filtrar nomes OEM/nameless
      let device: BluetoothDevice;
      try {
        device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices,
          optionalManufacturerData
        });
      } catch (reqErr: unknown) {
        // Fallback para navegadores que não suportam optionalManufacturerData no requestDevice
        if (reqErr instanceof TypeError || (reqErr instanceof Error && reqErr.name === 'TypeError')) {
          device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices
          });
        } else {
          throw reqErr;
        }
      }

      this.device = device;
      this.deviceName = device.name || 'Balança BLE (OKOK)';

      this.device.addEventListener('gattserverdisconnected', () => {
        // Se a balança for broadcast-only, desconexão do GATT é esperada
        if (this.connectionMode === 'broadcast') {
          return;
        }
        this.setStatus('disconnected');
        this.server = null;
        this.characteristic = null;
        this.connectionMode = 'idle';
      });

      // 1. Tentar escuta de BLE Advertisements (Broadcast Mode)
      let watchingAdvertisements = false;
      const deviceWithAdv = device as BluetoothDevice & {
        watchAdvertisements?: (options?: { signal: AbortSignal }) => Promise<void>;
      };

      if (typeof deviceWithAdv.watchAdvertisements === 'function') {
        try {
          this.advertisementAbortController = new AbortController();
          await deviceWithAdv.watchAdvertisements({ signal: this.advertisementAbortController.signal });
          watchingAdvertisements = true;

          device.addEventListener('advertisementreceived', (event: Event) => {
            const advEvent = event as unknown as {
              manufacturerData?: Map<number, DataView>;
            };
            if (advEvent.manufacturerData) {
              advEvent.manufacturerData.forEach((dataView, companyId) => {
                const reading = decodeOkOkAdvertisement(companyId, dataView);
                if (reading && reading.weightKg > 0) {
                  this.connectionMode = 'broadcast';
                  this.setStatus(reading.isStabilized ? 'stabilized' : 'measuring');
                  if (this.onReadingCallback) {
                    this.onReadingCallback({
                      ...reading,
                      deviceName: this.deviceName,
                      protocol: 'broadcast-okok'
                    });
                  }
                }
              });
            }
          });
        } catch {
          watchingAdvertisements = false;
        }
      }

      // 2. Tentar conexão GATT ativa (Chipsea / Standard)
      this.setStatus('connecting');
      let gattSuccess = false;

      try {
        const server = await device.gatt?.connect();
        if (server && server.connected) {
          this.server = server;
          await this.setupGattServices(server);
          gattSuccess = true;
          this.connectionMode = 'gatt';
          this.setStatus('connected');
        }
      } catch {
        gattSuccess = false;
      }

      // Se o GATT falhou mas a escuta de anúncios está ativa, permanece aguardando a pesagem em modo broadcast
      if (!gattSuccess && watchingAdvertisements) {
        this.connectionMode = 'broadcast';
        this.setStatus('measuring');
        return;
      }

      if (!gattSuccess && !watchingAdvertisements) {
        throw new Error('Não foi possível conectar ao GATT da balança nem iniciar a escuta de broadcasts.');
      }
    } catch (err: unknown) {
      this.setStatus('error');
      throw err;
    }
  }

  private async setupGattServices(server: BluetoothRemoteGATTServer): Promise<void> {
    // 1. Tentar serviço proprietário Chipsea 0xFFF0
    let chipseaService: BluetoothRemoteGATTService | null = null;
    try {
      chipseaService = await server.getPrimaryService(0xFFF0);
    } catch {
      try {
        chipseaService = await server.getPrimaryService('0000fff0-0000-1000-8000-00805f9b34fb');
      } catch {
        chipseaService = null;
      }
    }

    if (chipseaService) {
      // Característica RX (0xFFF1) para receber medições
      let rxChar: BluetoothRemoteGATTCharacteristic | null = null;
      try {
        rxChar = await chipseaService.getCharacteristic(0xFFF1);
      } catch {
        rxChar = await chipseaService.getCharacteristic('0000fff1-0000-1000-8000-00805f9b34fb');
      }

      if (rxChar) {
        this.characteristic = rxChar;
        await rxChar.startNotifications();
        rxChar.addEventListener('characteristicvaluechanged', (e: Event) => {
          const target = e.target as unknown as { value: DataView };
          if (target && target.value) {
            this.handleChipseaGattData(target.value);
          }
        });
      }

      // Característica TX (0xFFF2) para enviar sincronização de relógio e usuário
      try {
        let txChar: BluetoothRemoteGATTCharacteristic | null = null;
        try {
          txChar = await chipseaService.getCharacteristic(0xFFF2);
        } catch {
          txChar = await chipseaService.getCharacteristic('0000fff2-0000-1000-8000-00805f9b34fb');
        }

        if (txChar) {
          const syncPacket = buildChipseaUserSync(this.userProfile || undefined);
          const txWithMethod = txChar as BluetoothRemoteGATTCharacteristic & {
            writeValueWithoutResponse?: (data: BufferSource) => Promise<void>;
          };
          const syncBuffer = syncPacket as unknown as BufferSource;
          if (typeof txWithMethod.writeValueWithoutResponse === 'function') {
            await txWithMethod.writeValueWithoutResponse(syncBuffer);
          } else {
            await txChar.writeValue(syncBuffer);
          }
        }
      } catch {
        // Envio de sincronização opcional se a balança já estiver em streaming
      }

      return;
    }

    // 2. Tentar serviço padrão Bluetooth SIG (0x181D ou 0x181B)
    let stdService: BluetoothRemoteGATTService | null = null;
    try {
      stdService = await server.getPrimaryService(0x181D);
    } catch {
      try {
        stdService = await server.getPrimaryService(0x181B);
      } catch {
        const services = await server.getPrimaryServices();
        if (services.length > 0) stdService = services[0];
      }
    }

    if (stdService) {
      const characteristics = await stdService.getCharacteristics();
      const notifyChar = characteristics.find(c => c.properties.notify || c.properties.indicate) || characteristics[0];

      if (notifyChar) {
        this.characteristic = notifyChar;
        await notifyChar.startNotifications();
        notifyChar.addEventListener('characteristicvaluechanged', (e: Event) => {
          const target = e.target as unknown as { value: DataView };
          if (target && target.value) {
            this.parseScaleData(target.value);
          }
        });
      }
    }
  }

  private handleChipseaGattData(dataView: DataView): void {
    if (dataView.byteLength < 5) return;

    const bytes: number[] = [];
    for (let i = 0; i < dataView.byteLength; i++) {
      bytes.push(dataView.getUint8(i));
    }

    const reading = decodeChipseaGattFrame(bytes);
    if (reading && reading.weightKg > 0) {
      this.setStatus(reading.isStabilized ? 'stabilized' : 'measuring');
      if (this.onReadingCallback) {
        this.onReadingCallback({
          ...reading,
          deviceName: this.deviceName,
          protocol: 'gatt-chipsea'
        });
      }
    }
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
        this.onReadingCallback({
          ...reading,
          deviceName: this.deviceName,
          protocol: 'gatt-standard'
        });
      }
    }
  }

  public disconnect(): void {
    this.stopSimulation();

    if (this.advertisementAbortController) {
      this.advertisementAbortController.abort();
      this.advertisementAbortController = null;
    }

    if (this.server && this.server.connected) {
      this.server.disconnect();
    } else if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
    }

    this.device = null;
    this.server = null;
    this.characteristic = null;
    this.connectionMode = 'idle';
    this.setStatus('disconnected');
  }

  /**
   * Simulador de Medição para testes em desktop ou navegadores sem balança física
   */
  public startSimulation(targetWeight = 72.4): void {
    this.stopSimulation();
    this.connectionMode = 'simulation';
    this.deviceName = 'Simulador de Balança';
    this.setStatus('measuring');

    let current = Number((targetWeight - 1.5).toFixed(1));
    let steps = 0;

    this.simulationInterval = window.setInterval(() => {
      steps++;
      const jitter = (Math.random() * 0.4) - 0.15;
      current = Number((current + jitter).toFixed(1));

      if (steps < 8) {
        if (this.onReadingCallback) {
          this.onReadingCallback({
            weightKg: Math.max(20, current),
            isStabilized: false,
            deviceName: this.deviceName,
            protocol: 'simulation'
          });
        }
      } else {
        this.stopSimulation();
        this.setStatus('stabilized');
        if (this.onReadingCallback) {
          this.onReadingCallback({
            weightKg: targetWeight,
            impedanceOhms: 512,
            isStabilized: true,
            rawBytes: 'ca 10 02 02 d4 02 00 96',
            deviceName: this.deviceName,
            protocol: 'simulation'
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
