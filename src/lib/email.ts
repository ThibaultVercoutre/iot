import nodemailer from 'nodemailer';

// Configuration du transporteur SMTP OVH
const transporter = nodemailer.createTransport({
  host: 'ssl0.ovh.net', // ou smtp.ovh.net
  port: 465,
  secure: true, // true pour 465, false pour les autres ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
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
      from: '"Système d\'Alertes" <alerts@dash.web-gine.fr>',
      to: 'sirhyus.jeux@gmail.com',
      subject: `[ALERTE] ${sensorName}`,
      html: `
        <h2>Nouvelle alerte détectée</h2>
        <p>Le capteur <strong>${sensorName}</strong> a déclenché une alerte.</p>
        <p><strong>Valeur actuelle :</strong> ${formattedValue}</p>
        <p><strong>Date et heure :</strong> ${timestamp.toLocaleString('fr-FR')}</p>
        <p>Connectez-vous à votre tableau de bord pour plus de détails : <a href="https://dash.web-gine.fr/dashboard">https://dash.web-gine.fr/dashboard</a></p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email d'alerte envoyé à ${to}`);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
  }
} 