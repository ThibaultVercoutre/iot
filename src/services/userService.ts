import { getToken } from "@/services/authService";
import { SensorType } from "@prisma/client";
import { getDevicesWithSensors } from "@/services/deviceService";
import { User } from "@/types/sensors";

// Interface pour le capteur d'alerte avec des informations sur son appareil
export interface AlertSensor {
  id: number;
  name: string;
  type: SensorType;
  device: {
    id: number;
    name: string;
  };
}

// Interface pour la réponse des API liées au capteur d'alerte
export interface AlertSensorResponse {
  alertSensorId: number | null;
  alertsEnabled: boolean;
  alertSensor: AlertSensor | null;
}

/**
 * Récupère le capteur d'alerte actuel de l'utilisateur
 */
export const getAlertSensor = async (): Promise<AlertSensorResponse> => {
  const token = getToken();
  
  if (!token) {
    throw new Error("Authentification requise");
  }

  const response = await fetch(`/api/user/alert-sensor`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erreur lors de la récupération du capteur d'alerte");
  }

  return await response.json();
};

/**
 * Met à jour le capteur d'alerte de l'utilisateur
 * @param alertSensorId L'ID du capteur à définir comme capteur d'alerte (null pour désactiver)
 */
export const updateAlertSensor = async (alertSensorId: number | null): Promise<AlertSensorResponse> => {
  const token = getToken();
  
  if (!token) {
    throw new Error("Authentification requise");
  }

  const response = await fetch(`/api/user/alert-sensor`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ alertSensorId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erreur lors de la mise à jour du capteur d'alerte");
  }

  return await response.json();
};

/**
 * Met à jour l'état d'activation des alertes de l'utilisateur
 * @param enabled Le nouvel état des alertes (true = activées, false = désactivées)
 * @returns L'utilisateur mis à jour
 */
export const updateAlertsEnabled = async (enabled: boolean): Promise<User> => {
  const token = getToken();
  
  if (!token) {
    throw new Error("Authentification requise");
  }

  const response = await fetch(`/api/user`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ alertsEnabled: enabled }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erreur lors de la mise à jour de l'état des alertes");
  }

  return await response.json();
};

/**
 * Récupère tous les capteurs disponibles pour l'utilisateur, avec leur appareil associé
 * @returns Liste de tous les capteurs disponibles avec leurs appareils
 */
export const getAllSensorsWithDevices = async (): Promise<AlertSensor[]> => {
  // Récupérer tous les appareils avec leurs capteurs
  const devices = await getDevicesWithSensors("day", 0);
  
  // Transformer en liste plate de capteurs avec leurs appareils
  const allSensors: AlertSensor[] = [];
  
  devices.forEach(device => {
    device.sensors.forEach(sensor => {
      allSensors.push({
        id: sensor.id,
        name: sensor.name,
        type: sensor.type,
        device: {
          id: device.id,
          name: device.name
        }
      });
    });
  });
  
  return allSensors;
}; 