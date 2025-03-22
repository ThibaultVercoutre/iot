import { PrismaClient, SensorType } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Créer l'utilisateur de test
  const hashedPassword = await bcrypt.hash("password123", 10)

  const user = await prisma.user.upsert({
    where: { id: "1" },
    update: {
      email: "test@example.com",
      ttnId: "iot-project-dashboard", // Mettre à jour avec l'application_id TTN
      password: hashedPassword,
      name: "Test User"
    },
    create: {
      id: "1",
      email: "test@example.com",
      password: hashedPassword,
      name: "Test User",
      ttnId: "iot-project-dashboard" // L'application_id de votre application TTN
    },
  })

  console.log("Utilisateur créé:", user)

  // Créer les capteurs de test
  const sensorTypes = [
    {
      name: "Capteur de son",
      type: SensorType.SOUND,
      deviceId: "sound-simulate"
    },
    {
      name: "Capteur de vibration",
      type: SensorType.VIBRATION,
      deviceId: "sound-simulate"
    },
    {
      name: "Bouton",
      type: SensorType.BUTTON,
      deviceId: "sound-simulate"
    }
  ]

  // Créer ou mettre à jour chaque capteur
  for (const sensorType of sensorTypes) {
    const sensor = await prisma.sensor.upsert({
      where: {
        // Créer un ID unique basé sur le type et le deviceId
        id: `${sensorType.type}-${sensorType.deviceId}`,
      },
      update: {
        name: sensorType.name,
        type: sensorType.type,
        userId: "1"
      },
      create: {
        id: `${sensorType.type}-${sensorType.deviceId}`,
        name: sensorType.name,
        type: sensorType.type,
        deviceId: sensorType.deviceId,
        userId: "1"
      },
    })

    console.log(`Capteur créé: ${sensor.name} (${sensor.type})`)

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
          // Vibration est maintenant binaire comme le bouton (0/1)
          value = i % 8 < 6 ? 0 : 1 // 75% du temps pas de vibration, 25% vibration
          break
        case SensorType.BUTTON:
          // Alterne entre 0 et 1 avec une tendance à rester dans le même état
          value = i % 10 < 7 ? 0 : 1 // 70% du temps à 0, 30% à 1
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
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 