import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Pour l'instant on utilise l'ID fixe
    const user = await prisma.user.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        alertsEnabled: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Erreur lors de la récupération des données utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données utilisateur' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 