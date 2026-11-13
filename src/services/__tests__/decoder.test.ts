import { describe, it, expect } from 'vitest';
import { decodeChipseaPacket, decodeStandardWeightPacket, decodeScalePacket } from '../decoder';

describe('Decodificador de Pacotes da Balança (Decoder)', () => {
  it('deve decodificar pacote Chipsea / OKOK estabilizado com peso e impedância', () => {
    // 0xCA (Header), 0x10, 0x02 (Stabilized), 0x02, 0xD4 (724 -> 72.4kg), 0x02, 0x00 (512 ohms)
    const rawPacket = [0xCA, 0x10, 0x02, 0x02, 0xD4, 0x02, 0x00];
    const reading = decodeChipseaPacket(rawPacket);

    expect(reading.weightKg).toBe(72.4);
    expect(reading.isStabilized).toBe(true);
    expect(reading.impedanceOhms).toBe(512);
  });

  it('deve decodificar pacote Chipsea em processo de medição (não estabilizado)', () => {
    // Status 0x00 (não estabilizado), peso 71.8kg
    const rawPacket = [0xCA, 0x10, 0x00, 0x02, 0xCE];
    const reading = decodeChipseaPacket(rawPacket);

    expect(reading.weightKg).toBe(71.8);
    expect(reading.isStabilized).toBe(false);
    expect(reading.impedanceOhms).toBeUndefined();
  });

  it('deve decodificar pacote Bluetooth SIG padrão (0x2A9D) em kg', () => {
    // Flags 0x00 (kg, resolution 0.005), raw weight 14480 -> 14480 * 0.005 = 72.4kg
    // 14480 = 0x3890 -> bytes: low 0x90, high 0x38
    const rawPacket = [0x00, 0x90, 0x38];
    const reading = decodeStandardWeightPacket(rawPacket);

    expect(reading.weightKg).toBe(72.4);
    expect(reading.isStabilized).toBe(true);
  });

  it('deve rotear automaticamente o decodificador com base no cabeçalho do pacote', () => {
    const chipseaPacket = [0xCA, 0x10, 0x02, 0x02, 0xD4];
    const reading = decodeScalePacket(chipseaPacket);

    expect(reading.weightKg).toBe(72.4);
    expect(reading.isStabilized).toBe(true);
  });

  it('deve lidar graciosamente com pacotes vazios ou corrompidos', () => {
    const emptyReading = decodeScalePacket([]);
    expect(emptyReading.weightKg).toBe(0);
    expect(emptyReading.isStabilized).toBe(false);
  });
});
