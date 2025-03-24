import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"

const prisma = new PrismaClient()

const thresholdSchema = z.object({
  value: z.number().min(0)
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sensorId = parseInt(params.id)
    
    const threshold = await prisma.threshold.findUnique({
      where: { sensorId }
    })

    return NextResponse.json(threshold)
  } catch (error) {
    console.error("Erreur lors de la récupération du seuil:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération du seuil" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sensorId = parseInt(params.id)
    const body = await request.json()
    const { value } = thresholdSchema.parse(body)

    // Vérifier si le capteur existe
    const sensor = await prisma.sensor.findUnique({
      where: { id: sensorId }
    })

    if (!sensor) {
      return NextResponse.json(
        { error: "Capteur non trouvé" },
        { status: 404 }
      )
    }

    // Créer ou mettre à jour le seuil
    const threshold = await prisma.threshold.upsert({
      where: { sensorId },
      update: { value },
      create: { value, sensorId }
    })

    return NextResponse.json(threshold)
  } catch (error) {
    console.error("Erreur lors de la mise à jour du seuil:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du seuil" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sensorId = parseInt(params.id)
    
    await prisma.threshold.delete({
      where: { sensorId }
    })

    return NextResponse.json({ message: "Seuil supprimé avec succès" })
  } catch (error) {
    console.error("Erreur lors de la suppression du seuil:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du seuil" },
      { status: 500 }
    )
  }
} 