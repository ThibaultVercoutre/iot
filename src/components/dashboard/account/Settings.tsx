import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell, Shield, Settings as SettingsIcon } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { User } from "@/types/sensors"

// Composant séparateur simple
const Separator = () => <hr className="my-4 border-gray-200" />;

interface SettingsProps {
  user: User | null;
  onToggleAlerts: () => void;
}

export default function Settings({ user, onToggleAlerts }: SettingsProps) {
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
