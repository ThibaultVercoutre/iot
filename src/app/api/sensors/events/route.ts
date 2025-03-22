import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SensorUpdate {
  type: 'sensor_update';
  sensorId: number;
  value: number;
  timestamp: string;
}

// Garder en mémoire les dernières valeurs envoyées
const lastSentValues = new Map<number, { value: number; timestamp: number }>();

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Fonction pour envoyer un événement au client
  const sendEvent = async (data: SensorUpdate) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  // Vérifier les mises à jour toutes les 5 secondes
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
          const lastSent = lastSentValues.get(sensor.id);
          const latestTimestamp = new Date(latestData.timestamp).getTime();
          
          // Vérifier si les données ont changé
          if (!lastSent || 
              lastSent.value !== latestData.value || 
              lastSent.timestamp < latestTimestamp) {
            
            console.log('Comparaison:', {
              lastSentValue: lastSent?.value,
              newValue: latestData.value,
              lastSentTimestamp: lastSent?.timestamp,
              newTimestamp: latestTimestamp
            });
            
            const update = {
              type: 'sensor_update' as const,
              sensorId: sensor.id,
              value: latestData.value,
              timestamp: latestData.timestamp.toISOString()
            };
            
            console.log('Nouvelles données détectées:', update);
            await sendEvent(update);
            
            // Mettre à jour les dernières valeurs envoyées
            lastSentValues.set(sensor.id, {
              value: latestData.value,
              timestamp: latestTimestamp
            });
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des mises à jour:', error);
    }
  }, 1000);

  // Nettoyer l'intervalle quand la connexion est fermée
  request.signal.addEventListener('abort', () => {
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