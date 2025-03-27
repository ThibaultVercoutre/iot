import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import jwt from "jsonwebtoken";

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
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "day";

    // Calculer la date de début selon la période
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - startDate.getTimezoneOffset() / 60); // Ajuster pour UTC
    
    switch (period) {
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
            startData: true
          }
        },
      },
    });

    return NextResponse.json(sensors);
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
    const { name, type, isBinary, deviceId } = sensorSchema.parse(body);

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
        deviceId
      },
    });

    return NextResponse.json(sensor);
  } catch (error) {
    console.error("Erreur lors de la création du capteur:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Erreur lors de la création du capteur" },
      { status: 500 }
    );
  }
} 