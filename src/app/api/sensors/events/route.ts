import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SensorUpdate {
  type: 'sensor_update';
  sensorId: number;
  value: number;
  timestamp: Date;
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Fonction pour envoyer un événement au client
  const sendEvent = async (data: SensorUpdate) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  // Fonction pour récupérer les dernières données d'un capteur
  const getLatestData = async (sensorId: number) => {
    const data = await prisma.sensorData.findFirst({
      where: { sensorId },
      orderBy: { timestamp: 'desc' }
    });
    return data;
  };

  // Écouter les changements dans la base de données
  const checkForUpdates = async () => {
    const sensors = await prisma.sensor.findMany({
      where: { userId: 1 },
      include: {
        data: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    for (const sensor of sensors) {
      const latestData = await getLatestData(sensor.id);
      if (latestData) {
        await sendEvent({
          type: 'sensor_update',
          sensorId: sensor.id,
          value: latestData.value,
          timestamp: latestData.timestamp
        });
      }
    }
  };

  // Vérifier les mises à jour toutes les 2 secondes
  const interval = setInterval(checkForUpdates, 2000);

  // Nettoyer l'intervalle quand la connexion est fermée
  request.signal.addEventListener('abort', () => {
    clearInterval(interval);
    writer.close();
  });

  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
} 