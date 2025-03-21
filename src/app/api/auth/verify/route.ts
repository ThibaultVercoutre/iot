import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function GET(request: Request) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1]
    
    if (!token) {
      return NextResponse.json(
        { error: "Token manquant" },
        { status: 401 }
      )
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    return NextResponse.json({ user: decoded })
  } catch (_error) {
    return NextResponse.json(
      { error: "Token invalide" },
      { status: 401 }
    )
  }
} 