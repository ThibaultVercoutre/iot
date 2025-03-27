import { PrismaClient, SensorType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Fonction pour générer un ID unique court
function generateShortId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function main() {
  // Nettoyer la base de données
  await cleanDatabase()

  // Créer l'utilisateur de test
  const hashedPassword = await bcrypt.hash("password123", 10)

  const user = await prisma.user.create({
    data: {
      email: "test@example.com",
      password: hashedPassword,
      name: "Test User",
      alertsEnabled: true,
      ttnId: "iot-project-dashboard",
    },
  })

  console.log("Utilisateur créé:", user)

  // Créer le device
  const device = await prisma.device.create({
    data: {
      name: "Device de test",
      joinEui: "7878787878787878",
      devEui: "70B3D57ED006F550",
      userId: user.id
    }
  })

  console.log("Device créé:", device)

  // Configuration des capteurs
  const sensorTypes = [
    {
      name: "Capteur de son",
      type: SensorType.SOUND,
      threshold: 1450,
      isBinary: false
    },
    {
      name: "Capteur de vibration",
      type: SensorType.VIBRATION,
      isBinary: true
    },
    {
      name: "Bouton d'alerte",
      type: SensorType.BUTTON,
      isBinary: true
    }
  ]

  // Map pour stocker les IDs des capteurs par type
  const sensorIds: Record<SensorType, number> = {} as Record<SensorType, number>

  // Heure de référence actuelle pour toutes les données créées
  const now = new Date()
  // Ajuster pour avoir une heure fixe en UTC
  now.setDate(now.getDate() - 1)
  // On garde l'heure UTC actuelle pour éviter les problèmes de timezone
  // On garde l'heure actuelle en UTC
  now.setUTCHours(new Date().getUTCHours(), new Date().getUTCMinutes(), new Date().getUTCSeconds(), 0)
  
  // Temps de début pour les données: 49 minutes avant now
  const startTime = new Date(now)
  startTime.setUTCMinutes(startTime.getUTCMinutes() - 49)

  // Créer les capteurs
  for (const sensorType of sensorTypes) {
    // Générer un ID unique court
    let uniqueId = generateShortId()
    let existingSensor = await prisma.sensor.findUnique({
      where: { uniqueId }
    })
    while (existingSensor) {
      uniqueId = generateShortId()
      existingSensor = await prisma.sensor.findUnique({
        where: { uniqueId }
      })
    }

    const sensor = await prisma.sensor.create({
      data: {
        name: sensorType.name,
        type: sensorType.type,
        isBinary: sensorType.isBinary,
        uniqueId,
        deviceId: device.id
      },
    })

    console.log(`Capteur créé: ${sensor.name} (${sensor.type})`)
    
    // Stocker l'ID du capteur par type
    sensorIds[sensor.type] = sensor.id

    // Créer le seuil pour le capteur de son
    if (sensorType.type === SensorType.SOUND && sensorType.threshold) {
      await prisma.threshold.create({
        data: {
          sensorId: sensor.id,
          value: sensorType.threshold
        }
      })
      console.log(`Seuil créé pour ${sensor.name}: ${sensorType.threshold}`)
    }

    // Générer les données pour le graphique (50 points)
    const values = []

    for (let i = 0; i < 50; i++) {
      let value: number
      
      // Générer des valeurs réalistes selon le type de capteur
      if (sensor.type === SensorType.SOUND) {
        const noise = Math.random() * 20 - 10 // bruit entre -10 et +10
        
        if (i === 49) {
          value = 1464 // Valeur finale exacte
        } else if (i >= 40) {
          const progress = (i - 40) / 9
          value = 1380 + progress * (1464 - 1380) + noise * (1 - progress * 0.8)
        } else if (i >= 30 && i < 40) {
          const progress = (i - 30) / 10
          value = 1500 - progress * (1500 - 1380) + noise
        } else if (i >= 15 && i < 30) {
          const progress = (i - 15) / 15
          const baseValue = 1440 + Math.sin(progress * Math.PI) * 70
          value = baseValue + noise * 0.7
        } else {
          const progress = i / 15
          value = 1380 + progress * (1440 - 1380) + noise * 0.5
        }
        
        value = Math.max(1380, Math.min(1520, value))
      } else if (sensor.type === SensorType.VIBRATION) {
        if (i > 46) {
          value = 1
        } else if (i > 43 && i <= 46) {
          value = 0
        } else if (i > 40 && i <= 43) {
          value = 1
        } else if (i > 37 && i <= 40) {
          value = 0
        } else if (i > 34 && i <= 37) {
          value = 1
        } else if (i > 31 && i <= 34) {
          value = 0
        } else if (i > 28 && i <= 31) {
          value = 1
        } else if (i > 25 && i <= 28) {
          value = 0
        } else if (i > 22 && i <= 25) {
          value = 1
        } else {
          value = 0
        }
      } else {
        value = (i === 15 || i === 45) ? 1 : 0
      }
      
      const timestamp = new Date(startTime.getTime() + i * 60000)
      
      values.push({
        sensorId: sensor.id,
        value: Math.round(value),
        timestamp
      })
    }

    await prisma.sensorData.createMany({
      data: values
    })

    console.log(`${values.length} valeurs créées pour ${sensor.name}`)
  }

  // Créer les alertes
  await createAlerts(sensorIds, user.id)
}

async function cleanDatabase() {
  console.log("Nettoyage de la base de données...")
  await prisma.alertLog.deleteMany({})
  await prisma.sensorData.deleteMany({})
  await prisma.threshold.deleteMany({})
  await prisma.sensor.deleteMany({})
  await prisma.device.deleteMany({})
  await prisma.user.deleteMany({})
  console.log("Base de données nettoyée.")
}

async function createAlerts(sensorIds: Record<SensorType, number>, userId: number) {
  console.log("Création des alertes...")
  
  const soundThreshold = await prisma.threshold.findUnique({
    where: { sensorId: sensorIds[SensorType.SOUND] }
  })

  const thresholdValue = soundThreshold?.value || 1450
  
  const soundData = await prisma.sensorData.findMany({
    where: { sensorId: sensorIds[SensorType.SOUND] },
    orderBy: { timestamp: 'asc' },
    take: 50
  })

  const vibrationData = await prisma.sensorData.findMany({
    where: { sensorId: sensorIds[SensorType.VIBRATION] },
    orderBy: { timestamp: 'asc' },
    take: 50
  })

  const buttonData = await prisma.sensorData.findMany({
    where: { sensorId: sensorIds[SensorType.BUTTON] },
    orderBy: { timestamp: 'asc' },
    take: 50
  })

  // Alertes pour le son
  const soundAlertStartIds = soundData.reduce((alerts: number[], data, index) => {
    if (index > 0) {
      const prevValue = soundData[index - 1].value
      const currentValue = data.value
      if (prevValue < thresholdValue && currentValue >= thresholdValue) {
        alerts.push(data.id)
      }
    }
    return alerts
  }, [])

  const soundAlertEndIds = soundData.reduce((alerts: number[], data, index) => {
    if (index > 0) {
      const prevValue = soundData[index - 1].value
      const currentValue = data.value
      if (prevValue >= thresholdValue && currentValue < thresholdValue) {
        alerts.push(data.id)
      }
    }
    return alerts
  }, [])

  const soundAlerts = soundAlertStartIds.map(startId => {
    const endId = soundAlertEndIds.find(endId => endId > startId)
    return {
      sensorId: sensorIds[SensorType.SOUND],
      startDataId: startId,
      endDataId: endId,
      thresholdValue
    }
  })

  // Alertes pour les vibrations
  const vibrationAlertStartIds = vibrationData.reduce((alerts: number[], data, index) => {
    if (index > 0) {
      const prevValue = vibrationData[index - 1].value
      const currentValue = data.value
      if (prevValue === 0 && currentValue === 1) {
        alerts.push(data.id)
      }
    }
    return alerts
  }, [])

  const vibrationAlertEndIds = vibrationData.reduce((alerts: number[], data, index) => {
    if (index > 0) {
      const prevValue = vibrationData[index - 1].value
      const currentValue = data.value
      if (prevValue === 1 && currentValue === 0) {
        alerts.push(data.id)
      }
    }
    return alerts
  }, [])

  const vibrationAlerts = vibrationAlertStartIds.map(startId => {
    const endId = vibrationAlertEndIds.find(endId => endId > startId)
    return {
      sensorId: sensorIds[SensorType.VIBRATION],
      startDataId: startId,
      endDataId: endId,
      thresholdValue: 1
    }
  })

  // Alertes pour le bouton
  const buttonAlerts = buttonData
    .filter(data => data.value === 1)
    .map(data => ({
      sensorId: sensorIds[SensorType.BUTTON],
      startDataId: data.id,
      endDataId: data.id,
      thresholdValue: 1
    }))
  
  const allAlerts = [...soundAlerts, ...vibrationAlerts, ...buttonAlerts]
  
  for (const alert of allAlerts) {
    const createdAlert = await prisma.alertLog.create({
      data: alert
    })
    console.log(`Alerte créée pour capteur ${createdAlert.sensorId}`)
  }

  // Ajouter à l'user l'id du capteur bouton
  await prisma.user.update({
    where: { id: userId },
    data: {
      alertSensorId: sensorIds[SensorType.BUTTON]
    }
  })
  
  console.log(`${allAlerts.length} alertes créées`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 