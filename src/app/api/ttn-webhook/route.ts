import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Afficher les données reçues dans la console
    console.log('Données reçues de TTN:', JSON.stringify(data, null, 2));
    
    // Retourner une réponse de succès
    return NextResponse.json({ 
      message: 'Données reçues avec succès',
      received: true 
    }, { status: 200 });
    
  } catch (error) {
    console.error('Erreur lors du traitement des données:', error);
    return NextResponse.json({ 
      message: 'Erreur lors du traitement des données',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
} 