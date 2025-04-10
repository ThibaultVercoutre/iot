"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Home, AlertCircle, Settings, PieChart, Tablet, Bell, Info, Plus, Sliders } from "lucide-react"

export default function DocumentationPage() {
  const router = useRouter()

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Button>
          <h1 className="text-2xl font-bold">Documentation utilisateur</h1>
        </div>
      </div>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Guide d&apos;utilisation de l&apos;application
            </CardTitle>
            <CardDescription>
              Cette documentation vous aidera à comprendre et utiliser toutes les fonctionnalités disponibles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Bienvenue dans la documentation utilisateur de notre application IoT. Cette application vous permet de surveiller 
              et gérer vos capteurs connectés, de recevoir des alertes et de personnaliser votre expérience.
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            <span className="hidden md:inline">Tableau de bord</span>
          </TabsTrigger>
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <Tablet className="h-4 w-4" />
            <span className="hidden md:inline">Appareils et capteurs</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="hidden md:inline">Alertes</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden md:inline">Compte</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden md:inline">Statistiques</span>
          </TabsTrigger>
        </TabsList>

        {/* Section Tableau de bord */}
        <TabsContent value="dashboard" className="space-y-4">
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
        </TabsContent>

        {/* Section Appareils et capteurs */}
        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Tablet className="mr-2 h-5 w-5" />
                Appareils et capteurs
              </CardTitle>
              <CardDescription>
                Gestion de vos appareils IoT et de leurs capteurs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">Ajouter un nouvel appareil</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>1.</strong> Cliquez sur le bouton <span className="bg-muted px-2 py-1 rounded inline-flex items-center text-xs"><Plus className="h-3 w-3 mr-1" /> Ajouter un appareil</span> dans le tableau de bord.</p>
                <p><strong>2.</strong> Remplissez les informations requises:
                  <ul className="list-disc pl-5 mt-1">
                    <li>Nom de l&apos;appareil (ex: "Capteur salon")</li>
                    <li>Join EUI (fourni avec votre appareil)</li>
                    <li>Dev EUI (fourni avec votre appareil)</li>
                  </ul>
                </p>
                <p><strong>3.</strong> Confirmez l&apos;ajout pour connecter votre appareil.</p>
              </div>

              <h3 className="text-lg font-medium">Configurer les capteurs</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Pour chaque capteur, vous pouvez définir:
                  <ul className="list-disc pl-5 mt-1">
                    <li><strong>Seuil d&apos;alerte:</strong> La valeur à partir de laquelle une alerte sera déclenchée.</li>
                    <li><strong>Capteur d&apos;alerte:</strong> Définir un capteur comme contrôleur des alertes (généralement un bouton).</li>
                  </ul>
                </p>
                <p>Pour modifier le seuil:
                  <ul className="list-disc pl-5 mt-1">
                    <li>Localisez le capteur dans le tableau de bord</li>
                    <li>Modifiez la valeur dans le champ de seuil</li>
                    <li>Appuyez sur Entrée ou cliquez en dehors du champ pour sauvegarder</li>
                  </ul>
                </p>
              </div>

              <h3 className="text-lg font-medium">Supprimer un appareil ou un capteur</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>Supprimer un capteur:</strong> Cliquez sur l&apos;icône de suppression à côté du capteur et confirmez votre choix.</p>
                <p><strong>Supprimer un appareil:</strong> Pour le moment, contactez le support pour supprimer un appareil entier.</p>
                <p className="text-amber-600 font-medium">Attention: La suppression est définitive et toutes les données historiques associées seront perdues.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Section Alertes */}
        <TabsContent value="alerts" className="space-y-4">
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
                <p>Utilisez le bouton "Alertes actives uniquement" pour filtrer et n&apos;afficher que les alertes actuellement actives.</p>
              </div>

              <h3 className="text-lg font-medium">Activer/désactiver les notifications d&apos;alertes</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Dans la page Compte, sous "Paramètres", vous pouvez:
                  <ul className="list-disc pl-5 mt-1">
                    <li>Activer/désactiver les notifications d&apos;alertes</li>
                    <li>Sélectionner un capteur (généralement un bouton) qui pourra activer/désactiver les alertes</li>
                  </ul>
                </p>
                <p>Lorsque les alertes sont désactivées, l&apos;application continue d&apos;enregistrer les événements mais ne vous notifie pas.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Section Compte */}
        <TabsContent value="account" className="space-y-4">
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
                  <li>Sélectionnez "Aucun capteur" pour désactiver cette fonctionnalité</li>
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
        </TabsContent>

        {/* Section Statistiques */}
        <TabsContent value="stats" className="space-y-4">
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
        </TabsContent>
      </Tabs>

      <div className="mt-8">
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle className="text-lg">Besoin d&apos;aide supplémentaire?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Si vous avez d&apos;autres questions ou rencontrez des problèmes, n&apos;hésitez pas à contacter notre 
              support technique à l&apos;adresse <span className="font-medium">support@example.com</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 