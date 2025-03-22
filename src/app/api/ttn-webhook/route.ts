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
      value: number;
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
    const value = data.uplink_message.decoded_payload.value;

    // Trouver le capteur associé à ce device_id et join_eui
    const sensor = await prisma.sensor.findFirst({
      where: {
        deviceId: deviceId,
        joinEui: joinEui,
        user: {
          ttnId: applicationId
        }
      }
    });

    if (!sensor) {
      console.warn(`Aucun capteur trouvé pour le device_id: ${deviceId} et join_eui: ${joinEui}`);
      return NextResponse.json({ 
        message: 'Aucun capteur correspondant trouvé',
        deviceId,
        joinEui
      }, { status: 404 });
    }

    // Créer l'entrée dans la base de données
    const sensorData = await prisma.sensorData.create({
      data: {
        value,
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