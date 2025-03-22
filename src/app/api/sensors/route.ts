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
        }
      }
    });

    // Formater les données pour le front
    const formattedSensors = sensors.map(sensor => ({
      id: sensor.id,
      name: sensor.name,
      type: sensor.type,
      lastValue: sensor.data[0]?.value ?? 0,
      lastUpdate: sensor.data[0]?.timestamp ?? null,
      historicalData: sensor.data.map(data => ({
        value: data.value,
        timestamp: data.timestamp
      })).reverse() // Pour avoir les données dans l'ordre chronologique
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