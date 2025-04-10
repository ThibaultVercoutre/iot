import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Home } from "lucide-react"

export default function DashboardDocumentation() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Home className="mr-2 h-5 w-5" />
          Tableau de bord
        </CardTitle>
        <CardDescription>
          Votre vue principale pour surveiller tous vos appareils et capteurs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <h3 className="text-lg font-medium">Fonctionnalités principales</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium">Vue d&apos;ensemble des appareils</h4>
            <p className="text-sm text-muted-foreground">
              Le tableau de bord affiche tous vos appareils connectés avec leurs capteurs. Chaque capteur indique sa valeur 
              actuelle et son état (normal ou en alerte).
            </p>
          </div>

          <div>
            <h4 className="font-medium">Filtres</h4>
            <p className="text-sm text-muted-foreground">
              Utilisez les filtres en haut de la page pour:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground mt-2">
              <li>Changer la période d&apos;affichage (1h, 3h, 6h, 12h, jour, semaine, mois)</li>
              <li>Basculer entre la vue grille et la vue liste</li>
              <li>Filtrer par type de capteur</li>
              <li>Afficher uniquement les capteurs en alerte</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium">Graphiques interactifs</h4>
            <p className="text-sm text-muted-foreground">
              Chaque capteur affiche un graphique des valeurs sur la période sélectionnée. Survolez le graphique pour voir 
              les valeurs précises à différents moments.
            </p>
          </div>
        </div>

        <h3 className="text-lg font-medium">Comment utiliser le tableau de bord</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong>1.</strong> Sélectionnez une période en haut de la page pour afficher les données dans cette plage de temps.</p>
          <p><strong>2.</strong> Utilisez les boutons de filtrage pour personnaliser l&apos;affichage selon vos besoins.</p>
          <p><strong>3.</strong> Cliquez sur un appareil pour voir tous ses capteurs.</p>
          <p><strong>4.</strong> Pour chaque capteur, vous pouvez:
            <ul className="list-disc pl-5 mt-1">
              <li>Voir sa valeur actuelle et son historique sur le graphique</li>
              <li>Modifier son seuil d&apos;alerte en tapant une nouvelle valeur dans le champ correspondant</li>
              <li>Supprimer le capteur avec le bouton de suppression</li>
            </ul>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
