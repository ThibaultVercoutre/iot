import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { registerClient, removeClient } from '../../../lib/socket-utils';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Récupérer le token soit depuis les query params soit depuis les cookies
    const { searchParams } = new URL(request.url);
    const tokenFromParams = searchParams.get('token');
    
    let tokenFromCookies;
    try {
      const cookieStore = await cookies();
      tokenFromCookies = cookieStore.get('auth-token')?.value;
    } catch (error) {
      console.error('Erreur lors de la récupération des cookies:', error);
    }
    
    const token = tokenFromParams || tokenFromCookies;
    
    if (!token) {
      return new Response('Non autorisé: Token manquant', { status: 401 });
    }
    
    // Vérifier le token
    let userId;
    try {
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, secret) as { userId: string; email: string };
      userId = String(decoded.userId);
      
      if (!userId) {
        return new Response('Token invalide ou expiré', { status: 401 });
      }
    } catch (error) {
      console.error('Erreur de vérification du token:', error);
      return new Response('Token invalide ou expiré', { status: 401 });
    }
    
    // Vérifier que l'utilisateur existe dans la base de données
    const userIdNum = parseInt(userId, 10);
    if (isNaN(userIdNum)) {
      return new Response('ID utilisateur invalide', { status: 400 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userIdNum }
    });
    
    if (!user) {
      return new Response('Utilisateur non trouvé', { status: 404 });
    }
    
    // Créer un flux SSE (Server-Sent Events)
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Enregistrer ce client pour l'utilisateur
        registerClient(userId, controller);
        
        // Envoyer un message de connexion réussie
        const message = {
          type: 'CONNECTION_ESTABLISHED' as const,
          message: 'Connexion en temps réel établie'
        };
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
      },
      cancel() {
        // Supprimer ce client lorsque la connexion est fermée
        removeClient(userId);
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    });
  } catch (error) {
    console.error('Erreur lors de la configuration SSE:', error);
    return new Response('Erreur serveur', { status: 500 });
  }
} 