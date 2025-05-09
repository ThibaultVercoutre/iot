import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendMultipleAlertsEmail } from '@/lib/email';
import { sendSocketMessage } from '@/lib/socket-utils';

const prisma = new PrismaClient();

// Fonction pour parser la date TTN
function parseTTNDate(dateString: string): Date {
  if (!dateString) {
    return new Date(); // Utiliser la date actuelle si pas de date fournie
  }

  try {
    // Supprimer les nanosecondes (tout ce qui est après les millisecondes)
    const simplifiedDate = dateString.replace(/\.\d{6,}Z$/, 'Z');
    const date = new Date(simplifiedDate);
    
    if (isNaN(date.getTime())) {
      return new Date(); // Utiliser la date actuelle si la date est invalide
    }
    
    return date;
  } catch (error) {
    console.warn(`Erreur lors du parsing de la date: ${dateString}`, error);
    return new Date(); // Utiliser la date actuelle en cas d'erreur
  }
}

interface TTNPayload {
  end_device_ids: {
    device_id: string;
    application_ids: {
      application_id: string;
    };
    join_eui: string;
    dev_eui: string;
  };
  uplink_message: {
    frm_payload: string;
    decoded_payload?: {
      [key: string]: number;
    };
    received_at: string;
  };
}

export async function POST(request: Request) {
  try {
    const data: TTNPayload = await request.json();
    console.log(data);
    const authHeader = request.headers.get('Authorization');
    console.log(authHeader);

    const applicationId = data.end_device_ids.application_ids.application_id;
    const joinEui = data.end_device_ids.join_eui;
    const devEui = data.end_device_ids.dev_eui;
    const maintenance = data.uplink_message.decoded_payload?.maintenance;

    // Trouver le device associé à ce join_eui et dev_eui
    const device = await prisma.device.findFirst({
      where: {
        joinEui: joinEui,
        devEui: devEui,
        user: {
          ttnId: applicationId
        }
      },
      include: {
        sensors: {
          include: {
            threshold: true
          }
        },
        user: true
      }
    });

    if (maintenance == device?.user?.alertsEnabled) {
      // Mettre à jour l'état des alertes de l'utilisateur
      await prisma.user.update({
        where: {
          id: device?.userId
        },
        data: {
          alertsEnabled: maintenance === 0
        }
      });

      // Informer les clients connectés du changement d'état des alertes
      if (device?.userId) {
        sendSocketMessage(String(device.userId), {
          type: 'ALERTS_STATUS_CHANGED',
          alertsEnabled: maintenance === 0
        });
      }

      return NextResponse.json({ 
        message: `État des alertes mis à jour: ${maintenance === 0 ? 'activées' : 'désactivées'}`
      });
    }

    if (!device) {
      console.warn(`Aucun device trouvé pour le join_eui: ${joinEui} et dev_eui: ${devEui}`);
      return NextResponse.json({ 
        message: 'Aucun device correspondant trouvé',
        joinEui,
        devEui
      }, { status: 404 });
    }

    if (!data.uplink_message.decoded_payload) {
      return NextResponse.json(
        { error: "Données décodées manquantes" },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur une seule fois
    const user = device.user;
    if (!user) {
      console.warn(`Utilisateur non trouvé pour le device ${device.id}`);
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const alertsEnabled = user.alertsEnabled ?? true;
    
    // Collecter toutes les alertes dans cette requête
    const newAlerts = [];
    let sensorsUpdated = false;
    const timestamp = data.uplink_message?.received_at 
      ? parseTTNDate(data.uplink_message.received_at)
      : new Date();

    // Traiter chaque valeur dans le payload décodé
    for (const [sensorUniqueId, value] of Object.entries(data.uplink_message.decoded_payload)) {
      const sensor = device.sensors.find(s => s.uniqueId === sensorUniqueId);
      
      if (!sensor) {
        console.warn(`Aucun capteur trouvé pour l'ID unique: ${sensorUniqueId}`);
        continue;
      }

      sensorsUpdated = true;

      // Créer l'entrée dans la base de données
      const sensorData = await prisma.sensorData.create({
        data: {
          value: Number(value),
          sensorId: sensor.id,
          timestamp
        }
      });

      console.log(`Donnée enregistrée pour le capteur ${sensor.name}: ${value}`);

      // Si c'est le capteur qui contrôle les alertes (bouton)
      if (user.alertSensorId === sensor.id) {
        // Si le bouton est pressé (valeur = 1), inverser l'état des alertes
        if (value === 1) {
          await prisma.user.update({
            where: { id: user.id },
            data: { alertsEnabled: !alertsEnabled }
          });
          console.log(`État des alertes mis à jour pour l'utilisateur ${user.id}: ${!alertsEnabled}`);
          continue; // Pas besoin de créer une alerte pour le bouton lui-même
        }
      }

      // Vérifier s'il existe une alerte active pour ce capteur
      const activeAlert = await prisma.alertLog.findFirst({
        where: {
          sensorId: sensor.id,
          endDataId: null
        }
      });

      // Pour les capteurs binaires
      if (sensor.isBinary) {
        if (value === 1 && !activeAlert) {
          // Créer une nouvelle alerte
          await prisma.alertLog.create({
            data: {
              sensorId: sensor.id,
              startDataId: sensorData.id,
              thresholdValue: 1
            }
          });
          console.log(`Nouvelle alerte créée pour ${sensor.name}: ${value}`);

          // Ajouter à la liste des nouvelles alertes
          newAlerts.push({
            sensorName: sensor.name,
            value: Number(value),
            thresholdValue: null,
            timestamp
          });
        }
        // Ajouter la gestion de la fin d'alerte quand la valeur revient à 0
        else if (value === 0 && activeAlert) {
          // Mettre à jour l'alerte existante
          await prisma.alertLog.update({
            where: { id: activeAlert.id },
            data: {
              endDataId: sensorData.id
            }
          });
          console.log(`Alerte terminée pour ${sensor.name}: ${value}`);
        }
      }
      // Pour les capteurs numériques avec seuil
      else if (sensor.threshold) {
        const thresholdValue = sensor.threshold.value;
        
        // Cas où le seuil est dépassé et pas d'alerte active
        if (value >= thresholdValue && !activeAlert) {
          // Créer une nouvelle alerte
          await prisma.alertLog.create({
            data: {
              sensorId: sensor.id,
              startDataId: sensorData.id,
              thresholdValue: thresholdValue
            }
          });
          console.log(`Nouvelle alerte créée pour ${sensor.name}: ${value} >= ${thresholdValue}`);

          // Ajouter à la liste des nouvelles alertes
          newAlerts.push({
            sensorName: sensor.name,
            value: Number(value),
            thresholdValue,
            timestamp
          });
        }
        // Cas où la valeur revient sous le seuil et il existe une alerte active
        else if (value < thresholdValue && activeAlert) {
          // Mettre à jour l'alerte existante
          await prisma.alertLog.update({
            where: { id: activeAlert.id },
            data: {
              endDataId: sensorData.id
            }
          });
          console.log(`Alerte terminée pour ${sensor.name}: ${value} < ${thresholdValue}`);
        }
      }
    }

    // Si des alertes ont été déclenchées, envoyer un email groupé
    if (newAlerts.length > 0 && alertsEnabled) {
      console.log(`Envoi d'un email pour ${newAlerts.length} capteurs en alerte`);
      // Envoi direct de toutes les alertes en un seul email
      await sendMultipleAlertsEmail(user.email, newAlerts);
      
      // Informer les clients connectés des nouvelles alertes
      sendSocketMessage(String(user.id), {
        type: 'NEW_ALERTS',
        alerts: newAlerts
      });
    }
    
    // Si des capteurs ont été mis à jour, informer les clients
    if (sensorsUpdated) {
      // Récupérer les données à jour pour les envoyer au client
      const updatedDevice = await prisma.device.findUnique({
        where: { id: device.id },
        include: {
          sensors: {
            include: {
              historicalData: {
                orderBy: { timestamp: 'desc' },
                take: 1
              },
              threshold: true
            }
          }
        }
      });
      
      if (updatedDevice) {
        sendSocketMessage(String(user.id), {
          type: 'SENSORS_UPDATED',
          device: updatedDevice
        });
      }
    }

    return NextResponse.json({ 
      message: 'Données enregistrées avec succès',
      alertsCreated: newAlerts.length
    }, { status: 200 });

  } catch (error) {
    console.error('Erreur lors du traitement des données:', error);
    return NextResponse.json({ 
      error: 'Erreur lors du traitement des données',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
} 