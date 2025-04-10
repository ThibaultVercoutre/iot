import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings } from "lucide-react"

export default function AccountDocumentation() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-5 w-5" />
          Compte et paramètres
        </CardTitle>
        <CardDescription>
          Gérez vos paramètres personnels et préférences d&apos;affichage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <h3 className="text-lg font-medium">Informations personnelles</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Dans la page Compte, vous pouvez consulter:
            <ul className="list-disc pl-5 mt-1">
              <li>Votre identifiant utilisateur</li>
              <li>Vos préférences d&apos;affichage (type de vue, période par défaut)</li>
              <li>Vos filtres par défaut</li>
            </ul>
          </p>
        </div>

        <h3 className="text-lg font-medium">Paramètres de notification</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Activer/désactiver les alertes:</strong> Utilisez l&apos;interrupteur pour activer ou désactiver les notifications d&apos;alertes.</p>
          
          <p><strong>Configurer le capteur d&apos;alerte:</strong></p>
          <ul className="list-disc pl-5 mt-1">
            <li>Le capteur d&apos;alerte est un capteur physique (généralement un bouton) qui peut contrôler l&apos;activation/désactivation des alertes</li>
            <li>Sélectionnez un capteur dans la liste déroulante pour le définir comme capteur d&apos;alerte</li>
            <li>Sélectionnez &quot;Aucun capteur&quot; pour désactiver cette fonctionnalité</li>
          </ul>
        </div>

        <h3 className="text-lg font-medium">Sécurité du compte</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Changer de mot de passe:</strong> Utilisez le bouton correspondant pour mettre à jour votre mot de passe.</p>
          <p><strong>Supprimer votre compte:</strong> Cette action est irréversible et supprimera toutes vos données. Une confirmation sera demandée.</p>
        </div>

        <h3 className="text-lg font-medium">Statistiques</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>La section statistiques vous montre:
            <ul className="list-disc pl-5 mt-1">
              <li>Le nombre total d&apos;appareils connectés</li>
              <li>Le nombre total de capteurs installés</li>
              <li>Le nombre de capteurs actuellement en alerte</li>
              <li>L&apos;état des alertes (actif/inactif)</li>
            </ul>
          </p>
          <p>Vous y retrouverez également la liste de tous vos appareils.</p>
        </div>
      </CardContent>
    </Card>
  )
}
