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

// Structure pour les informations d'alerte de capteur
export interface SensorAlertInfo {
  sensorName: string;
  value: number;
  thresholdValue: number | null;
  timestamp: Date;
}

// Map pour suivre les alertes groupées par utilisateur
// Clé: email utilisateur, Valeur: tableau d'infos d'alerte
const pendingAlerts = new Map<string, SensorAlertInfo[]>();

// Délai en ms entre les emails (30 secondes)
const EMAIL_THROTTLE_DELAY = 30 * 1000;

// Map pour suivre le dernier envoi d'email par utilisateur
const lastSentEmails = new Map<string, number>();

/**
 * Ajoute une alerte à la file d'attente et envoie un email si nécessaire
 */
export async function queueAlertEmail(
  to: string,
  sensorName: string,
  value: number,
  thresholdValue: number | null,
  timestamp: Date
) {
  const validEmail = getValidEmailOrFallback(to);
  
  // Créer l'info d'alerte
  const alertInfo: SensorAlertInfo = {
    sensorName,
    value,
    thresholdValue,
    timestamp
  };
  
  // Ajouter l'alerte à la file d'attente pour cet utilisateur
  if (!pendingAlerts.has(validEmail)) {
    pendingAlerts.set(validEmail, []);
  }
  pendingAlerts.get(validEmail)!.push(alertInfo);
  
  // Vérifier quand le dernier email a été envoyé à cet utilisateur
  const now = Date.now();
  const lastSent = lastSentEmails.get(validEmail) || 0;
  
  // Si le délai est écoulé, envoyer immédiatement
  if (now - lastSent > EMAIL_THROTTLE_DELAY) {
    await sendQueuedAlerts(validEmail);
  } else {
    // Sinon, programmer l'envoi après le délai
    console.log(`Email retardé pour ${validEmail}, il sera envoyé après le délai de limitation`);
    setTimeout(() => {
      sendQueuedAlerts(validEmail);
    }, EMAIL_THROTTLE_DELAY - (now - lastSent));
  }
}

/**
 * Envoie toutes les alertes en attente pour un utilisateur
 */
async function sendQueuedAlerts(email: string) {
  if (!pendingAlerts.has(email) || pendingAlerts.get(email)!.length === 0) {
    return;
  }
  
  try {
    const alerts = pendingAlerts.get(email)!;
    pendingAlerts.set(email, []); // Vider la file d'attente
    lastSentEmails.set(email, Date.now()); // Mettre à jour le timestamp
    
    const alertCount = alerts.length;
    const alertsHtml = alerts.map(alert => {
      const formattedValue = alert.thresholdValue !== null 
        ? `${alert.value} (Seuil: ${alert.thresholdValue})`
        : alert.value.toString();
        
      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${alert.sensorName}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formattedValue}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${alert.timestamp.toLocaleString('fr-FR')}</td>
        </tr>
      `;
    }).join('');
    
    const mailOptions = {
      from: `"Système d'Alertes" <${smtpConfig.user}>`,
      to: email,
      subject: `[ALERTE] ${alertCount} capteur${alertCount > 1 ? 's' : ''} en alerte`,
      html: `
        <h2>${alertCount} capteur${alertCount > 1 ? 's ont' : ' a'} déclenché une alerte</h2>
        <p>Les capteurs suivants ont déclenché des alertes :</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Capteur</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Valeur</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Date et heure</th>
            </tr>
          </thead>
          <tbody>
            ${alertsHtml}
          </tbody>
        </table>
        
        <p>Connectez-vous à votre tableau de bord pour plus de détails : <a href="https://dash.web-gine.fr/dashboard">https://dash.web-gine.fr/dashboard</a></p>
      `,
    };

    console.log(`Tentative d'envoi d'email groupé à ${email} pour ${alertCount} capteur(s)`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email d'alerte groupé envoyé à ${email}:`, info.response);
  } catch (error) {
    console.error(`Erreur lors de l'envoi de l'email groupé à ${email}:`, error);
  }
}

// Fonction d'envoi d'email individuel (maintenue pour rétrocompatibilité)
export async function sendAlertEmail(
  to: string,
  sensorName: string,
  value: number,
  thresholdValue: number | null,
  timestamp: Date
) {
  // Déléguer à la nouvelle fonction de file d'attente
  await queueAlertEmail(to, sensorName, value, thresholdValue, timestamp);
} 