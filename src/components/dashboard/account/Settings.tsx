import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell, Shield, Settings as SettingsIcon, AlertTriangle } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { User } from "@/types/sensors"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertSensor, AlertSensorResponse, getAlertSensor, getAllSensorsWithDevices, updateAlertSensor } from "@/services/userService"
import { Skeleton } from "@/components/ui/skeleton"

// Composant séparateur simple
const Separator = () => <hr className="my-4 border-gray-200" />;

interface SettingsProps {
  user: User | null;
  onToggleAlerts: () => void;
}

export default function Settings({ user, onToggleAlerts }: SettingsProps) {
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5" />
          Paramètres et préférences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications d&apos;alertes
            </Label>
            <p className="text-sm text-gray-500">
              Activez pour recevoir des notifications en cas d&apos;alerte sur vos capteurs
            </p>
          </div>
          <Switch 
            id="alerts" 
            checked={user?.alertsEnabled || false} 
            onCheckedChange={onToggleAlerts}
          />
        </div>

        <Separator />

        {/* Sélection du capteur d'alerte */}
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

        <Separator />

        <div>
          <h3 className="text-lg font-medium mb-2">Sécurité du compte</h3>
          <Button variant="outline" className="w-full flex items-center justify-center gap-2 mb-2">
            <Shield className="h-4 w-4" />
            Changer mon mot de passe
          </Button>

          <Button variant="destructive" className="w-full">
            Supprimer mon compte
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
