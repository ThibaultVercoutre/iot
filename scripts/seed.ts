import { PrismaClient, SensorType } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Créer l'utilisateur de test
  const hashedPassword = await bcrypt.hash("password123", 10)

  const user = await prisma.user.upsert({
    where: { id: 1 },
    update: {
      email: "test@example.com",
      ttnId: "iot-project-dashboard",
      password: hashedPassword,
      name: "Test User",
      alertsEnabled: true
    },
    create: {
      id: 1,
      email: "test@example.com",
      password: hashedPassword,
      name: "Test User",
      ttnId: "iot-project-dashboard",
      alertsEnabled: true
    },
  })

  console.log("Utilisateur créé:", user)

  // Créer les capteurs de test
  const sensorTypes = [
    {
      name: "Capteur de son",
      type: SensorType.SOUND,
      deviceId: "sound-simulate",
      joinEui: "1212121212121212",
      devEui: "70B3D57ED006F3C6",
      threshold: 1500, // Seuil par défaut pour le capteur de son
      isBinary: false
    },
    {
      name: "Capteur de vibration",
      type: SensorType.VIBRATION,
      deviceId: "vibration-simulate",
      joinEui: "3434343434343434",
      devEui: "70B3D57ED006F47D",
      isBinary: true
    },
    {
      name: "Bouton d'alerte",
      type: SensorType.BUTTON,
      deviceId: "button-simulate",
      joinEui: "5656565656565656",
      devEui: "70B3D57ED006F47F",
      isBinary: true
    }
  ]

  let alertSensorId: number | null = null

  // Créer ou mettre à jour chaque capteur
  for (const sensorType of sensorTypes) {
    const sensor = await prisma.sensor.upsert({
      where: {
        deviceId_joinEui_devEui: {
          deviceId: sensorType.deviceId,
          joinEui: sensorType.joinEui,
          devEui: sensorType.devEui
        }
      },
      update: {
        name: sensorType.name,
        type: sensorType.type,
        isBinary: sensorType.isBinary,
        userId: 1
      },
      create: {
        name: sensorType.name,
        type: sensorType.type,
        isBinary: sensorType.isBinary,
        deviceId: sensorType.deviceId,
        joinEui: sensorType.joinEui,
        devEui: sensorType.devEui,
        userId: 1
      },
    })

    console.log(`Capteur créé: ${sensor.name} (${sensor.type})`)

    // Stocker l'ID du capteur bouton
    if (sensorType.type === SensorType.BUTTON) {
      alertSensorId = sensor.id
    }

    // Créer le seuil pour le capteur de son si nécessaire
    if (sensorType.type === SensorType.SOUND && sensorType.threshold) {
      await prisma.threshold.upsert({
        where: { sensorId: sensor.id },
        update: { value: sensorType.threshold },
        create: {
          sensorId: sensor.id,
          value: sensorType.threshold
        }
      })
      console.log(`Seuil créé pour ${sensor.name}: ${sensorType.threshold}`)
    }

    // Générer 50 valeurs de test espacées d'une minute
    const startDate = new Date('2025-03-22T00:41:29.522Z')
    const values = []

    for (let i = 0; i < 50; i++) {
      let value: number

      // Générer des valeurs réalistes selon le type de capteur
      switch (sensor.type) {
        case SensorType.SOUND:
          // Valeurs entre 1400 et 1600 dB avec une variation progressive
          value = 1500 + Math.sin(i * 0.2) * 100 + (Math.random() * 20 - 10)
          break
        case SensorType.VIBRATION:
          // Alterne entre 0 et 1 avec une tendance à rester dans le même état
          value = i % 10 < 7 ? 0 : 1 // 70% du temps à 0, 30% à 1
          break
        case SensorType.BUTTON:
          // Pour le bouton, on génère des valeurs qui simulent des appuis
          value = i % 20 === 0 ? 1 : 0 // Un appui toutes les 20 minutes
          break
        default:
          value = 0
      }

      const timestamp = new Date(startDate.getTime() + i * 60000) // Ajoute i minutes
      values.push({
        sensorId: sensor.id,
        value: Math.round(value), // Arrondir les valeurs
        timestamp
      })
    }

    // Insérer toutes les valeurs d'un coup
    await prisma.sensorData.createMany({
      data: values
    })

    console.log(`${values.length} valeurs créées pour ${sensor.name}`)
  }

  // Mettre à jour l'utilisateur avec l'ID du capteur d'alerte
  if (alertSensorId) {
    await prisma.user.update({
      where: { id: 1 },
      data: { alertSensorId }
    })
    console.log(`Capteur d'alerte configuré: ${alertSensorId}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 