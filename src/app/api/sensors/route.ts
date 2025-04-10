import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { SensorData } from "@/types/sensors";
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
    
    // Valider les dates
    let startDate: Date, endDate: Date;
    
    // Si les dates sont fournies, les utiliser
    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      
      // Vérifier que les dates sont valides
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: "Dates invalides" },
          { status: 400 }
        );
      }
    } else {
      // Compatibilité avec l'ancien système (calculer à partir de period)
      const period = searchParams.get("period") || "day";
      endDate = new Date();
      startDate = new Date();
      
      switch (period) {
        case "1h":
          startDate.setHours(startDate.getHours() - 1);
          break;
        case "3h":
          startDate.setHours(startDate.getHours() - 3);
          break;
        case "6h":
          startDate.setHours(startDate.getHours() - 6);
          break;
        case "12h":
          startDate.setHours(startDate.getHours() - 12);
          break;
        case "day":
          startDate.setDate(startDate.getDate() - 1);
          break;
        case "week":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }
    }

    // Récupérer l'utilisateur à partir du token
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "Token d'authentification manquant" },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as {
      userId: number;
    };

    const sensors = await prisma.sensor.findMany({
      where: {
        deviceId: {
          in: await prisma.device.findMany({
            where: { userId: decoded.userId },
            select: { id: true }
          }).then(devices => devices.map(d => d.id))
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

    // Récupérer les dernières valeurs des capteurs
    const lastValues = await prisma.sensor.findMany({
      where: {
        deviceId: {
          in: await prisma.device.findMany({
            where: { userId: decoded.userId },
            select: { id: true }
          }).then(devices => devices.map(d => d.id))
        }
      },
      include: {
        historicalData: {
          orderBy: {
            timestamp: "desc"
          },
          take: 1
        }
      }
    });

    // Limiter le nombre de données historiques à 1440 points maximum par capteur
    const MAX_POINTS = 1440;
    
    // Créer un objet pour stocker les dernières valeurs des capteurs
    const sensorLastValues = new Map<number, SensorData | undefined>();
    
    // Extraire les dernières valeurs des capteurs
    lastValues.forEach(sensor => {
      const lastData = sensor.historicalData[0] ? {
        id: sensor.historicalData[0].id,
        value: sensor.historicalData[0].value,
        timestamp: sensor.historicalData[0].timestamp.toISOString(),
        sensorId: sensor.historicalData[0].sensorId
      } : undefined;
      sensorLastValues.set(sensor.id, lastData);
    });

    // Traiter les capteurs
    sensors.map(sensor => {
      if (sensor.historicalData.length > MAX_POINTS) {
        // Calculer l'intervalle pour garder une répartition équitable
        const interval = Math.floor(sensor.historicalData.length / MAX_POINTS);
        
        // Filtrer les données pour garder que les points à intervalles réguliers
        sensor.historicalData = sensor.historicalData.filter((_, index) => index % interval === 0);
      }
      return sensor;
    });


    // Préparer la réponse avec la structure modifiée
    const response = sensors.map(sensor => ({
      ...sensor,
      lastValue: sensorLastValues.get(sensor.id)
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error("Erreur lors de la récupération des capteurs:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des capteurs" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { name, type, isBinary, deviceId, threshold } = sensorSchema.parse(body);

    // Récupérer l'utilisateur à partir du token
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "Token d'authentification manquant" },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as {
      userId: number;
    };

    // Vérifier que le device appartient à l'utilisateur
    const device = await prisma.device.findFirst({
      where: {
        id: deviceId,
        userId: decoded.userId,
      },
    });

    if (!device) {
      return NextResponse.json(
        { error: "Device non trouvé ou non autorisé" },
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

    const sensor = await prisma.sensor.create({
      data: {
        name,
        type,
        isBinary,
        uniqueId,
        deviceId,
        ...(type === "SOUND" || type === "VIBRATION" ? {
          threshold: {
            create: {
              value: threshold || 80 // Valeur par défaut si non spécifiée
            }
          }
        } : {})
      },
      include: {
        threshold: true
      }
    });

    return NextResponse.json(sensor);
  } catch (error) {
    console.error("Erreur détaillée:", error);
    if (error instanceof z.ZodError) {
      console.error("Erreur de validation:", error.errors);
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Erreur lors de la création du capteur", details: error },
      { status: 500 }
    );
  }
} 