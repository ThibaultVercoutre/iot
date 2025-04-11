import { Device } from '@prisma/client'
import { Device as DeviceType, SensorWithData } from '@/types/sensors'
import { TimePeriod, getPeriodInHours } from '@/lib/time-utils'

// Cache pour stocker temporairement les résultats des requêtes
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

// Durée de validité du cache (en ms)
const CACHE_TTL = 500; // 500ms pour un rafraîchissement quasi-immédiat

// Définir un type d'union pour tous les types de données que nous mettons en cache
type CachedDataType = Device[] | DeviceType[] | SensorWithData[];

// Map de cache pour les différentes requêtes
const requestCache = new Map<string, CacheEntry<CachedDataType>>();

// Fonction utilitaire pour gérer le cache
function withCache<T extends CachedDataType>(key: string, fetchFn: () => Promise<T>, ttl = CACHE_TTL): Promise<T> {
  const now = Date.now();
  const cachedEntry = requestCache.get(key);
  
  // Si on a un résultat en cache qui n'est pas expiré, on le retourne
  if (cachedEntry && (now - cachedEntry.timestamp) < ttl) {
    console.log(`[Cache] Utilisation du cache pour: ${key}`);
    return Promise.resolve(cachedEntry.data as T);
  }
  
  // Sinon, on fait la requête et on met en cache
  return fetchFn().then(data => {
    requestCache.set(key, {
      data,
      timestamp: now,
      key
    });
    return data;
  });
}

// Nettoyer le cache périodiquement pour éviter les fuites mémoire
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requestCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL * 2) {
      requestCache.delete(key);
    }
  }
}, CACHE_TTL * 5); // Nettoyage toutes les 25 secondes

const getToken = (): string => {
  const token = document.cookie
    .split("; ")
    .find(row => row.startsWith("auth-token="))
    ?.split("=")[1]

  if (!token) {
    throw new Error("Pas de token")
  }

  return token
}

// Fonction pour calculer les dates de début et fin
export const calculateDateRange = (period: TimePeriod, timeOffset: number = 0): { startDate: Date, endDate: Date } => {
  // Date de fin: maintenant + décalage (positif ou négatif)
  const endDate = new Date()
  if (timeOffset !== 0) {
    // Le décalage est en heures directement
    endDate.setHours(endDate.getHours() - timeOffset)
  }
  
  // Date de début: en fonction de la période sélectionnée
  const startDate = new Date(endDate)
  const periodInHours = getPeriodInHours(period)
  startDate.setHours(startDate.getHours() - periodInHours)
  
  return { startDate, endDate }
}

// Map pour suivre les requêtes en cours (éviter les requêtes dupliquées)
const pendingRequests = new Map<string, Promise<CachedDataType>>();

// Fonction utilitaire pour éviter les requêtes en double
async function withDedupe<T extends CachedDataType>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  // Si une requête avec cette clé est déjà en cours, on retourne sa promesse
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }
  
  // Sinon, on lance la requête et on la stocke
  const promise = fetchFn()
    .finally(() => {
      // Une fois terminée (succès ou échec), on la retire de la map
      pendingRequests.delete(key);
    });
  
  pendingRequests.set(key, promise);
  return promise;
}

export const getDevices = async (): Promise<Device[]> => {
  const token = getToken();
  const cacheKey = 'devices';
  
  return withCache<Device[]>(cacheKey, () => 
    withDedupe<Device[]>(cacheKey, async () => {
      const response = await fetch('/api/devices', {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des devices');
      }

      return response.json();
    })
  );
}

export const getDeviceSensors = async (deviceId: number, period: TimePeriod, timeOffset: number = 0): Promise<SensorWithData[]> => {
  const token = getToken();
  
  // Calculer les dates de début et de fin
  const { startDate, endDate } = calculateDateRange(period, timeOffset);
  
  // Construire l'URL avec les paramètres
  const url = `/api/sensors?startDate=${encodeURIComponent(startDate.toISOString())}&endDate=${encodeURIComponent(endDate.toISOString())}`;
  
  // Clé de cache unique pour cette combinaison de paramètres
  const cacheKey = `sensors:${deviceId}:${period}:${timeOffset}`;
  
  return withCache<SensorWithData[]>(cacheKey, () => 
    withDedupe<SensorWithData[]>(cacheKey, async () => {
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des capteurs');
      }

      const sensorsData = await response.json();
      return sensorsData.filter((sensor: SensorWithData) => sensor.deviceId === deviceId);
    })
  );
}

export const getDevicesWithSensors = async (period: TimePeriod, timeOffset: number = 0): Promise<DeviceType[]> => {
  // Clé de cache pour cette requête spécifique
  const cacheKey = `devicesWithSensors:${period}:${timeOffset}`;
  
  return withCache<DeviceType[]>(cacheKey, () => 
    withDedupe<DeviceType[]>(cacheKey, async () => {
      const devices = await getDevices();
      
      const devicePromises = devices.map(async (device) => {
        const sensors = await getDeviceSensors(device.id, period, timeOffset);
        
        const sensorsWithAlertStatus = sensors.map((sensor) => {
          const latestData = sensor.historicalData[0];
          let isInAlert = false;

          if (latestData) {
            if (sensor.isBinary) {
              isInAlert = latestData.value === 1;
            } else if (sensor.threshold) {
              isInAlert = latestData.value >= sensor.threshold.value;
            }
          }

          return {
            ...sensor,
            isInAlert
          };
        });

        return {
          ...device,
          sensors: sensorsWithAlertStatus
        };
      });

      return Promise.all(devicePromises);
    })
  );
} 