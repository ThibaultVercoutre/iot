import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    decoded_payload: Record<string, number | boolean>;
  };
}

interface SensorWithThreshold {
  id: number;
  name: string;
  isBinary: boolean;
  uniqueId: string;
  threshold?: { value: number } | null;
}

export async function POST(request: Request) {
  try {
    const data: TTNPayload = await request.json();
    console.log('Données reçues de TTN:', JSON.stringify(data, null, 2));

    // const deviceId = data.end_device_ids.device_id;
    const applicationId = data.end_device_ids.application_ids.application_id;
    const joinEui = data.end_device_ids.join_eui;
    const devEui = data.end_device_ids.dev_eui;
    const payload = data.uplink_message.decoded_payload;

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

    // Traiter chaque valeur dans le payload
    for (const [sensorUniqueId, rawValue] of Object.entries(payload)) {
      const sensor = device.sensors.find((s: SensorWithThreshold) => s.uniqueId === sensorUniqueId);
      
      if (!sensor) {
        console.warn(`Aucun capteur trouvé pour l'ID unique: ${sensorUniqueId}`);
        continue;
      }

      const value = typeof rawValue === 'boolean' ? (rawValue ? 1 : 0) : rawValue;

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
        where: { id: device.userId }
      });
      
      if (!user) {
        console.warn(`Utilisateur non trouvé pour le device ${device.id}`);
        continue;
      }

      const alertsEnabled = user.alertsEnabled ?? true;

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
        }
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
        if (value > thresholdValue && !activeAlert && alertsEnabled) {
          // Créer une nouvelle alerte
          await prisma.alertLog.create({
            data: {
              sensorId: sensor.id,
              startDataId: sensorData.id,
              thresholdValue: thresholdValue
            }
          });
          console.log(`Nouvelle alerte créée pour ${sensor.name}: ${value} > ${thresholdValue}`);
        }
        // Cas où la valeur revient sous le seuil et il existe une alerte active
        else if (value <= thresholdValue && activeAlert) {
          // Mettre à jour l'alerte existante
          await prisma.alertLog.update({
            where: { id: activeAlert.id },
            data: {
              endDataId: sensorData.id
            }
          });
          console.log(`Alerte terminée pour ${sensor.name}: ${value} <= ${thresholdValue}`);
        }
      }

      // Si c'est le capteur d'alerte et qu'il a reçu une valeur de 1
      if (user.alertSensorId === sensor.id && value === 1) {
        // Inverser l'état des alertes
        await prisma.user.update({
          where: { id: user.id },
          data: {
            alertsEnabled: !user.alertsEnabled
          }
        });
        console.log(`État des alertes mis à jour pour l'utilisateur ${user.id}: ${!user.alertsEnabled}`);
      }
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