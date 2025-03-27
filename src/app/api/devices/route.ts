import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
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
    const { name, joinEui, devEui } = deviceSchema.parse(body)

    // Récupérer l'utilisateur à partir du token
    const token = request.headers.get("Authorization")?.split(" ")[1]
    if (!token) {
      return NextResponse.json(
        { error: "Token d'authentification manquant" },
        { status: 401 }
      )
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as {
      userId: number
    }

    const device = await prisma.device.create({
      data: {
        name,
        joinEui,
        devEui,
        userId: decoded.userId,
      },
    })

    return NextResponse.json(device)
  } catch (error) {
    console.error("Erreur lors de la création du device:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Erreur lors de la création du device" },
      { status: 500 }
    )
  }
} 