import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertSensor, AlertSensorResponse, getAlertSensor, getAllSensorsWithDevices, updateAlertSensor } from "@/services/userService"

export default function SelectAlertSensor() {
  const [sensors, setSensors] = useState<AlertSensor[]>([]);
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);
  const [alertSensorInfo, setAlertSensorInfo] = useState<AlertSensorResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charger le capteur d'alerte actuel et tous les capteurs disponibles
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [alertSensorResponse, allSensors] = await Promise.all([
          getAlertSensor(),
          getAllSensorsWithDevices()
        ]);
        
        setAlertSensorInfo(alertSensorResponse);
        setSensors(allSensors);
        setSelectedSensorId(alertSensorResponse.alertSensorId ? String(alertSensorResponse.alertSensorId) : null);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Gérer le changement de capteur d'alerte
  const handleSensorChange = async (value: string) => {
    try {
      const sensorId = value === "none" ? null : parseInt(value);
      
      // Mettre à jour l'interface pour feedback immédiat
      setSelectedSensorId(value === "none" ? null : value);
      
      // Appel API pour mettre à jour
      const response = await updateAlertSensor(sensorId);
      setAlertSensorInfo(response);
      
      console.log("Capteur d'alerte mis à jour:", response);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du capteur d'alerte:", error);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        Capteur d&apos;alerte
      </Label>
      <p className="text-sm text-gray-500 mb-2">
        Sélectionnez le capteur qui activera/désactivera les alertes
      </p>
      
      {isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <Select 
          value={selectedSensorId || "none"} 
          onValueChange={handleSensorChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sélectionner un capteur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun capteur</SelectItem>
            {sensors.map((sensor) => (
              <SelectItem key={sensor.id} value={String(sensor.id)}>
                {sensor.device.name} &gt; {sensor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      
      {alertSensorInfo?.alertSensor && (
        <div className="p-3 bg-muted rounded-md text-sm">
          <p>Capteur d&apos;alerte actuel: <span className="font-medium">
            {alertSensorInfo.alertSensor.device.name} &gt; {alertSensorInfo.alertSensor.name}
          </span></p>
          <p className="text-xs text-muted-foreground mt-1">
            Ce capteur contrôlera l&apos;activation et la désactivation des alertes.
          </p>
        </div>
      )}
    </div>
  )
}
