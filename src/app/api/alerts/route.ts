import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const onlyActive = searchParams.get('active') === 'true';
    const sensorId = searchParams.get('sensorId');

    // Construire la requête de base
    const whereClause = {
      sensor: {
        userId: 1 // Pour l'instant on utilise l'ID fixe
      },
      sensorId: undefined as number | undefined,
      endDataId: undefined as number | null | undefined
    };

    // Filtrer par capteur si spécifié
    if (sensorId) {
      whereClause.sensorId = parseInt(sensorId);
    }

    // Filtrer uniquement les alertes actives si demandé
    if (onlyActive) {
      whereClause.endDataId = null;
    }

    // Récupérer les logs d'alerte avec les infos du capteur
    const alertLogs = await prisma.alertLog.findMany({
      where: whereClause,
      orderBy: {
        startData: {
          timestamp: 'desc'
        }
      },
      take: limit,
      include: {
        sensor: {
          select: {
            id: true,
            name: true,
            type: true,
            isBinary: true
          }
        },
        startData: true,
        endData: true
      }
    });

    // Formater les données pour la réponse API
    const formattedAlertLogs = alertLogs.map(log => ({
      id: log.id,
      startedAt: log.startData.timestamp.toISOString(),
      endedAt: log.endData?.timestamp.toISOString() || null,
      duration: log.endData 
        ? Math.round((log.endData.timestamp.getTime() - log.startData.timestamp.getTime()) / 1000) 
        : null,
      sensorValue: log.startData.value,
      thresholdValue: log.thresholdValue,
      sensor: log.sensor,
      isActive: log.endData === null
    }));

    return NextResponse.json(formattedAlertLogs);
  } catch (error) {
    console.error('Erreur lors de la récupération des alertes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des alertes' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 