import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Récupérer tous les capteurs avec leur dernière valeur
    const sensors = await prisma.sensor.findMany({
      where: {
        userId: 1  // Pour l'instant on utilise l'ID fixe
      },
      include: {
        data: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 50  // On prend les 50 dernières valeurs pour le graphique
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