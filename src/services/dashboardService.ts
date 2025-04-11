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

/**
 * Charge toutes les données nécessaires au tableau de bord
 */
export async function loadDashboardData(filters: DashboardFilters): Promise<DashboardData> {
  try {
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
 * Sauvegarde les préférences du tableau de bord dans localStorage
 */
export function saveDashboardPreferences(filters: DashboardFilters): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('dashboardPeriod', filters.period);
  localStorage.setItem('dashboardType', filters.type);
  localStorage.setItem('dashboardAlertFilter', filters.alertFilter);
  localStorage.setItem('dashboardViewMode', filters.viewMode);
  localStorage.setItem('dashboardTimeOffset', filters.timeOffset.toString());
}

/**
 * Récupère les préférences du tableau de bord depuis localStorage
 */
export function loadDashboardPreferences(): DashboardFilters {
  if (typeof window === 'undefined') return DEFAULT_FILTERS;
  
  const savedPeriod = localStorage.getItem('dashboardPeriod');
  const savedType = localStorage.getItem('dashboardType');
  const savedAlertFilter = localStorage.getItem('dashboardAlertFilter');
  const savedViewMode = localStorage.getItem('dashboardViewMode');
  const savedTimeOffset = localStorage.getItem('dashboardTimeOffset');

  return {
    period: (savedPeriod as TimePeriod) || DEFAULT_FILTERS.period,
    type: (savedType as SensorType | 'all') || DEFAULT_FILTERS.type,
    alertFilter: (savedAlertFilter as 'all' | 'alert') || DEFAULT_FILTERS.alertFilter,
    viewMode: (savedViewMode as 'grid' | 'list') || DEFAULT_FILTERS.viewMode,
    timeOffset: savedTimeOffset ? parseInt(savedTimeOffset, 10) : DEFAULT_FILTERS.timeOffset
  };
} 