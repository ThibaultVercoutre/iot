import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("API Login - Données reçues:", body)

    const { email, password } = loginSchema.parse(body)
    console.log("API Login - Données validées:", { email, password })

    const user = await prisma.user.findUnique({
      where: { email },
    })

    console.log("API Login - Utilisateur trouvé:", user ? {
      id: user.id,
      email: user.email,
      hasPassword: !!user.password
    } : null)

    if (!user) {
      console.log("API Login - Utilisateur non trouvé")
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      )
    }

    // Vérifier le mot de passe avec bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password)
    console.log("API Login - Mot de passe valide:", isPasswordValid)

    if (!isPasswordValid) {
      console.log("API Login - Mot de passe incorrect")
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      )
    }

    // Créer un token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1d" }
    )
    console.log("API Login - Token généré")

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      token,
    })
  } catch (error) {
    console.error("API Login - Erreur:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Une erreur est survenue" },
      { status: 500 }
    )
  }
} 