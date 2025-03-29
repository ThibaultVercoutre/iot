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

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        alertsEnabled: true,
        dashboardPeriod: true,
        dashboardViewMode: true,
        dashboardSensorType: true,
        dashboardAlertFilter: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'utilisateur" },
      { status: 500 }
    );
  }
}

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

    // Mettre à jour l'utilisateur
    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        dashboardPeriod: data.dashboardPeriod,
        dashboardViewMode: data.dashboardViewMode,
        dashboardSensorType: data.dashboardSensorType,
        dashboardAlertFilter: data.dashboardAlertFilter
      },
      select: {
        id: true,
        alertsEnabled: true,
        dashboardPeriod: true,
        dashboardViewMode: true,
        dashboardSensorType: true,
        dashboardAlertFilter: true
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Erreur lors de la mise à jour des préférences:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des préférences" },
      { status: 500 }
    );
  }
} 