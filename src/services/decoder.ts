import { BluetoothReading } from '../types';

/**
 * Decodifica pacotes de dados das balanças baseadas em Chipsea / OKOK (Headers 0xCA ou 0xCF)
 */
export const decodeChipseaPacket = (bytesInput: Uint8Array | number[]): BluetoothReading => {
  const bytes = Array.from(bytesInput);
  if (bytes.length < 5) {
    return { weightKg: 0, isStabilized: false };
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
    calculated = calculated * 0.45359237; // Converte lbs para kg
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
