import { UserProfile, MeasurementRecord } from '../types';

const STORAGE_KEYS = {
  USERS: 'smart_scale_users',
  ACTIVE_USER_ID: 'smart_scale_active_user_id',
  MEASUREMENTS: 'smart_scale_measurements',
  SETTINGS: 'smart_scale_settings'
};

const DEFAULT_USER: UserProfile = {
  id: 'default-user',
  name: 'Meu Perfil',
  gender: 'male',
  heightCm: 175,
  birthDate: '1995-06-15',
  activityLevel: 'moderate',
  targetWeightKg: 72.0,
  createdAt: new Date().toISOString()
};

export const StorageService = {
  getUsers(): UserProfile[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      if (!data) {
        this.saveUsers([DEFAULT_USER]);
        return [DEFAULT_USER];
      }
      return JSON.parse(data);
    } catch {
      return [DEFAULT_USER];
    }
  },

  saveUsers(users: UserProfile[]): void {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  getActiveUserId(): string {
    const id = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID);
    if (!id) {
      this.setActiveUserId(DEFAULT_USER.id);
      return DEFAULT_USER.id;
    }
    return id;
  },

  setActiveUserId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, id);
  },

  getActiveUser(): UserProfile {
    const users = this.getUsers();
    const activeId = this.getActiveUserId();
    return users.find(u => u.id === activeId) || users[0] || DEFAULT_USER;
  },

  saveUser(user: UserProfile): void {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    this.saveUsers(users);
  },

  getMeasurements(userId?: string): MeasurementRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEASUREMENTS);
      if (!data) return [];
      const records: MeasurementRecord[] = JSON.parse(data);
      if (userId) {
        return records.filter(r => r.userId === userId);
      }
      return records;
    } catch {
      return [];
    }
  },

  saveMeasurement(record: MeasurementRecord): void {
    const records = this.getMeasurements();
    // Inserir no início (ordem decrescente)
    records.unshift(record);
    // Limitar histórico local a 1000 medições
    if (records.length > 1000) {
      records.length = 1000;
    }
    localStorage.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify(records));
  },

  deleteMeasurement(id: string): void {
    const records = this.getMeasurements().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify(records));
  },

  exportToCSV(userId?: string): string {
    const records = this.getMeasurements(userId);
    const headers = [
      'datetime',
      'weight_kg',
      'bmi',
      'fat_percentage',
      'muscle_kg',
      'water_percentage',
      'visceral_fat',
      'bone_kg',
      'bmr_kcal',
      'impedance_ohms'
    ];

    const rows = records.map(r => [
      r.timestamp,
      r.metrics.weightKg,
      r.metrics.bmi.value,
      r.metrics.bodyFatPercentage.value,
      r.metrics.muscleMassKg.value,
      r.metrics.waterPercentage.value,
      r.metrics.visceralFat.value,
      r.metrics.boneMassKg.value,
      r.metrics.bmrKcal.value,
      r.metrics.impedanceOhms || ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  },

  exportToJSON(): string {
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      users: this.getUsers(),
      measurements: this.getMeasurements()
    }, null, 2);
  },

  importFromJSON(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.users)) {
        this.saveUsers(data.users);
      }
      if (Array.isArray(data.measurements)) {
        localStorage.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify(data.measurements));
      }
      return true;
    } catch {
      return false;
    }
  }
};
