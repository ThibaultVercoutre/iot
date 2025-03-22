import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TTNPayload {
  end_device_ids: {
    device_id: string;
    application_ids: {
      application_id: string;
    };
  };
  received_at: string;
  uplink_message: {
    decoded_payload: {
      button: boolean;
      sound: number;
      vibration: number;
    };
  };
}

export async function POST(request: Request) {
  try {
    const data: TTNPayload = await request.json();
    console.log('Données reçues de TTN:', JSON.stringify(data, null, 2));

    const deviceId = data.end_device_ids.device_id;
    const applicationId = data.end_device_ids.application_ids.application_id;

    // Trouver les capteurs associés à ce device_id
    const sensors = await prisma.sensor.findMany({
      where: {
        deviceId: deviceId,
        user: {
          ttnId: applicationId // Vérifie que l'application_id correspond au ttnId de l'utilisateur
        }
      }
    });

    if (sensors.length === 0) {
      console.warn(`Aucun capteur trouvé pour le device_id: ${deviceId}`);
      return NextResponse.json({ 
        message: 'Aucun capteur correspondant trouvé',
        deviceId 
      }, { status: 404 });
    }

    // Créer les entrées pour chaque type de donnée reçue
    const sensorData = [];
    
    for (const sensor of sensors) {
      let value: number;
      
      switch (sensor.type) {
        case 'SOUND':
          value = data.uplink_message.decoded_payload.sound;
          break;
        case 'VIBRATION':
          value = data.uplink_message.decoded_payload.vibration;
          break;
        case 'BUTTON':
          value = data.uplink_message.decoded_payload.button ? 1 : 0;
          break;
        default:
          continue;
      }

      // Créer l'entrée dans la base de données
      const newData = await prisma.sensorData.create({
        data: {
          value,
          sensorId: sensor.id,
          timestamp: new Date(data.received_at)
        }
      });
      
      sensorData.push(newData);
    }

    return NextResponse.json({ 
      message: 'Données enregistrées avec succès',
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