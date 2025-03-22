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