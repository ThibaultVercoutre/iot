import nodemailer from 'nodemailer';
import { smtpConfig } from './smtp-config';

// Configuration du transporteur SMTP OVH
console.log('SMTP User:', smtpConfig.user);
console.log('SMTP Password presence:', smtpConfig.password ? 'Password is set' : 'Password is missing');

if (!smtpConfig.user || !smtpConfig.password) {
  console.error('⚠️ Les identifiants SMTP ne sont pas définis dans la configuration');
}

const transporter = nodemailer.createTransport({
  host: smtpConfig.host,
  port: smtpConfig.port,
  secure: smtpConfig.secure,
  auth: {
    user: smtpConfig.user,
    pass: smtpConfig.password,
  },
  debug: true, // Show debug output
});

// Vérifier la connexion à la création
transporter.verify(function(error) {
  if (error) {
    console.error('Erreur de connexion SMTP:', error);
  } else {
    console.log('Serveur SMTP prêt à envoyer des messages');
  }
});

// Email de secours en cas d'email invalide
const FALLBACK_EMAIL = 'sirhyus.jeux@gmail.com';

// Fonction pour vérifier si un email semble valide
function isValidEmail(email: string): boolean {
  if (!email) return false;
  
  // Vérification de base par regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  
  // Domaines connus pour ne pas accepter d'emails
  const invalidDomains = ['example.com', 'test.com', 'localhost'];
  const domain = email.split('@')[1].toLowerCase();
  
  return !invalidDomains.includes(domain);
}

// Fonction pour obtenir l'email destinataire valide
function getValidEmailOrFallback(email: string): string {
  if (isValidEmail(email)) {
    return email;
  }
  console.warn(`Email invalide: "${email}", utilisation de l'email de secours: ${FALLBACK_EMAIL}`);
  return FALLBACK_EMAIL;
}

export async function sendAlertEmail(
  to: string,
  sensorName: string,
  value: number,
  thresholdValue: number | null,
  timestamp: Date
) {
  try {
    // Utiliser l'email valide ou l'email de secours
    const validEmail = getValidEmailOrFallback(to);
    
    const formattedValue = thresholdValue !== null 
      ? `${value} (Seuil: ${thresholdValue})`
      : value.toString();

    const mailOptions = {
      from: `"Système d'Alertes" <${smtpConfig.user}>`,
      to: validEmail,
      subject: `[ALERTE] ${sensorName}`,
      html: `
        <h2>Nouvelle alerte détectée</h2>
        <p>Le capteur <strong>${sensorName}</strong> a déclenché une alerte.</p>
        <p><strong>Valeur actuelle :</strong> ${formattedValue}</p>
        <p><strong>Date et heure :</strong> ${timestamp.toLocaleString('fr-FR')}</p>
        <p>Connectez-vous à votre tableau de bord pour plus de détails : <a href="https://dash.web-gine.fr/dashboard">https://dash.web-gine.fr/dashboard</a></p>
      `,
    };

    console.log('Tentative d\'envoi d\'email à:', validEmail);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email d'alerte envoyé à ${validEmail}:`, info.response);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
  }
} 