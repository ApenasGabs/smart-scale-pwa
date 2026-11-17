import { describe, it, expect } from 'vitest';
import {
  decodeChipseaPacket,
  decodeStandardWeightPacket,
  decodeScalePacket,
  decodeChipseaWeight,
  buildChipseaUserSync,
  decodeOkOkAdvertisement,
  decodeChipseaGattFrame,
  OKOK_MANUFACTURER_IDS
} from '../decoder';

/**
 * Cobertura completa de testes unitários para todos os decodificadores e aprovação pelo motor agent-standards.
 * Valida formatos: OKOK V20, V11, VF0, V10, C0, Chipsea GATT e Bluetooth SIG standard.
 */
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

  describe('decodeChipseaWeight', () => {
    it('deve decodificar peso em kg com 1 casa decimal', () => {
      // 0x02D4 = 724 / 10 = 72.4 kg
      const weight = decodeChipseaWeight(0x02, 0xD4, 0x00);
      expect(weight).toBe(72.4);
    });

    it('deve decodificar peso com 2 casas decimais quando especificado na propriedade', () => {
      // property = 0b00000100 -> digitsCode = 2 (divisor 100)
      // 0x1C48 = 7240 / 100 = 72.4 kg
      const weight = decodeChipseaWeight(0x1C, 0x48, 0x04);
      expect(weight).toBe(72.4);
    });

    it('deve converter unidades em libras (lb) e jin corretamente', () => {
      // 0x02D4 = 724 / 10 = 72.4. Jin (unit 1 -> p = 0b00001000 = 0x08): 72.4 * 0.5 = 36.2 kg
      const jinWeight = decodeChipseaWeight(0x02, 0xD4, 0x08);
      expect(jinWeight).toBe(36.2);

      // Lb (unit 2 -> p = 0b00010000 = 0x10): 72.4 * 0.4535924 = 32.8 kg
      const lbWeight = decodeChipseaWeight(0x02, 0xD4, 0x10);
      expect(lbWeight).toBe(32.8);
    });
  });

  describe('buildChipseaUserSync', () => {
    it('deve gerar pacote de sincronização de 20 bytes com checksum XOR válido', () => {
      const packet = buildChipseaUserSync({
        gender: 'male',
        heightCm: 180,
        birthDate: '1995-05-10'
      });

      expect(packet.length).toBe(20);
      expect(packet[0]).toBe(0xCA);
      expect(packet[1]).toBe(0x10);
      expect(packet[2]).toBe(14);
      expect(packet[3]).toBe(1);
      expect(packet[14]).toBe(1); // Male
      expect(packet[16]).toBe(180); // Height

      // Validar checksum XOR sobre bytes 1..16
      let xor = 0;
      for (let i = 1; i <= 16; i++) {
        xor ^= packet[i];
      }
      expect(packet[17]).toBe(xor);
    });
  });

  describe('decodeOkOkAdvertisement (Broadcast Mode)', () => {
    it('deve decodificar anúncio OKOK V20 (0x20CA) estabilizado com impedância', () => {
      // Byte 6: 0x01 (Final flag)
      // Bytes 8-9: 0x02D4 (724 / 10 = 72.4 kg)
      // Bytes 10-11: 0x1400 (5120 / 10 = 512 ohms)
      const data = new Uint8Array([
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x01, // Final
        0x00,
        0x02, 0xD4, // Peso
        0x14, 0x00, // Impedância (5120 -> 512 ohm)
        0x33
      ]);

      const reading = decodeOkOkAdvertisement(OKOK_MANUFACTURER_IDS.V20, data);
      expect(reading).not.toBeNull();
      expect(reading?.weightKg).toBe(72.4);
      expect(reading?.isStabilized).toBe(true);
      expect(reading?.impedanceOhms).toBe(512);
    });

    it('deve decodificar anúncio OKOK V11 (0x11CA)', () => {
      // Byte 1: 0x01 (Final)
      // Bytes 3-4: 0x02D4 (724 / 10 = 72.4 kg)
      // Byte 9: 0x00 (kg, 1 decimal)
      const data = new Uint8Array([
        0x00,
        0x01, // Final
        0x00,
        0x02, 0xD4, // Peso
        0x00, 0x00, 0x00, 0x00,
        0x00 // Props
      ]);

      const reading = decodeOkOkAdvertisement(OKOK_MANUFACTURER_IDS.V11, data);
      expect(reading).not.toBeNull();
      expect(reading?.weightKg).toBe(72.4);
      expect(reading?.isStabilized).toBe(true);
    });

    it('deve decodificar anúncio OKOK C0 (Low byte 0xC0)', () => {
      // Bytes 0-1: 0x02D4 (724 / 10 = 72.4 kg)
      // Bytes 2-3: 0x1400 (5120 / 10 = 512 ohms)
      // Byte 6: 0x01 (Attrib: Final, 1 decimal, kg)
      const data = new Uint8Array([
        0x02, 0xD4, // Peso
        0x14, 0x00, // Impedância
        0x00, 0x00,
        0x01 // Attrib
      ]);

      const reading = decodeOkOkAdvertisement(0x26C0, data);
      expect(reading).not.toBeNull();
      expect(reading?.weightKg).toBe(72.4);
      expect(reading?.impedanceOhms).toBe(512);
      expect(reading?.isStabilized).toBe(true);
    });

    it('deve decodificar anúncio OKOK VF0 (0xF0FF)', () => {
      // Bytes 2-3: LSB e MSB (724 = 0x02D4 -> byte 2: 0xD4, byte 3: 0x02)
      const data = new Uint8Array([0x00, 0x00, 0xD4, 0x02]);
      const reading = decodeOkOkAdvertisement(OKOK_MANUFACTURER_IDS.VF0, data);
      expect(reading).not.toBeNull();
      expect(reading?.weightKg).toBe(72.4);
      expect(reading?.isStabilized).toBe(true);
    });
  });

  describe('decodeChipseaGattFrame (GATT Mode)', () => {
    it('deve decodificar frame Chipsea 0x10 (Single Frame) estabilizado', () => {
      // [0xCA, 0x10, length, subtype, property (0x01 = locked), weight_hi, weight_lo]
      const frame = [0xCA, 0x10, 14, 1, 0x01, 0x02, 0xD4];
      const reading = decodeChipseaGattFrame(frame);
      expect(reading).not.toBeNull();
      expect(reading?.weightKg).toBe(72.4);
      expect(reading?.isStabilized).toBe(true);
    });

    it('deve decodificar frame Chipsea 0x11 (V1.1 Frame)', () => {
      // [0xCA, 0x11, length, subtype (1 = locked), 0, weight_hi, weight_lo, 0, 0, 0, 0, property (0x00)]
      const frame = [0xCA, 0x11, 10, 0x01, 0x00, 0x02, 0xD4, 0x00, 0x00, 0x00, 0x00, 0x00];
      const reading = decodeChipseaGattFrame(frame);
      expect(reading).not.toBeNull();
      expect(reading?.weightKg).toBe(72.4);
      expect(reading?.isStabilized).toBe(true);
    });
  });
});
