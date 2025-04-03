import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendAlertEmail, queueAlertEmail } from '@/lib/email';

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
    console.log('Données reçues de TTN:', JSON.stringify(data, null, 2));

    const applicationId = data.end_device_ids.application_ids.application_id;
    const joinEui = data.end_device_ids.join_eui;
    const devEui = data.end_device_ids.dev_eui;

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
        }
      }
    });

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

    // Traiter chaque valeur dans le payload décodé
    const alertsToProcess = []; // Pour traiter les alertes à la fin

    for (const [sensorUniqueId, value] of Object.entries(data.uplink_message.decoded_payload)) {
      const sensor = device.sensors.find(s => s.uniqueId === sensorUniqueId);
      
      if (!sensor) {
        console.warn(`Aucun capteur trouvé pour l'ID unique: ${sensorUniqueId}`);
        continue;
      }

      const timestamp = data.uplink_message?.received_at 
        ? parseTTNDate(data.uplink_message.received_at)
        : new Date();

      // Créer l'entrée dans la base de données
      const sensorData = await prisma.sensorData.create({
        data: {
          value: Number(value),
          sensorId: sensor.id,
          timestamp
        }
      });

      console.log(`Donnée enregistrée pour le capteur ${sensor.name}: ${value}`);

      // Vérifier si les alertes sont activées pour cet utilisateur
      const user = await prisma.user.findUnique({
        where: { id: device.userId }
      });
      
      if (!user) {
        console.warn(`Utilisateur non trouvé pour le device ${device.id}`);
        continue;
      }

      const alertsEnabled = user.alertsEnabled ?? true;

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
        if (value === 1 && !activeAlert && alertsEnabled) {
          // Créer une nouvelle alerte
          await prisma.alertLog.create({
            data: {
              sensorId: sensor.id,
              startDataId: sensorData.id,
              thresholdValue: 1
            }
          });
          console.log(`Nouvelle alerte créée pour ${sensor.name}: ${value}`);

          // Ajouter à la liste des alertes à traiter
          alertsToProcess.push({
            user,
            sensor,
            value,
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
        if (value >= thresholdValue && !activeAlert && alertsEnabled) {
          // Créer une nouvelle alerte
          await prisma.alertLog.create({
            data: {
              sensorId: sensor.id,
              startDataId: sensorData.id,
              thresholdValue: thresholdValue
            }
          });
          console.log(`Nouvelle alerte créée pour ${sensor.name}: ${value} >= ${thresholdValue}`);

          // Ajouter à la liste des alertes à traiter
          alertsToProcess.push({
            user,
            sensor,
            value,
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

    // Traiter toutes les alertes à la fin pour les grouper par utilisateur
    for (const alert of alertsToProcess) {
      await queueAlertEmail(
        alert.user.email,
        alert.sensor.name,
        alert.value,
        alert.thresholdValue,
        alert.timestamp
      );
    }

    return NextResponse.json({ 
      message: 'Données enregistrées avec succès'
    }, { status: 200 });

  } catch (error) {
    console.error('Erreur lors du traitement des données:', error);
    return NextResponse.json({ 
      error: 'Erreur lors du traitement des données',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
} 