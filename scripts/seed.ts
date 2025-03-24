import { PrismaClient, SensorType } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Nettoyer la base de données avant de la repeupler
  await cleanDatabase()

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

  // Créer les capteurs de test - seuil du son à 1450 pour que 1464 soit au-dessus
  const sensorTypes = [
    {
      name: "Capteur de son",
      type: SensorType.SOUND,
      deviceId: "sound-simulate",
      joinEui: "1212121212121212",
      devEui: "70B3D57ED006F3C6",
      threshold: 1450, // Seuil pour le capteur de son
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
  // Map pour stocker les IDs des capteurs par type
  const sensorIds: Record<SensorType, number> = {} as Record<SensorType, number>

  // Heure de référence actuelle pour toutes les données créées
  // Fixons l'heure à 21:30:29 pour correspondre à la capture d'écran
  const now = new Date();
  now.setHours(21, 30, 29, 0);

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
    
    // Stocker l'ID du capteur par type
    sensorIds[sensor.type] = sensor.id

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

    // Générer les données pour le graphique (50 points)
    const values = [];

    // Temps de début pour les données: 20:42:29 (49 minutes avant now)
    const startTime = new Date(now);
    startTime.setMinutes(startTime.getMinutes() - 49);

    for (let i = 0; i < 50; i++) {
      let value: number;
      
      // Générer des valeurs réalistes selon le type de capteur et basées sur la capture d'écran
      if (sensor.type === SensorType.SOUND) {
        // Ajouter un peu de bruit aléatoire pour que le graphique soit plus naturel
        const noise = Math.random() * 20 - 10; // bruit entre -10 et +10
        
        // Basé sur le graphique du son dans la capture d'écran
        if (i === 49) {
          // Valeur actuelle exactement 1464 comme dans la capture d'écran
          value = 1464;
        } else if (i >= 40) {
          // Oscillation montante pour atteindre 1464, avec variations naturelles
          const progress = (i - 40) / 9; // de 0 à 1
          value = 1380 + progress * (1464 - 1380) + noise * (1 - progress * 0.8); // moins de bruit à la fin
        } else if (i >= 30 && i < 40) {
          // La phase descendante du graphique, avec variations naturelles
          const progress = (i - 30) / 10;
          value = 1500 - progress * (1500 - 1380) + noise;
        } else if (i >= 15 && i < 30) {
          // La phase ascendante du graphique, avec variations naturelles
          const progress = (i - 15) / 15;
          // Créer un pic plus prononcé vers 1500
          const baseValue = 1440 + Math.sin(progress * Math.PI) * 70;
          value = baseValue + noise * 0.7;
        } else {
          // Début du graphique, avec légère montée et variations naturelles
          const progress = i / 15;
          value = 1380 + progress * (1440 - 1380) + noise * 0.5;
        }
        
        // S'assurer que la valeur reste dans une plage raisonnable
        value = Math.max(1380, Math.min(1520, value));
      } else if (sensor.type === SensorType.VIBRATION) {
        // D'après la capture, ce capteur est à ON à la fin (50% du temps ON, comme montré)
        if (i > 46) {
          value = 1; // ON sur les dernières minutes
        } else if (i > 43 && i <= 46) {
          value = 0;
        } else if (i > 40 && i <= 43) {
          value = 1;
        } else if (i > 37 && i <= 40) {
          value = 0;
        } else if (i > 34 && i <= 37) {
          value = 1;
        } else if (i > 31 && i <= 34) {
          value = 0;
        } else if (i > 28 && i <= 31) {
          value = 1;
        } else if (i > 25 && i <= 28) {
          value = 0;
        } else if (i > 22 && i <= 25) {
          value = 1;
        } else {
          value = 0;
        }
      } else {
        // Bouton à OFF à la fin avec quelques activations
        if (i === 15 || i === 45) {
          value = 1; // 2 pics d'activation comme dans la capture
        } else {
          value = 0;
        }
      }
      
      // Calculer le timestamp: startTime + i minutes
      const timestamp = new Date(startTime.getTime() + i * 60000);
      
      values.push({
        sensorId: sensor.id,
        value: Math.round(value),
        timestamp
      });
    }

    // Insérer toutes les valeurs
    await prisma.sensorData.createMany({
      data: values
    });

    console.log(`${values.length} valeurs créées pour ${sensor.name}`);
  }

  // Mettre à jour l'utilisateur avec l'ID du capteur d'alerte
  if (alertSensorId) {
    await prisma.user.update({
      where: { id: 1 },
      data: { alertSensorId }
    })
    console.log(`Capteur d'alerte configuré: ${alertSensorId}`)
  }
  
  // Créer des alertes historiques et actives
  await createAlerts(sensorIds)
}

// Fonction pour nettoyer la base de données
async function cleanDatabase() {
  console.log("Nettoyage de la base de données...")
  
  // Supprimer les données dans l'ordre pour éviter les erreurs de contrainte
  await prisma.alertLog.deleteMany({})
  await prisma.sensorData.deleteMany({})
  await prisma.threshold.deleteMany({})
  await prisma.sensor.deleteMany({})
  
  console.log("Base de données nettoyée.")
}

// Fonction pour créer les alertes
async function createAlerts(sensorIds: Record<SensorType, number>) {
  console.log("Création des alertes...")
  
  // Récupérer le seuil pour le capteur de son
  const soundThreshold = await prisma.threshold.findUnique({
    where: { sensorId: sensorIds[SensorType.SOUND] }
  })

  const thresholdValue = soundThreshold?.value || 1450
  
  // Récupérer les données des capteurs pour créer les alertes
  const soundData = await prisma.sensorData.findMany({
    where: { sensorId: sensorIds[SensorType.SOUND] },
    orderBy: { timestamp: 'asc' },
    take: 50
  });

  const vibrationData = await prisma.sensorData.findMany({
    where: { sensorId: sensorIds[SensorType.VIBRATION] },
    orderBy: { timestamp: 'asc' },
    take: 50
  });

  const buttonData = await prisma.sensorData.findMany({
    where: { sensorId: sensorIds[SensorType.BUTTON] },
    orderBy: { timestamp: 'asc' },
    take: 50
  });

  // Trouver les moments où le son dépasse le seuil
  const soundAlertStartIds = soundData.reduce((alerts: number[], data, index) => {
    // Vérifier si on a une valeur précédente pour comparer
    if (index > 0) {
      const prevValue = soundData[index - 1].value;
      const currentValue = data.value;
      
      // Si la valeur précédente était sous le seuil et la valeur actuelle au-dessus
      if (prevValue < thresholdValue && currentValue >= thresholdValue) {
        alerts.push(data.id);
      }
    }
    return alerts;
  }, []);

  // On fait pareil pour quand ça repasse en dessous du seuil
  const soundAlertEndIds = soundData.reduce((alerts: number[], data, index) => {
    if (index > 0) {
      const prevValue = soundData[index - 1].value;
      const currentValue = data.value;
      
      // Si la valeur précédente était au-dessus du seuil et la valeur actuelle en-dessous
      if (prevValue >= thresholdValue && currentValue < thresholdValue) {
        alerts.push(data.id);
      }
    }
    return alerts;
  }, []);

  console.log("soundAlertStartIds", soundAlertStartIds.map(id => {
    const data = soundData.find(d => d.id === id);
    return {
      id,
      timestamp: data?.timestamp
    };
  }));
  
  console.log("soundAlertEndIds", soundAlertEndIds.map(id => {
    const data = soundData.find(d => d.id === id);
    return {
      id,
      timestamp: data?.timestamp
    };
  }));

  // On combine les ids de début et de fin pour avoir les alertes et on les trie par ordre chronologique
  const soundAlerts = soundAlertStartIds.map(startId => {
    const endId = soundAlertEndIds.find(endId => endId > startId);
    return {
      sensorId: sensorIds[SensorType.SOUND],
      startDataId: startId,
      endDataId: endId,
      thresholdValue: thresholdValue
    }
  }).sort((a, b) => a.startDataId - b.startDataId);
  
  // On fait pareil pour les vibrations (mais ici 0 ou 1)
  const vibrationAlertStartIds = vibrationData.reduce((alerts: number[], data, index) => {
    if (index > 0) {
      const prevValue = vibrationData[index - 1].value;
      const currentValue = data.value;
      
      // Si la valeur précédente était 0 et la valeur actuelle 1
      if (prevValue === 0 && currentValue === 1) {
        alerts.push(data.id);
      }
    }
    return alerts;
  }, []);
 
  // On fait pareil pour les vibrations (mais ici 0 ou 1)
  const vibrationAlertEndIds = vibrationData.reduce((alerts: number[], data, index) => {
    if (index > 0) {
      const prevValue = vibrationData[index - 1].value;
      const currentValue = data.value;

      // Si la valeur précédente était 1 et la valeur actuelle 0
      if (prevValue === 1 && currentValue === 0) {
        alerts.push(data.id);
      }
    }
    return alerts;
  }, []);

  console.log("vibrationAlertStartIds", vibrationAlertStartIds.map(id => {
    const data = vibrationData.find(d => d.id === id);
    return {
      id,
      timestamp: data?.timestamp
    };
  }));

  console.log("vibrationAlertEndIds", vibrationAlertEndIds.map(id => {
    const data = vibrationData.find(d => d.id === id);
    return {
      id,
      timestamp: data?.timestamp
    };
  }));

  // On combine les ids de début et de fin pour avoir les alertes et on les trie par ordre chronologique
  const vibrationAlerts = vibrationAlertStartIds.map(startId => {
    const endId = vibrationAlertEndIds.find(endId => endId > startId);
    return {
      sensorId: sensorIds[SensorType.VIBRATION],
      startDataId: startId,
      endDataId: endId,
      thresholdValue: 1
    }
  }).sort((a, b) => a.startDataId - b.startDataId);

  // On fait pareil pour le bouton (Ici c'est que des appuis, donc la fin est la même que le début)
  const buttonAlerts = buttonData
    .filter(data => data.value === 1)
    .map(data => ({
      sensorId: sensorIds[SensorType.BUTTON],
      startDataId: data.id,
      endDataId: data.id,
      thresholdValue: 1
    }));
  
  // Rassembler toutes les alertes
  const allAlerts = [...soundAlerts, ...vibrationAlerts, ...buttonAlerts]
  
  // Créer toutes les alertes
  for (const alert of allAlerts) {
    const createdAlert = await prisma.alertLog.create({
      data: alert
    })
    console.log(`Alerte créée pour capteur ${createdAlert.sensorId}`)
  }
  
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