import { useState } from "react"
import { Bell } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { User } from "@/types/sensors"
import { updateAlertsEnabled } from "@/services/userService"

interface ActiveNotificationsProps {
  user: User | null;
  setUser: (user: User | null) => void;
}

export default function ActiveNotifications({ user, setUser }: ActiveNotificationsProps) {
  const [isLoading, setIsLoading] = useState(false);
    
  const handleToggleAlerts = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      // Inverser l'état actuel des alertes
      const newAlertsEnabled = !user.alertsEnabled;
      
      // Appeler l'API pour mettre à jour l'état des alertes
      const updatedUser = await updateAlertsEnabled(newAlertsEnabled);
      
      // Notifier le composant parent de la mise à jour si nécessaire
      if (setUser) {
        setUser(updatedUser);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour des préférences :", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
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
        onCheckedChange={handleToggleAlerts}
        disabled={isLoading || !user}
      />
    </div>
  )
}
