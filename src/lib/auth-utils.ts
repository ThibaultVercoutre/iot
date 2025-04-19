import jwt from 'jsonwebtoken';

/**
 * Décode et vérifie un token JWT
 * @param token Le token JWT à vérifier
 * @returns Le contenu décodé du token
 */
export async function parseJwtToken(token: string): Promise<{ userId: string; email: string }> {
  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    
    // Vérifier le token
    const decoded = jwt.verify(token, secret) as { userId: string; email: string };
    
    if (!decoded || !decoded.userId) {
      throw new Error('Token invalide ou expiré');
    }
    
    return decoded;
  } catch (error) {
    console.error('Erreur de vérification du token:', error);
    throw new Error('Erreur d\'authentification');
  }
}

/**
 * Génère un token JWT pour un utilisateur
 * @param userId ID de l'utilisateur
 * @param email Email de l'utilisateur
 * @returns Token JWT généré
 */
export function generateJwtToken(userId: string | number, email: string): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  
  // Créer le payload du token
  const payload = {
    userId: String(userId),
    email,
  };
  
  // Générer le token avec une expiration de 7 jours
  return jwt.sign(payload, secret, { expiresIn: '7d' });
} 