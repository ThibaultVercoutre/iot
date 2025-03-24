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
        threshold: true
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
      }))
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