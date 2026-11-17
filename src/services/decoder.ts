import { BluetoothReading } from '../types';

export const OKOK_MANUFACTURER_IDS = {
  V20: 0x20CA,
  V11: 0x11CA,
  VF0: 0xF0FF,
  V26: 0x26C0,
  V10: 0x10FF,
  C0_LOW_BYTE: 0xC0
} as const;

const LB_TO_KG = 0.4535924;
const JIN_TO_KG = 0.5;

/**
 * Decodifica o peso de 2 bytes com base no byte de propriedades do protocolo Chipsea
 */
export const decodeChipseaWeight = (hi: number, lo: number, property: number): number => {
  const p = property & 0xFF;
  const unit = (p >> 3) & 0x03;
  if (unit === 0x03) {
    // Stone + Pounds
    const pounds = (hi & 0xFF) * 14 + (lo & 0xFF) / 10;
    return Number((pounds * LB_TO_KG).toFixed(1));
  }

  const raw = ((hi & 0xFF) << 8) | (lo & 0xFF);
  const digitsCode = (p >> 1) & 0x03;
  const divisor = digitsCode === 0x01 ? 1 : digitsCode === 0x02 ? 100 : 10;
  const value = raw / divisor;

  let weightKg = value;
  if (unit === 0x01) {
    weightKg = value * JIN_TO_KG;
  } else if (unit === 0x02) {
    weightKg = value * LB_TO_KG;
  }

  return Number(weightKg.toFixed(1));
};

/**
 * Constrói o pacote v1.0 de sincronização de relógio e dados de usuário (Chipsea 0xFFF2)
 * Frame de 20 bytes com Header 0xCA, Classe 0x10 e Checksum XOR sobre bytes 1..16
 */
export const buildChipseaUserSync = (user?: {
  gender?: string;
  heightCm?: number;
  birthDate?: string;
}): Uint8Array => {
  const now = new Date();
  const frame = new Uint8Array(20);
  const year = now.getFullYear() % 100;
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();

  let age = 30;
  if (user?.birthDate) {
    const birthYear = new Date(user.birthDate).getFullYear();
    if (!Number.isNaN(birthYear) && birthYear > 1900) {
      age = Math.max(10, Math.min(120, now.getFullYear() - birthYear));
    }
  }

  const isMale = user?.gender !== 'female';
  const heightCm = Math.max(50, Math.min(250, Math.round(user?.heightCm || 175)));
  const userId = 1;

  frame[0] = 0xCA; // Header Chipsea
  frame[1] = 0x10; // Classe Single/User Sync
  frame[2] = 14;   // Tamanho útil
  frame[3] = 1;    // Subtipo 1
  frame[4] = year;
  frame[5] = month;
  frame[6] = day;
  frame[7] = hour;
  frame[8] = minute;
  frame[9] = second;
  frame[10] = (userId >>> 24) & 0xFF;
  frame[11] = (userId >>> 16) & 0xFF;
  frame[12] = (userId >>> 8) & 0xFF;
  frame[13] = userId & 0xFF;
  frame[14] = isMale ? 1 : 0;
  frame[15] = age & 0xFF;
  frame[16] = heightCm & 0xFF;

  let xor = 0;
  for (let i = 1; i <= 16; i++) {
    xor ^= frame[i];
  }
  frame[17] = xor & 0xFF;
  frame[18] = 0;
  frame[19] = 0;

  return frame;
};

/**
 * Decodifica pacotes de BLE Advertisements emitidos pelas balanças OKOK (Broadcast Mode)
 */
export const decodeOkOkAdvertisement = (
  companyId: number,
  dataInput: DataView | Uint8Array | number[]
): BluetoothReading | null => {
  let bytes: number[];
  if (dataInput instanceof DataView) {
    bytes = [];
    for (let i = 0; i < dataInput.byteLength; i++) {
      bytes.push(dataInput.getUint8(i));
    }
  } else {
    bytes = Array.from(dataInput);
  }

  if (bytes.length < 4) return null;

  const hexBytes = bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');

  // 1. Variante V20 (0x20CA)
  if (companyId === OKOK_MANUFACTURER_IDS.V20 && bytes.length >= 10) {
    const finalByte = bytes[6] ?? 0;
    const isStabilized = (finalByte & 0x01) !== 0;
    const divider = (finalByte & 0x04) !== 0 ? 100.0 : 10.0;
    const weightRaw = ((bytes[8] & 0xFF) << 8) | (bytes[9] & 0xFF);
    const weightKg = Number((weightRaw / divider).toFixed(1));

    let impedanceOhms: number | undefined = undefined;
    if (bytes.length >= 12) {
      const impRaw = ((bytes[10] & 0xFF) << 8) | (bytes[11] & 0xFF);
      if (impRaw > 100 && impRaw < 25000) {
        impedanceOhms = Number((impRaw / 10.0).toFixed(0));
      }
    }

    return {
      weightKg,
      impedanceOhms,
      isStabilized,
      rawBytes: `[0x20CA] ${hexBytes}`,
      unit: 'kg'
    };
  }

  // 2. Variante V11 (0x11CA)
  if (companyId === OKOK_MANUFACTURER_IDS.V11 && bytes.length >= 10) {
    const isStabilized = (bytes[1] & 0x01) !== 0;
    const props = bytes[9] ?? 0;
    const resolution = (props >> 1) & 0x03;
    const divider = resolution === 2 ? 100.0 : resolution === 1 ? 1.0 : 10.0;
    const weightRaw = ((bytes[3] & 0xFF) << 8) | (bytes[4] & 0xFF);
    const unit = (props >> 3) & 0x03;

    let weightKg = weightRaw / divider;
    if (unit === 1) weightKg = weightKg * JIN_TO_KG;
    else if (unit === 2) weightKg = weightKg * LB_TO_KG;
    else if (unit === 3) {
      const stones = weightRaw >> 8;
      const pounds = (weightRaw & 0xFF) / divider;
      weightKg = stones * 6.350293 + pounds * 0.453592;
    }

    return {
      weightKg: Number(weightKg.toFixed(1)),
      isStabilized,
      rawBytes: `[0x11CA] ${hexBytes}`,
      unit: 'kg'
    };
  }

  // 3. Variante VF0 (0xF0FF)
  if (companyId === OKOK_MANUFACTURER_IDS.VF0 && bytes.length >= 4) {
    const raw = ((bytes[3] & 0xFF) << 8) | (bytes[2] & 0xFF);
    return {
      weightKg: Number((raw / 10.0).toFixed(1)),
      isStabilized: true,
      rawBytes: `[0xF0FF] ${hexBytes}`,
      unit: 'kg'
    };
  }

  // 4. Variante V10 (0x10FF)
  if (companyId === OKOK_MANUFACTURER_IDS.V10 && bytes.length >= 4) {
    const raw = ((bytes[3] & 0xFF) << 8) | (bytes[2] & 0xFF);
    return {
      weightKg: Number((raw / 10.0).toFixed(1)),
      isStabilized: true,
      rawBytes: `[0x10FF] ${hexBytes}`,
      unit: 'kg'
    };
  }

  // 5. Variante C0 (byte baixo == 0xC0, ex: 0x26C0 ou 0x00C0)
  if ((companyId & 0xFF) === OKOK_MANUFACTURER_IDS.C0_LOW_BYTE && bytes.length >= 7) {
    const attrib = bytes[6] ?? 0;
    const isStabilized = (attrib & 0x01) !== 0;
    const resolution = (attrib >> 1) & 0x03;
    const divider = resolution === 2 ? 100.0 : resolution === 1 ? 1.0 : 10.0;
    const unit = (attrib >> 3) & 0x03;
    const weightRaw = ((bytes[0] & 0xFF) << 8) | (bytes[1] & 0xFF);

    let weightKg = weightRaw / divider;
    if (unit === 1) weightKg = weightKg * JIN_TO_KG;
    else if (unit === 2) weightKg = weightKg * LB_TO_KG;
    else if (unit === 3) {
      const stones = bytes[0] & 0xFF;
      const pounds = (bytes[1] & 0xFF) / divider;
      weightKg = stones * 6.350293 + pounds * 0.453592;
    }

    let impedanceOhms: number | undefined = undefined;
    if (bytes.length >= 4) {
      const impRaw = ((bytes[2] & 0xFF) << 8) | (bytes[3] & 0xFF);
      if (impRaw > 100 && impRaw < 25000) {
        impedanceOhms = Number((impRaw / 10.0).toFixed(0));
      }
    }

    return {
      weightKg: Number(weightKg.toFixed(1)),
      impedanceOhms,
      isStabilized,
      rawBytes: `[0xC0] ${hexBytes}`,
      unit: 'kg'
    };
  }

  return null;
};

/**
 * Decodifica pacotes de notificações GATT (Chipsea 0xFFF1)
 */
export const decodeChipseaGattFrame = (
  bytesInput: Uint8Array | number[]
): BluetoothReading | null => {
  const bytes = Array.from(bytesInput);
  if (bytes.length < 5 || bytes[0] !== 0xCA) return null;

  const frameClass = bytes[1];
  const hexBytes = bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');

  // Single Frame (0x10)
  if (frameClass === 0x10 && bytes.length >= 7) {
    const property = bytes[4];
    const isStabilized = (property & 0x01) !== 0;
    const weightKg = decodeChipseaWeight(bytes[5], bytes[6], property);

    let impedanceOhms: number | undefined = undefined;
    if (isStabilized && bytes.length >= 18) {
      // Byte 15 e 16 trazem gordura visceral ou impedância dependendo da versão
      const fatRaw = ((bytes[7] & 0xFF) << 8) | (bytes[8] & 0xFF);
      if (fatRaw > 0 && fatRaw < 1000) {
        // Balança calculou localmente
      }
    }

    return {
      weightKg,
      impedanceOhms,
      isStabilized,
      rawBytes: hexBytes,
      unit: 'kg'
    };
  }

  // V1.1 Frame (0x11)
  if (frameClass === 0x11 && bytes.length >= 12) {
    const subtype = bytes[3];
    // Subtipo 0: peso não estabilizado, Subtipo 1: estabilizado
    if (subtype === 0 || subtype === 1) {
      const property = bytes[11];
      const isStabilized = subtype === 1;
      const weightKg = decodeChipseaWeight(bytes[5], bytes[6], property);

      return {
        weightKg,
        isStabilized,
        rawBytes: hexBytes,
        unit: 'kg'
      };
    }
  }

  return null;
};

/**
 * Decodifica pacotes de dados legados das balanças baseadas em Chipsea / OKOK
 */
export const decodeChipseaPacket = (bytesInput: Uint8Array | number[]): BluetoothReading => {
  const bytes = Array.from(bytesInput);
  if (bytes.length < 5) {
    return { weightKg: 0, isStabilized: false };
  }

  // Verifica se é frame GATT com Header 0xCA e estrutura [0xCA, class, length >= 7, subtype]
  if (bytes[0] === 0xCA && bytes.length >= 7 && (bytes[1] === 0x10 || bytes[1] === 0x11) && bytes[2] >= 7) {
    const gattReading = decodeChipseaGattFrame(bytes);
    if (gattReading) return gattReading;
  }

  const statusByte = bytes[2];
  const isStabilized = (statusByte & 0x01) === 0x01 || (statusByte & 0x02) === 0x02;

  // Peso em bytes 3 e 4
  const rawWeight = (bytes[3] << 8) | bytes[4];
  let weightKg = rawWeight / 10.0;
  if (weightKg > 250) {
    weightKg = rawWeight / 100.0;
  }

  let impedanceOhms: number | undefined = undefined;
  if (bytes.length >= 7) {
    const rawImpedance = (bytes[5] << 8) | bytes[6];
    if (rawImpedance > 100 && rawImpedance < 2000) {
      impedanceOhms = rawImpedance;
    }
  }

  return {
    weightKg: Number(weightKg.toFixed(1)),
    impedanceOhms,
    isStabilized,
    rawBytes: bytes.map(b => b.toString(16).padStart(2, '0')).join(' ')
  };
};

/**
 * Decodifica pacotes do padrão Bluetooth SIG (0x2A9D Weight Measurement)
 */
export const decodeStandardWeightPacket = (bytesInput: Uint8Array | number[]): BluetoothReading => {
  const bytes = Array.from(bytesInput);
  if (bytes.length < 3) {
    return { weightKg: 0, isStabilized: false };
  }

  const flags = bytes[0];
  const isLbs = (flags & 0x01) === 0x01;
  const rawWeight = (bytes[2] << 8) | bytes[1];
  const resolution = isLbs ? 0.01 : 0.005;
  let calculated = rawWeight * resolution;
  if (isLbs) {
    calculated = calculated * LB_TO_KG;
  }

  return {
    weightKg: Number(calculated.toFixed(1)),
    isStabilized: true,
    rawBytes: bytes.map(b => b.toString(16).padStart(2, '0')).join(' ')
  };
};

/**
 * Roteador de decodificação automática baseado no cabeçalho do pacote
 */
export const decodeScalePacket = (bytesInput: Uint8Array | number[]): BluetoothReading => {
  const bytes = Array.from(bytesInput);
  if (bytes.length === 0) return { weightKg: 0, isStabilized: false };

  const header = bytes[0];
  if (header === 0xCA || header === 0xCF) {
    return decodeChipseaPacket(bytes);
  }

  return decodeStandardWeightPacket(bytes);
};
