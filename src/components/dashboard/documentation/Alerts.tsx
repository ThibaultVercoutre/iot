import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Bell } from "lucide-react"

export default function AlertsDocumentation() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertCircle className="mr-2 h-5 w-5" />
          Alertes
        </CardTitle>
        <CardDescription>
          Surveillance et gestion des alertes de vos capteurs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <h3 className="text-lg font-medium">Comprendre les alertes</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Une alerte est déclenchée lorsqu&apos;un capteur dépasse le seuil défini. Par exemple:</p>
          <ul className="list-disc pl-5 mt-1">
            <li>Pour un capteur de son: si le niveau sonore dépasse le seuil de décibels configuré</li>
            <li>Pour un capteur de vibration: si une vibration est détectée (valeur = 1)</li>
            <li>Pour un bouton: si le bouton est activé (valeur = 1)</li>
          </ul>
        </div>

        <h3 className="text-lg font-medium">Tableau d&apos;historique des alertes</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Pour accéder à l&apos;historique des alertes:</p>
          <p><strong>1.</strong> Cliquez sur <span className="bg-muted px-2 py-1 rounded inline-flex items-center text-xs"><Bell className="h-3 w-3 mr-1" /> Alertes</span> dans la barre de navigation.</p>
          <p><strong>2.</strong> Vous verrez une liste de toutes les alertes, avec:
            <ul className="list-disc pl-5 mt-1">
              <li>Le nom du capteur concerné</li>
              <li>La valeur qui a déclenché l&apos;alerte</li>
              <li>La date et l&apos;heure de début</li>
              <li>La date et l&apos;heure de fin (si l&apos;alerte est terminée)</li>
              <li>La durée de l&apos;alerte</li>
            </ul>
          </p>
        </div>

        <h3 className="text-lg font-medium">Filtrer les alertes</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Utilisez le bouton &quot;Alertes actives uniquement&quot; pour filtrer et n&apos;afficher que les alertes actuellement actives.</p>
        </div>

        <h3 className="text-lg font-medium">Activer/désactiver les notifications d&apos;alertes</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Dans la page Compte, sous &quot;Paramètres&quot;, vous pouvez:
            <ul className="list-disc pl-5 mt-1">
              <li>Activer/désactiver les notifications d&apos;alertes</li>
              <li>Sélectionner un capteur (généralement un bouton) qui pourra activer/désactiver les alertes</li>
            </ul>
          </p>
          <p>Lorsque les alertes sont désactivées, l&apos;application continue d&apos;enregistrer les événements mais ne vous notifie pas.</p>
        </div>
      </CardContent>
    </Card>
  )
}
