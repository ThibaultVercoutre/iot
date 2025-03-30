export const smtpConfig = {
  host: 'ssl0.ovh.net', // ou smtp.ovh.net
  port: 465,
  secure: true,
  user: process.env.SMTP_USER || 'dash@web-gine.fr',
  password: process.env.SMTP_PASSWORD || 'votre-mot-de-passe-ici', // À remplacer par le vrai mot de passe pour les tests
}; 