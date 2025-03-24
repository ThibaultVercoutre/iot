import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    // Récupérer la période depuis les paramètres de requête
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'day';

    // Calculer la date de début selon la période
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(now.getDate() - 30);
        break;
      case '12h':
        startDate.setHours(now.getHours() - 12);
        break;
      case '6h':
        startDate.setHours(now.getHours() - 6);
        break;
      default: // 'day'
        startDate.setDate(now.getDate() - 1);
    }

    // Récupérer tous les capteurs avec leurs données filtrées par période
    const sensors = await prisma.sensor.findMany({
      where: {
        userId: 1  // Pour l'instant on utilise l'ID fixe
      },
      include: {
        data: {
          where: {
            timestamp: {
              gte: startDate
            }
          },
          orderBy: {
            timestamp: 'asc'
          }
        },
        threshold: true,
        // Inclure uniquement les alertes actives (sans date de fin)
        alertLogs: {
          where: {
            endDataId: null
          },
          include: {
            startData: true,
            endData: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    // S'assurer que les données sont bien formatées
    const formattedSensors = sensors.map(sensor => ({
      ...sensor,
      historicalData: sensor.data.map(data => ({
        id: data.id,
        value: data.value,
        timestamp: data.timestamp.toISOString(),
        sensorId: data.sensorId
      })).reverse(), // Inverser l'ordre pour avoir les plus anciennes en premier
      // Ajouter l'information concernant l'alerte active
      activeAlert: sensor.alertLogs.length > 0 ? {
        id: sensor.alertLogs[0].id,
        startedAt: sensor.alertLogs[0].startData.timestamp.toISOString(),
        sensorValue: sensor.alertLogs[0].startData.value,
        thresholdValue: sensor.alertLogs[0].thresholdValue
      } : null
    }));

    return NextResponse.json(formattedSensors);
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, deviceId, joinEui, devEui, isBinary, threshold } = body;

    // Vérifier que les champs requis sont présents
    if (!name || !type || !deviceId || !joinEui || !devEui) {
      return NextResponse.json(
        { error: 'Tous les champs requis doivent être remplis' },
        { status: 400 }
      );
    }

    // Vérifier que le deviceId, joinEui et devEui sont uniques
    const existingSensor = await prisma.sensor.findFirst({
      where: {
        OR: [
          { deviceId },
          {
            AND: [
              { joinEui },
              { devEui }
            ]
          }
        ]
      }
    });

    if (existingSensor) {
      return NextResponse.json(
        { error: 'Un capteur avec ces identifiants existe déjà' },
        { status: 400 }
      );
    }

    // Créer le capteur
    const sensor = await prisma.sensor.create({
      data: {
        name,
        type,
        deviceId,
        joinEui,
        devEui,
        isBinary,
        userId: 1, // Pour l'instant on utilise l'ID fixe
      },
    });

    // Si un seuil est fourni et que le capteur n'est pas binaire, créer le seuil
    if (!isBinary && threshold) {
      await prisma.threshold.create({
        data: {
          sensorId: sensor.id,
          value: threshold
        }
      });
    }

    return NextResponse.json(sensor);
  } catch (error) {
    console.error('Erreur lors de la création du capteur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du capteur' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 