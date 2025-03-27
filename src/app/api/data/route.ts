import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const timestamp = new Date();
    
    // Créer un tableau pour stocker toutes les promesses de création de données
    const createPromises = [];

    // Pour chaque capteur dans le payload
    for (const [uniqueId, value] of Object.entries(body)) {
      // Trouver le capteur correspondant à l'ID unique
      const sensor = await prisma.sensor.findUnique({
        where: { uniqueId },
        include: {
          threshold: true
        }
      });

      if (sensor) {
        // Créer la donnée pour ce capteur
        const createPromise = prisma.sensorData.create({
          data: {
            sensorId: sensor.id,
            value: Number(value),
            timestamp
          }
        });
        createPromises.push(createPromise);

        // Si le capteur a un seuil et n'est pas binaire, vérifier s'il faut créer une alerte
        if (sensor.threshold && !sensor.isBinary && Number(value) >= sensor.threshold.value) {
          // Vérifier s'il y a déjà une alerte active
          const activeAlert = await prisma.alertLog.findFirst({
            where: {
              sensorId: sensor.id,
              endDataId: null
            }
          });

          // Si pas d'alerte active, en créer une
          if (!activeAlert) {
            const alertData = await prisma.sensorData.create({
              data: {
                sensorId: sensor.id,
                value: Number(value),
                timestamp
              }
            });

            await prisma.alertLog.create({
              data: {
                sensorId: sensor.id,
                startDataId: alertData.id,
                thresholdValue: sensor.threshold.value
              }
            });
          }
        }
        // Pour les capteurs binaires, créer une alerte si la valeur est 1
        else if (sensor.isBinary && Number(value) === 1) {
          const alertData = await prisma.sensorData.create({
            data: {
              sensorId: sensor.id,
              value: 1,
              timestamp
            }
          });

          await prisma.alertLog.create({
            data: {
              sensorId: sensor.id,
              startDataId: alertData.id,
              endDataId: alertData.id,
              thresholdValue: 1
            }
          });
        }
        // Pour les capteurs non-binaires, vérifier si une alerte doit être fermée
        else if (!sensor.isBinary && sensor.threshold && Number(value) < sensor.threshold.value) {
          const activeAlert = await prisma.alertLog.findFirst({
            where: {
              sensorId: sensor.id,
              endDataId: null
            }
          });

          if (activeAlert) {
            const endData = await prisma.sensorData.create({
              data: {
                sensorId: sensor.id,
                value: Number(value),
                timestamp
              }
            });

            await prisma.alertLog.update({
              where: { id: activeAlert.id },
              data: { endDataId: endData.id }
            });
          }
        }
      }
    }

    // Attendre que toutes les données soient créées
    await Promise.all(createPromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la création des données:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création des données" },
      { status: 500 }
    );
  }
} 