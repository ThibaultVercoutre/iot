import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sensorId = parseInt(id);

    if (isNaN(sensorId)) {
      return NextResponse.json(
        { error: "ID de capteur invalide" },
        { status: 400 }
      );
    }

    // Vérifier que le capteur existe
    const sensor = await prisma.sensor.findUnique({
      where: { id: sensorId }
    });

    if (!sensor) {
      return NextResponse.json(
        { error: "Capteur non trouvé" },
        { status: 404 }
      );
    }

    // Supprimer le capteur et toutes ses données associées
    // Les relations sont configurées en cascade dans le schéma Prisma,
    // donc toutes les données associées seront automatiquement supprimées
    await prisma.sensor.delete({
      where: { id: sensorId }
    });

    return NextResponse.json({ message: "Capteur supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du capteur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du capteur" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 