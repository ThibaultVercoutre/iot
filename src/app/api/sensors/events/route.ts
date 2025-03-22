import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SensorUpdate {
  type: 'sensor_update';
  sensorId: number;
  value: number;
  timestamp: string;
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Fonction pour envoyer un événement au client
  const sendEvent = async (data: SensorUpdate | { type: 'ping' }) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  // Envoyer un ping toutes les 30 secondes pour maintenir la connexion
  const pingInterval = setInterval(async () => {
    await sendEvent({ type: 'ping' });
  }, 30000);

  // Vérifier les mises à jour toutes les secondes
  const checkInterval = setInterval(async () => {
    try {
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
        if (sensor.data && sensor.data.length > 0) {
          const latestData = sensor.data[0];
          await sendEvent({
            type: 'sensor_update',
            sensorId: sensor.id,
            value: latestData.value,
            timestamp: latestData.timestamp.toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des mises à jour:', error);
    }
  }, 1000);

  // Nettoyer les intervalles quand la connexion est fermée
  request.signal.addEventListener('abort', () => {
    clearInterval(pingInterval);
    clearInterval(checkInterval);
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