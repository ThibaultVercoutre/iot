import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const timestamp = new Date();
    
    // Utiliser une transaction Prisma pour garantir la cohérence des données
    const result = await prisma.$transaction(async (tx) => {
      const createdData = [];
      const processedSensors = [];

      // Pour chaque capteur dans le payload
      for (const [uniqueId, value] of Object.entries(body)) {
        // Trouver le capteur correspondant à l'ID unique
        const sensor = await tx.sensor.findUnique({
          where: { uniqueId },
          include: {
            threshold: true
          }
        });

        if (!sensor) continue;
        processedSensors.push(uniqueId);

        // Créer la donnée pour ce capteur
        const sensorData = await tx.sensorData.create({
          data: {
            sensorId: sensor.id,
            value: Number(value),
            timestamp
          }
        });
        createdData.push(sensorData);

        // Traiter la logique d'alerte
        if (sensor.threshold && !sensor.isBinary && Number(value) >= sensor.threshold.value) {
          // Vérifier s'il y a déjà une alerte active (en une seule requête)
          const activeAlert = await tx.alertLog.findFirst({
            where: {
              sensorId: sensor.id,
              endDataId: null
            }
          });

          // Si pas d'alerte active, en créer une
          if (!activeAlert) {
            await tx.alertLog.create({
              data: {
                sensorId: sensor.id,
                startDataId: sensorData.id,
                thresholdValue: sensor.threshold.value
              }
            });
          }
        }
        // Pour les capteurs binaires, créer une alerte si la valeur est 1
        else if (sensor.isBinary && Number(value) === 1) {
          await tx.alertLog.create({
            data: {
              sensorId: sensor.id,
              startDataId: sensorData.id,
              endDataId: sensorData.id,
              thresholdValue: 1
            }
          });
        }
        // Pour les capteurs non-binaires, vérifier si une alerte doit être fermée
        else if (!sensor.isBinary && sensor.threshold && Number(value) < sensor.threshold.value) {
          const activeAlert = await tx.alertLog.findFirst({
            where: {
              sensorId: sensor.id,
              endDataId: null
            }
          });

          if (activeAlert) {
            await tx.alertLog.update({
              where: { id: activeAlert.id },
              data: { endDataId: sensorData.id }
            });
          }
        }
      }

      return { 
        created: createdData.length,
        processedSensors
      };
    }, {
      // Options de transaction pour augmenter le timeout si nécessaire
      maxWait: 5000, // 5s de temps d'attente max pour acquérir une connexion
      timeout: 10000 // 10s de timeout pour la transaction
    });

    return NextResponse.json({ 
      success: true,
      processed: result.created,
      sensors: result.processedSensors 
    });
  } catch (error) {
    console.error("Erreur lors de la création des données:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création des données" },
      { status: 500 }
    );
  }
} 