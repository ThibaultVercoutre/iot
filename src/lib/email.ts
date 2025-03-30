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
transporter.verify(function(error, success) {
  if (error) {
    console.error('Erreur de connexion SMTP:', error);
  } else {
    console.log('Serveur SMTP prêt à envoyer des messages');
  }
});

export async function sendAlertEmail(
  to: string,
  sensorName: string,
  value: number,
  thresholdValue: number | null,
  timestamp: Date
) {
  try {
    const formattedValue = thresholdValue !== null 
      ? `${value} (Seuil: ${thresholdValue})`
      : value.toString();

    const mailOptions = {
      from: `"Système d'Alertes" <${smtpConfig.user}>`,
      to,
      subject: `[ALERTE] ${sensorName}`,
      html: `
        <h2>Nouvelle alerte détectée</h2>
        <p>Le capteur <strong>${sensorName}</strong> a déclenché une alerte.</p>
        <p><strong>Valeur actuelle :</strong> ${formattedValue}</p>
        <p><strong>Date et heure :</strong> ${timestamp.toLocaleString('fr-FR')}</p>
        <p>Connectez-vous à votre tableau de bord pour plus de détails : <a href="https://dash.web-gine.fr/dashboard">https://dash.web-gine.fr/dashboard</a></p>
      `,
    };

    console.log('Tentative d\'envoi d\'email à:', to);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email d'alerte envoyé à ${to}:`, info.response);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
  }
} 