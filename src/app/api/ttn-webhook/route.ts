import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TTNPayload {
  end_device_ids: {
    device_id: string;
    application_ids: {
      application_id: string;
    };
    dev_eui: string;
    join_eui: string;
  };
  received_at: string;
  uplink_message: {
    decoded_payload: {
      value: number | boolean;
    };
  };
}

export async function POST(request: Request) {
  try {
    const data: TTNPayload = await request.json();
    console.log('Données reçues de TTN:', JSON.stringify(data, null, 2));

    const deviceId = data.end_device_ids.device_id;
    const applicationId = data.end_device_ids.application_ids.application_id;
    const joinEui = data.end_device_ids.join_eui;
    const devEui = data.end_device_ids.dev_eui;
    const rawValue = data.uplink_message.decoded_payload.value;
    const value = typeof rawValue === 'boolean' ? (rawValue ? 1 : 0) : rawValue;

    // Trouver le capteur associé à ce device_id et join_eui
    const sensor = await prisma.sensor.findFirst({
      where: {
        deviceId: deviceId,
        joinEui: joinEui,
        devEui: devEui,
        user: {
          ttnId: applicationId
        }
      },
      include: {
        threshold: true
      }
    });

    if (!sensor) {
      console.warn(`Aucun capteur trouvé pour le device_id: ${deviceId}, join_eui: ${joinEui} et dev_eui: ${devEui}`);
      return NextResponse.json({ 
        message: 'Aucun capteur correspondant trouvé',
        deviceId,
        joinEui,
        devEui
      }, { status: 404 });
    }

    // Créer l'entrée dans la base de données
    const sensorData = await prisma.sensorData.create({
      data: {
        value: value,
        sensorId: sensor.id,
        timestamp: new Date(data.received_at)
      }
    });

    console.log(`Donnée enregistrée pour le capteur ${sensor.name}: ${value} (${sensor.isBinary ? 'binaire' : 'numérique'})`);

    // Vérifier si les alertes sont activées pour cet utilisateur
    const user = await prisma.user.findUnique({
      where: { id: sensor.userId }
    });
    
    const alertsEnabled = user?.alertsEnabled ?? true;

    // Vérifier s'il existe une alerte active pour ce capteur
    const activeAlert = await prisma.alertLog.findFirst({
      where: {
        sensorId: sensor.id,
        endedAt: null
      }
    });

    // Pour les capteurs binaires
    if (sensor.isBinary) {
      // Cas d'une alerte binaire (valeur = 1) et pas d'alerte active
      if (value === 1 && !activeAlert && alertsEnabled) {
        // Créer une nouvelle alerte
        await prisma.alertLog.create({
          data: {
            sensorId: sensor.id,
            sensorValue: value,
          }
        });
        console.log(`Nouvelle alerte créée pour le capteur binaire ${sensor.name}`);
      } 
      // Cas où l'alerte est terminée (valeur = 0) et il existe une alerte active
      else if (value === 0 && activeAlert) {
        // Fermer l'alerte active
        await prisma.alertLog.update({
          where: { id: activeAlert.id },
          data: { endedAt: new Date() }
        });
        console.log(`Alerte terminée pour le capteur binaire ${sensor.name}`);
      }
    }
    // Pour les capteurs numériques avec seuil
    else if (sensor.threshold) {
      const thresholdValue = sensor.threshold.value;
      
      // Cas où le seuil est dépassé et pas d'alerte active
      if (value > thresholdValue && !activeAlert && alertsEnabled) {
        // Créer une nouvelle alerte
        await prisma.alertLog.create({
          data: {
            sensorId: sensor.id,
            sensorValue: value,
            thresholdValue: thresholdValue
          }
        });
        console.log(`Nouvelle alerte créée pour ${sensor.name}: ${value} > ${thresholdValue}`);
      }
      // Cas où la valeur revient sous le seuil et il existe une alerte active
      else if (value <= thresholdValue && activeAlert) {
        // Fermer l'alerte active
        await prisma.alertLog.update({
          where: { id: activeAlert.id },
          data: { endedAt: new Date() }
        });
        console.log(`Alerte terminée pour ${sensor.name}: ${value} <= ${thresholdValue}`);
      }
    }

    // Si c'est le capteur d'alerte et qu'il a reçu une valeur de 1
    if (user?.alertSensorId === sensor.id && value === 1) {
      // Inverser l'état des alertes
      await prisma.user.update({
        where: { id: user.id },
        data: {
          alertsEnabled: !user.alertsEnabled
        }
      });
      console.log(`État des alertes mis à jour pour l'utilisateur ${user.id}: ${!user.alertsEnabled}`);
    }

    return NextResponse.json({ 
      message: 'Donnée enregistrée avec succès',
      sensorData 
    }, { status: 200 });

  } catch (error) {
    console.error('Erreur lors du traitement des données:', error);
    return NextResponse.json({ 
      error: 'Erreur lors du traitement des données',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 