import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User as UserIcon, Calendar, Edit } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { User } from "@/types/sensors"

interface PersonnalInformationsProps {
  user: User | null;
}

export default function PersonnalInformations({ user }: PersonnalInformationsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserIcon className="h-5 w-5" />
          Informations personnelles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-4">
          <div className="flex flex-col">
            <dt className="text-sm font-medium text-gray-500">ID Utilisateur</dt>
            <dd className="text-lg">{user?.id}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-sm font-medium text-gray-500">Type de vue préférée</dt>
            <dd className="text-lg flex items-center gap-2">
              <Badge>
                {user?.dashboardViewMode || "Grille"}
              </Badge>
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-sm font-medium text-gray-500">Période par défaut</dt>
            <dd className="text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              {user?.dashboardPeriod || "day"}
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-sm font-medium text-gray-500">Filtre d&apos;alerte par défaut</dt>
            <dd className="text-lg flex items-center gap-2">
              <Badge variant={user?.dashboardAlertFilter === 'alert' ? "destructive" : "outline"}>
                {user?.dashboardAlertFilter === 'alert' ? 'Avec alertes' : 'Tous'}
              </Badge>
            </dd>
          </div>

          <div className="pt-2">
            <Button variant="outline" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Modifier mes préférences
            </Button>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
