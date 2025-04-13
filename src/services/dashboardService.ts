import { Device as DeviceType, User } from '@/types/sensors';
import { TimePeriod } from '@/lib/time-utils';
import { calculateDateRange } from '@/lib/date-utils';
import { getUser } from './authService';
import { getDevicesWithSensors } from './deviceService';
import { getAlertLogs, AlertLog } from './alertService';
import { SensorType } from '@prisma/client';
import { logError } from '@/lib/error-utils';

// Type pour les filtres du tableau de bord
export interface DashboardFilters {
  period: TimePeriod;
  type: SensorType | 'all';
  alertFilter: 'all' | 'alert';
  viewMode: 'grid' | 'list';
  timeOffset: number;
}

// Type pour les données du tableau de bord
export interface DashboardData {
  user: User | null;
  devices: DeviceType[];
  activeAlerts: AlertLog[];
  dateRange: {
    startDate: Date;
    endDate: Date;
    displayRange: string;
  };
}

// Valeurs par défaut pour les filtres
export const DEFAULT_FILTERS: DashboardFilters = {
  period: 'day',
  type: 'all',
  alertFilter: 'all',
  viewMode: 'grid',
  timeOffset: 0
};

// Constante pour la clé de stockage local
const STORAGE_KEY_PREFIX = 'iot_dashboard_';
const MAX_STORAGE_SIZE = 50000; // Taille maximale en caractères (~50KB)

// Constante pour éviter les requêtes trop fréquentes
const MIN_REQUEST_INTERVAL = 500; // 500ms minimum entre les requêtes
let lastRequestTime = 0;

/**
 * Vérifie si localStorage est disponible
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = `${STORAGE_KEY_PREFIX}test`;
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.warn('Erreur lors de la vérification de localStorage:', e);
    return false;
  }
}

/**
 * Charge toutes les données nécessaires au tableau de bord
 */
export async function loadDashboardData(filters: DashboardFilters): Promise<DashboardData> {
  try {
    // Protection contre les requêtes trop fréquentes
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();
    
    // Charger les données en parallèle
    const [userData, devicesWithSensors, activeAlerts] = await Promise.all([
      getUser(),
      getDevicesWithSensors(filters.period, filters.timeOffset),
      getAlertLogs(true)
    ]);

    // Calculer la plage de dates pour l'affichage
    const dateRange = calculateDateRange(filters.period, filters.timeOffset);

    return {
      user: userData,
      devices: devicesWithSensors,
      activeAlerts,
      dateRange
    };
  } catch (error) {
    throw logError(error, 'loadDashboardData');
  }
}

/**
 * Filtre les appareils en fonction des critères sélectionnés
 */
export function filterDevices(
  devices: DeviceType[],
  activeAlerts: AlertLog[],
  filters: DashboardFilters
): DeviceType[] {
  return devices.filter(device => {
    // Filtrer par type de capteur
    if (filters.type !== 'all') {
      const hasMatchingSensor = device.sensors.some(sensor => sensor.type === filters.type);
      if (!hasMatchingSensor) return false;
    }
    
    // Filtrer par état d'alerte
    if (filters.alertFilter === 'alert') {
      const hasAlertSensor = device.sensors.some(sensor => {
        return activeAlerts.some(alert => alert.sensor.id === sensor.id && alert.isActive);
      });
      if (!hasAlertSensor) return false;
    }
    
    return true;
  });
}

/**
 * Met à jour les capteurs avec leur état d'alerte
 */
export function updateSensorsAlertStatus(
  devices: DeviceType[],
  activeAlerts: AlertLog[]
): DeviceType[] {
  if (activeAlerts.length === 0 || devices.length === 0) return devices;

  return devices.map(device => {
    const updatedSensors = device.sensors.map(sensor => {
      // Vérifier si le capteur a une alerte active
      const isInAlert = activeAlerts.some(
        alert => alert.sensor.id === sensor.id && alert.isActive
      );
      return { ...sensor, isInAlert };
    });
    
    return { ...device, sensors: updatedSensors };
  });
}

/**
 * Sauvegarde les préférences du tableau de bord
 * Utilise l'API pour period, type, alertFilter et viewMode
 * Utilise localStorage uniquement pour timeOffset
 */
export async function saveDashboardPreferences(filters: DashboardFilters): Promise<void> {
  try {
    // Sauvegarder timeOffset localement
    saveTimeOffsetLocally(filters.timeOffset);
    
    // Essayer de sauvegarder les autres préférences via l'API
    const token = document.cookie
      .split("; ")
      .find(row => row.startsWith("auth-token="))
      ?.split("=")[1];
    
    if (!token) {
      throw new Error('Token non disponible');
    }
    
    const response = await fetch('/api/user/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(filters)
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
  } catch (error) {
    console.warn('Erreur lors de la sauvegarde des préférences:', error);
    
    // Fallback complet sur localStorage
    saveAllPreferencesLocally(filters);
  }
}

/**
 * Sauvegarde uniquement le timeOffset dans localStorage
 */
function saveTimeOffsetLocally(timeOffset: number): void {
  if (typeof window === 'undefined') return;
  
  try {
    if (!isLocalStorageAvailable()) {
      return;
    }
    
    localStorage.setItem(`${STORAGE_KEY_PREFIX}timeOffset`, timeOffset.toString());
  } catch (error) {
    console.warn('Erreur lors de la sauvegarde du timeOffset:', error);
  }
}

/**
 * Sauvegarde toutes les préférences localement (fallback)
 */
function saveAllPreferencesLocally(filters: DashboardFilters): void {
  if (typeof window === 'undefined') return;
  
  try {
    if (!isLocalStorageAvailable()) {
      return;
    }
    
    // Créer un objet pour stocker les préférences
    const preferences = {
      period: filters.period,
      type: filters.type,
      alertFilter: filters.alertFilter,
      viewMode: filters.viewMode,
      timeOffset: filters.timeOffset
    };
    
    // Vérifier la taille des données avant stockage
    const preferencesStr = JSON.stringify(preferences);
    if (preferencesStr.length > MAX_STORAGE_SIZE) {
      return;
    }
    
    // Stocker en une seule opération
    localStorage.setItem(`${STORAGE_KEY_PREFIX}preferences`, preferencesStr);
  } catch (error) {
    console.warn('Erreur lors de la sauvegarde des préférences localement:', error);
  }
}

/**
 * Récupère les préférences du tableau de bord
 * Combine les données de l'API et localStorage
 */
export async function loadDashboardPreferences(): Promise<DashboardFilters> {
  try {
    // Charger le timeOffset depuis localStorage
    const timeOffset = loadTimeOffsetLocally();
    
    // Essayer de charger les autres préférences depuis l'API
    const token = document.cookie
      .split("; ")
      .find(row => row.startsWith("auth-token="))
      ?.split("=")[1];
      
    if (!token) {
      throw new Error('Token non disponible');
    }
    
    const response = await fetch('/api/user/preferences', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const apiPreferences = await response.json();
    console.log('Préférences chargées depuis API:', JSON.stringify(apiPreferences));
    
    // S'assurer que tous les champs sont définis, sinon utiliser les valeurs par défaut
    const preferences: DashboardFilters = {
      period: validTimePeriod(apiPreferences.period) ? apiPreferences.period : DEFAULT_FILTERS.period,
      type: validSensorType(apiPreferences.type) ? apiPreferences.type : DEFAULT_FILTERS.type,
      alertFilter: validAlertFilter(apiPreferences.alertFilter) ? apiPreferences.alertFilter : DEFAULT_FILTERS.alertFilter,
      viewMode: validViewMode(apiPreferences.viewMode) ? apiPreferences.viewMode : DEFAULT_FILTERS.viewMode,
      timeOffset
    };
    
    console.log('Préférences finales après validation:', JSON.stringify(preferences));
    return preferences;
  } catch (error) {
    console.warn('Erreur lors du chargement des préférences depuis l\'API:', error);
    
    // Fallback complet sur localStorage
    return loadAllPreferencesLocally();
  }
}

/**
 * Charge uniquement le timeOffset depuis localStorage
 */
function loadTimeOffsetLocally(): number {
  if (typeof window === 'undefined') return DEFAULT_FILTERS.timeOffset;
  
  try {
    if (!isLocalStorageAvailable()) {
      return DEFAULT_FILTERS.timeOffset;
    }
    
    const timeOffsetStr = localStorage.getItem(`${STORAGE_KEY_PREFIX}timeOffset`);
    if (!timeOffsetStr) return DEFAULT_FILTERS.timeOffset;
    
    const timeOffset = parseInt(timeOffsetStr, 10);
    return isNaN(timeOffset) ? DEFAULT_FILTERS.timeOffset : timeOffset;
  } catch (error) {
    console.warn('Erreur lors du chargement du timeOffset:', error);
    return DEFAULT_FILTERS.timeOffset;
  }
}

/**
 * Charge toutes les préférences depuis localStorage (fallback)
 */
function loadAllPreferencesLocally(): DashboardFilters {
  if (typeof window === 'undefined') return DEFAULT_FILTERS;
  
  try {
    if (!isLocalStorageAvailable()) {
      return DEFAULT_FILTERS;
    }
    
    const preferencesStr = localStorage.getItem(`${STORAGE_KEY_PREFIX}preferences`);
    if (!preferencesStr) return DEFAULT_FILTERS;
    
    // Parsing sécurisé avec validation des types
    const preferences = JSON.parse(preferencesStr);
    
    return {
      period: validTimePeriod(preferences.period) ? preferences.period : DEFAULT_FILTERS.period,
      type: validSensorType(preferences.type) ? preferences.type : DEFAULT_FILTERS.type,
      alertFilter: validAlertFilter(preferences.alertFilter) ? preferences.alertFilter : DEFAULT_FILTERS.alertFilter,
      viewMode: validViewMode(preferences.viewMode) ? preferences.viewMode : DEFAULT_FILTERS.viewMode,
      timeOffset: typeof preferences.timeOffset === 'number' ? preferences.timeOffset : DEFAULT_FILTERS.timeOffset
    };
  } catch (error) {
    console.warn('Erreur lors du chargement des préférences:', error);
    return DEFAULT_FILTERS;
  }
}

// Fonctions de validation pour vérifier les types
function validTimePeriod(value: unknown): value is TimePeriod {
  const validPeriods: TimePeriod[] = ['1h', '3h', '6h', '12h', 'day', 'week', 'month'];
  return typeof value === 'string' && validPeriods.includes(value as TimePeriod);
}

function validSensorType(value: unknown): value is SensorType | 'all' {
  const validTypes = [...Object.values(SensorType), 'all'];
  return typeof value === 'string' && validTypes.includes(value as SensorType | 'all');
}

function validAlertFilter(value: unknown): value is 'all' | 'alert' {
  return typeof value === 'string' && (value === 'all' || value === 'alert');
}

function validViewMode(value: unknown): value is 'grid' | 'list' {
  return typeof value === 'string' && (value === 'grid' || value === 'list');
}