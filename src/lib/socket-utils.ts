// Type pour les informations d'alerte de capteur
export type SensorAlertInfo = {
  sensorName: string;
  value: number;
  thresholdValue: number | null;
  timestamp: Date;
};

// Type pour les messages envoyés par les websockets
export type SocketMessage = {
  type: 'CONNECTION_ESTABLISHED';
  message: string;
} | {
  type: 'ALERTS_STATUS_CHANGED';
  alertsEnabled: boolean;
} | {
  type: 'SENSORS_UPDATED';
  device: Record<string, unknown>;
} | {
  type: 'NEW_ALERTS';
  alerts: SensorAlertInfo[];
};

// Type pour les clients connectés
type ConnectedClient = {
  controller: ReadableStreamDefaultController;
  userId: string;
};

// Map pour stocker les clients connectés par userId
const connectedClients = new Map<string, Set<ConnectedClient>>();

/**
 * Enregistre un nouveau client pour un utilisateur
 */
export function registerClient(userId: string, controller: ReadableStreamDefaultController) {
  if (!connectedClients.has(userId)) {
    connectedClients.set(userId, new Set());
  }
  
  const clientInfo = { controller, userId };
  connectedClients.get(userId)?.add(clientInfo);
  
  console.log(`Client enregistré pour l'utilisateur ${userId}, total: ${connectedClients.get(userId)?.size}`);
}

/**
 * Supprime un client de la liste des connexions
 */
export function removeClient(userId: string) {
  if (connectedClients.has(userId)) {
    console.log(`Suppression du client pour l'utilisateur ${userId}`);
    connectedClients.delete(userId);
  }
}

/**
 * Envoie un message à tous les clients d'un utilisateur spécifique
 */
export function sendSocketMessage(userId: string, data: SocketMessage) {
  const clients = connectedClients.get(userId);
  if (!clients || clients.size === 0) {
    return false;
  }
  
  const encoder = new TextEncoder();
  const payload = encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  
  let sent = false;
  clients.forEach(client => {
    try {
      client.controller.enqueue(payload);
      sent = true;
    } catch (error) {
      console.error(`Erreur d'envoi à l'utilisateur ${userId}:`, error);
      // Supprimer ce client en cas d'erreur
      clients.delete(client);
    }
  });
  
  // Si tous les clients ont été supprimés, retirer l'entrée de la map
  if (clients.size === 0) {
    connectedClients.delete(userId);
  }
  
  return sent;
} 