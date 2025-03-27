import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
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

    // Récupérer les devices de l'utilisateur
    const userDevices = await prisma.device.findMany({
      where: { userId: decoded.userId },
      select: { id: true }
    });

    const deviceIds = userDevices.map(device => device.id);

    // Récupérer les capteurs des devices de l'utilisateur
    const userSensors = await prisma.sensor.findMany({
      where: { deviceId: { in: deviceIds } },
      select: { id: true }
    });

    const sensorIds = userSensors.map(sensor => sensor.id);

    // Récupérer les alertes des capteurs de l'utilisateur
    const alerts = await prisma.alertLog.findMany({
      where: {
        sensorId: { in: sensorIds }
      },
      include: {
        sensor: {
          select: {
            name: true,
            type: true,
            isBinary: true
          }
        },
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
      },
      orderBy: {
        startData: {
          timestamp: 'desc'
        }
      }
    });

    // Formater les données pour correspondre à l'interface AlertLog
    const formattedAlerts = alerts.map(alert => ({
      id: alert.id,
      startedAt: alert.startData.timestamp.toISOString(),
      endedAt: alert.endData?.timestamp.toISOString() || null,
      duration: alert.endData 
        ? Math.round((alert.endData.timestamp.getTime() - alert.startData.timestamp.getTime()) / 1000)
        : null,
      sensorValue: alert.startData.value,
      thresholdValue: alert.thresholdValue,
      isActive: alert.endData === null,
      sensor: {
        id: alert.sensorId,
        name: alert.sensor.name,
        type: alert.sensor.type,
        isBinary: alert.sensor.isBinary
      }
    }));

    return NextResponse.json(formattedAlerts);
  } catch (error) {
    console.error("Erreur lors de la récupération des alertes:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des alertes" },
      { status: 500 }
    );
  }
} 