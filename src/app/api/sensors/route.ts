import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { SensorData } from "@/types/sensors";
import { handleApiError, ErrorCode } from "@/lib/error-utils";
import { calculateDateRange } from "@/lib/date-utils";
import { TimePeriod } from "@/lib/time-utils";

const prisma = new PrismaClient();

// Fonction pour générer un ID unique court
function generateShortId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Schéma de validation pour la création de capteur
const sensorSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  type: z.enum(["SOUND", "VIBRATION", "BUTTON"]),
  isBinary: z.boolean(),
  deviceId: z.number().int().positive("Le device est requis"),
  threshold: z.number().nullable(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const periodParam = searchParams.get("period");
    const timeOffsetParam = searchParams.get("timeOffset");
    
    // Déterminer les dates de début et de fin
    let startDate: Date, endDate: Date;
    
    // Si les dates sont fournies directement, les utiliser
    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      
      // Vérifier que les dates sont valides
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: "Dates invalides", code: ErrorCode.VALIDATION },
          { status: 400 }
        );
      }
    } else {
      // Sinon, calculer à partir de period et timeOffset
      const period = periodParam || "day";
      const timeOffset = timeOffsetParam ? parseInt(timeOffsetParam, 10) : 0;
      
      // Utiliser notre fonction utilitaire
      const dateRange = calculateDateRange(period as TimePeriod, timeOffset);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    }

    // Récupérer l'utilisateur à partir du token
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "Token d'authentification manquant", code: ErrorCode.AUTHENTICATION },
        { status: 401 }
      );
    }

    // Vérifier le token
    let userId: number;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as {
        userId: number;
      };
      userId = decoded.userId;
    } catch (tokenError) {
      return NextResponse.json(
        { error: "Token invalide", code: ErrorCode.AUTHENTICATION, details: tokenError },
        { status: 401 }
      );
    }

    // Optimisation: Une seule requête Prisma avec relation nested
    const sensors = await prisma.sensor.findMany({
      where: {
        device: {
          userId
        }
      },
      include: {
        historicalData: {
          where: {
            timestamp: {
              gte: startDate,
              lte: endDate
            },
          },
          orderBy: {
            timestamp: "desc",
          },
        },
        threshold: true,
        alertLogs: {
          where: {
            endDataId: null,
          },
          include: {
            startData: {
              select: {
                value: true,
                timestamp: true
              }
            },
            endData: {
              select: {
                value: true,
                timestamp: true
              }
            }
          }
        },
      },
    });

    // Optimisation: Récupérer les dernières valeurs en une seule requête
    const sensorsWithLastValue = await prisma.sensor.findMany({
      where: {
        device: {
          userId
        }
      },
      select: {
        id: true,
        historicalData: {
          orderBy: {
            timestamp: "desc"
          },
          take: 1,
          select: {
            id: true,
            value: true,
            timestamp: true,
            sensorId: true
          }
        }
      }
    });
    
    // Créer un Map pour lookup rapide
    const sensorLastValues = new Map<number, SensorData | undefined>();
    
    // Extraire les dernières valeurs des capteurs
    sensorsWithLastValue.forEach(sensor => {
      const lastData = sensor.historicalData[0] ? {
        id: sensor.historicalData[0].id,
        value: sensor.historicalData[0].value,
        timestamp: sensor.historicalData[0].timestamp.toISOString(),
        sensorId: sensor.historicalData[0].sensorId
      } : undefined;
      sensorLastValues.set(sensor.id, lastData);
    });

    // Constante pour limiter les points
    const MAX_POINTS = 1440;

    // Échantillonnage intelligent des données historiques
    const processedSensors = sensors.map(sensor => {
      if (sensor.historicalData.length > MAX_POINTS) {
        // Méthode d'échantillonnage améliorée
        const segmentSize = sensor.historicalData.length / MAX_POINTS;
        const sampledData = [];
        
        for (let i = 0; i < MAX_POINTS; i++) {
          const startIdx = Math.floor(i * segmentSize);
          const endIdx = Math.floor((i + 1) * segmentSize);
          
          // Si le segment contient des données, prendre le point du milieu
          if (startIdx < sensor.historicalData.length) {
            const midIdx = Math.min(
              Math.floor(startIdx + (endIdx - startIdx) / 2),
              sensor.historicalData.length - 1
            );
            sampledData.push(sensor.historicalData[midIdx]);
          }
        }
        
        // Remplacer les données historiques par l'échantillon
        sensor.historicalData = sampledData;
      }
      return {
        ...sensor,
        lastValue: sensorLastValues.get(sensor.id)
      };
    });

    return NextResponse.json(processedSensors);
  } catch (error) {
    const errorResponse = handleApiError(error, "GET /api/sensors");
    return NextResponse.json(errorResponse, { status: errorResponse.status });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Valider les données avec Zod
    const validatedData = sensorSchema.parse(body);
    const { name, type, isBinary, deviceId, threshold } = validatedData;

    // Récupérer l'utilisateur à partir du token
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "Token d'authentification manquant", code: ErrorCode.AUTHENTICATION },
        { status: 401 }
      );
    }

    // Vérifier le token
    let userId: number;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as {
        userId: number;
      };
      userId = decoded.userId;
    } catch (tokenError) {
      return NextResponse.json(
        { error: "Token invalide", code: ErrorCode.AUTHENTICATION, details: tokenError },
        { status: 401 }
      );
    }

    // Vérifier que le device appartient à l'utilisateur
    const device = await prisma.device.findFirst({
      where: {
        id: deviceId,
        userId,
      },
    });

    if (!device) {
      return NextResponse.json(
        { error: "Device non trouvé ou non autorisé", code: ErrorCode.NOT_FOUND },
        { status: 404 }
      );
    }

    // Générer un ID unique court
    let uniqueId = generateShortId();
    
    // Vérifier que l'ID n'existe pas déjà
    let existingSensor = await prisma.sensor.findUnique({
      where: { uniqueId }
    });
    
    // Si l'ID existe déjà, en générer un nouveau jusqu'à en trouver un unique
    while (existingSensor) {
      uniqueId = generateShortId();
      existingSensor = await prisma.sensor.findUnique({
        where: { uniqueId }
      });
    }

    // Utiliser une transaction pour créer le capteur et son seuil en une seule opération atomique
    const sensor = await prisma.$transaction(async (tx) => {
      // Créer le capteur
      const newSensor = await tx.sensor.create({
        data: {
          name,
          type,
          isBinary,
          deviceId,
          uniqueId
        }
      });
      
      // Si un seuil est fourni, le créer
      if (threshold !== null) {
        await tx.threshold.create({
          data: {
            value: threshold,
            sensorId: newSensor.id
          }
        });
      }
      
      // Récupérer le capteur complet avec ses relations
      return tx.sensor.findUnique({
        where: { id: newSensor.id },
        include: {
          threshold: true,
          device: true
        }
      });
    });

    return NextResponse.json(sensor);
  } catch (error) {
    const errorResponse = handleApiError(error, "POST /api/sensors");
    return NextResponse.json(errorResponse, { status: errorResponse.status });
  }
} 