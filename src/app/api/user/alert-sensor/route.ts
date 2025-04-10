import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

// Récupérer le capteur d'alerte actuel de l'utilisateur
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

    // Récupérer l'utilisateur avec son capteur d'alerte
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        alertSensorId: true,
        alertsEnabled: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Si l'utilisateur a un capteur d'alerte, récupérer ses informations
    let alertSensor = null;
    if (user.alertSensorId) {
      alertSensor = await prisma.sensor.findUnique({
        where: { id: user.alertSensorId },
        select: {
          id: true,
          name: true,
          type: true,
          device: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
    }

    return NextResponse.json({
      alertSensorId: user.alertSensorId,
      alertsEnabled: user.alertsEnabled,
      alertSensor
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du capteur d'alerte:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du capteur d'alerte" },
      { status: 500 }
    );
  }
}

// Mettre à jour le capteur d'alerte de l'utilisateur
export async function PATCH(request: Request) {
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

    // Récupérer les données du corps de la requête
    const data = await request.json();
    const { alertSensorId } = data;

    // Si un alertSensorId est fourni, vérifier qu'il existe et appartient à l'utilisateur
    if (alertSensorId) {
      const sensor = await prisma.sensor.findFirst({
        where: {
          id: alertSensorId,
          device: {
            userId: decoded.userId
          }
        }
      });

      if (!sensor) {
        return NextResponse.json(
          { error: "Capteur non trouvé ou non autorisé" },
          { status: 404 }
        );
      }
    }

    // Mettre à jour l'utilisateur
    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        alertSensorId: alertSensorId || null
      },
      select: {
        id: true,
        alertSensorId: true,
        alertsEnabled: true
      }
    });

    // Récupérer les informations du capteur d'alerte si défini
    let alertSensor = null;
    if (user.alertSensorId) {
      alertSensor = await prisma.sensor.findUnique({
        where: { id: user.alertSensorId },
        select: {
          id: true,
          name: true,
          type: true,
          device: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
    }

    return NextResponse.json({
      alertSensorId: user.alertSensorId,
      alertsEnabled: user.alertsEnabled,
      alertSensor
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du capteur d'alerte:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du capteur d'alerte" },
      { status: 500 }
    );
  }
} 