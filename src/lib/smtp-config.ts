export const smtpConfig = {
  host: 'ssl0.ovh.net', // ou smtp.ovh.net
  port: 587,
  secure: false, // false pour le port 587 avec STARTTLS
  user: process.env.SMTP_USER || 'dash@web-gine.fr',
  password: process.env.SMTP_PASSWORD || 'UfZ99sf0r0cbP2',
}; 