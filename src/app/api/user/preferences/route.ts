import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ErrorCode, handleApiError } from "@/lib/error-utils";
import { TimePeriod } from "@/lib/time-utils";
import { SensorType } from "@prisma/client";

// Schéma de validation des préférences
const preferencesSchema = z.object({
  period: z.enum(['1h', '3h', '6h', '12h', 'day', 'week', 'month'] as [TimePeriod, ...TimePeriod[]]),
  type: z.union([z.literal('all'), z.nativeEnum(SensorType)]),
  alertFilter: z.enum(['all', 'alert']),
  viewMode: z.enum(['grid', 'list']),
  timeOffset: z.number()
});

type UserPreferences = z.infer<typeof preferencesSchema>;

/**
 * Récupère l'utilisateur depuis le token d'authentification
 */
async function getUserFromToken(request: NextRequest): Promise<{ userId: number } | null> {
  const token = request.headers.get("Authorization")?.split(" ")[1];
  
  if (!token) {
    return null;
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as {
      userId: number;
    };
    return { userId: decoded.userId };
  } catch (error) {
    console.error("Erreur lors de la vérification du token:", error);
    return null;
  }
}

/**
 * GET /api/user/preferences
 * Récupère les préférences utilisateur depuis la base de données
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié", code: ErrorCode.AUTHENTICATION },
        { status: 401 }
      );
    }
    
    // Récupérer l'utilisateur avec ses préférences
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        dashboardPeriod: true,
        dashboardViewMode: true,
        dashboardSensorType: true,
        dashboardAlertFilter: true
      }
    });
    
    if (!userData) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé", code: ErrorCode.NOT_FOUND },
        { status: 404 }
      );
    }
    
    // Formater les préférences
    const preferences: UserPreferences = {
      period: userData.dashboardPeriod as TimePeriod,
      viewMode: userData.dashboardViewMode as 'grid' | 'list',
      type: userData.dashboardSensorType as SensorType | 'all',
      alertFilter: userData.dashboardAlertFilter as 'all' | 'alert',
      timeOffset: 0 // Toujours à zéro car non stocké en BD
    };
    
    return NextResponse.json(preferences);
  } catch (error) {
    const errorResponse = handleApiError(error, "GET /api/user/preferences");
    return NextResponse.json(errorResponse.body, { status: errorResponse.status });
  }
}

/**
 * PUT /api/user/preferences
 * Met à jour les préférences utilisateur dans la base de données
 */
export async function PUT(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié", code: ErrorCode.AUTHENTICATION },
        { status: 401 }
      );
    }
    
    // Valider les données
    const body = await request.json();
    const validatedData = preferencesSchema.parse(body);
    
    // Journaliser les préférences reçues pour le débogage
    console.log('Préférences à enregistrer:', JSON.stringify(validatedData));
    
    // Mettre à jour l'utilisateur (sans timeOffset)
    await prisma.user.update({
      where: { id: user.userId },
      data: {
        dashboardPeriod: validatedData.period,
        dashboardViewMode: validatedData.viewMode,
        dashboardSensorType: validatedData.type,
        dashboardAlertFilter: validatedData.alertFilter
      }
    });
    
    return NextResponse.json({ 
      success: true,
      savedPreferences: {
        period: validatedData.period,
        viewMode: validatedData.viewMode,
        type: validatedData.type,
        alertFilter: validatedData.alertFilter
      }
    });
  } catch (error) {
    // Gérer les erreurs de validation Zod
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données non valides", details: error.errors, code: ErrorCode.VALIDATION },
        { status: 400 }
      );
    }
    
    const errorResponse = handleApiError(error, "PUT /api/user/preferences");
    return NextResponse.json(errorResponse.body, { status: errorResponse.status });
  }
} 