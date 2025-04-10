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
import ActiveNotifications from "./ActiveNotifications"
import SelectAlertSensor from "./SelectAlertSensor"
import AccountSecurity from "./AccountSecurity"

// Composant séparateur simple
const Separator = () => <hr className="my-4 border-gray-200" />;

interface SettingsProps {
  user: User | null;
  setUser: (user: User | null) => void;
}

export default function Settings({ user, setUser }: SettingsProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                    Paramètres et préférences
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <ActiveNotifications user={user} setUser={setUser} />

                <Separator />

                <SelectAlertSensor user={user} />

                <Separator />

                <AccountSecurity />
            </CardContent>
        </Card>
    )
}
