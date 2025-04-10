import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart } from "lucide-react"

export default function StatsDocumentation() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <PieChart className="mr-2 h-5 w-5" />
          Statistiques et analyses
        </CardTitle>
        <CardDescription>
          Comprenez les données de vos capteurs grâce aux analyses.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <h3 className="text-lg font-medium">Interpréter les graphiques</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Chaque capteur affiche un graphique qui représente l&apos;évolution des valeurs dans le temps:
            <ul className="list-disc pl-5 mt-1">
              <li>L&apos;axe horizontal représente le temps (selon la période sélectionnée)</li>
              <li>L&apos;axe vertical représente la valeur mesurée</li>
              <li>La ligne rouge horizontale (si présente) indique le seuil d&apos;alerte</li>
            </ul>
          </p>
          <p>Survolez un point du graphique pour voir la valeur exacte à ce moment précis.</p>
        </div>

        <h3 className="text-lg font-medium">Périodes d&apos;analyse</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Vous pouvez analyser vos données sur différentes périodes:
            <ul className="list-disc pl-5 mt-1">
              <li><strong>1h, 3h, 6h, 12h:</strong> Pour une analyse détaillée récente</li>
              <li><strong>Jour:</strong> Pour voir les tendances sur 24 heures</li>
              <li><strong>Semaine:</strong> Pour analyser les patterns hebdomadaires</li>
              <li><strong>Mois:</strong> Pour une vue d&apos;ensemble des tendances à long terme</li>
            </ul>
          </p>
          <p>La période sélectionnée s&apos;applique à tous les graphiques affichés.</p>
        </div>

        <h3 className="text-lg font-medium">Ajuster les seuils</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Utilisez les graphiques comme aide pour définir des seuils appropriés:
            <ul className="list-disc pl-5 mt-1">
              <li>Observez les valeurs habituelles de vos capteurs sur différentes périodes</li>
              <li>Identifiez les pics normaux vs. anormaux</li>
              <li>Ajustez le seuil pour qu&apos;il déclenche des alertes uniquement en cas de valeurs réellement problématiques</li>
            </ul>
          </p>
          <p>Un seuil bien réglé vous évitera des alertes inutiles tout en vous informant des situations importantes.</p>
        </div>
      </CardContent>
    </Card>
  )
}
