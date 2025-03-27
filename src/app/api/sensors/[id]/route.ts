import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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

    // Vérifier que le capteur appartient à l'utilisateur
    const sensor = await prisma.sensor.findFirst({
      where: {
        id: parseInt(params.id),
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

    // Supprimer d'abord les données associées
    await prisma.$transaction([
      // Supprimer les alertes
      prisma.alertLog.deleteMany({
        where: { sensorId: sensor.id }
      }),
      // Supprimer les données historiques
      prisma.sensorData.deleteMany({
        where: { sensorId: sensor.id }
      }),
      // Supprimer les seuils
      prisma.threshold.deleteMany({
        where: { sensorId: sensor.id }
      }),
      // Supprimer le capteur
      prisma.sensor.delete({
        where: { id: sensor.id }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la suppression du capteur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du capteur" },
      { status: 500 }
    );
  }
} 