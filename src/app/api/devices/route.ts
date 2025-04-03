import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
import { z } from "zod"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()

const deviceSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  joinEui: z.string().length(16, "Le Join EUI doit faire 16 caractères"),
  devEui: z.string().length(16, "Le Dev EUI doit faire 16 caractères"),
})

export async function GET() {
  try {
    const devices = await prisma.device.findMany({
      select: {
        id: true,
        name: true,
      },
    })
    return NextResponse.json(devices)
  } catch (error) {
    console.error("Erreur lors de la récupération des devices:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des devices" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("Données reçues:", body)
    
    const { name, joinEui, devEui } = deviceSchema.parse(body)
    console.log("Données validées:", { name, joinEui, devEui })

    // Récupérer l'utilisateur à partir du token
    const token = request.headers.get("Authorization")?.split(" ")[1]
    if (!token) {
      console.log("Token manquant")
      return NextResponse.json(
        { error: "Token d'authentification manquant" },
        { status: 401 }
      )
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as {
      userId: number
    }
    console.log("Token décodé:", decoded)

    // Vérifier si le device existe déjà
    const existingDevice = await prisma.device.findFirst({
      where: {
        joinEui,
        devEui,
      },
    })

    if (existingDevice) {
      console.log("Device déjà existant:", existingDevice)
      return NextResponse.json(
        { 
          error: "Un device avec ce Join EUI et Dev EUI existe déjà",
          details: "La combinaison Join EUI / Dev EUI doit être unique"
        },
        { status: 409 }
      )
    }

    const device = await prisma.device.create({
      data: {
        name,
        joinEui,
        devEui,
        userId: decoded.userId,
      },
    })
    console.log("Device créé:", device)

    return NextResponse.json(device)
  } catch (error: unknown) {
    console.error("Erreur détaillée lors de la création du device:", error)
    if (error instanceof z.ZodError) {
      console.error("Erreur de validation:", error.errors)
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      )
    }
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { 
          error: "Un device avec ce Join EUI et Dev EUI existe déjà",
          details: "La combinaison Join EUI / Dev EUI doit être unique"
        },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: "Erreur lors de la création du device", details: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 500 }
    )
  }
} 