"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { ArrowLeft, Info } from "lucide-react"

import DashboardDocumentation from "@/components/dashboard/documentation/Dashboard"
import DevicesAndSensorsDocumentation from "@/components/dashboard/documentation/DevicesAndSensors"
import StatsDocumentation from "@/components/dashboard/documentation/Stats"
import AccountDocumentation from "@/components/dashboard/documentation/Account"
import AlertsDocumentation from "@/components/dashboard/documentation/Alerts"
import NavbarDocumentation from "@/components/dashboard/documentation/NavbarDocumentation"

export default function DocumentationPage() {
  const router = useRouter()

  const pages = [
    {
      title: "Tableau de bord",
      component: DashboardDocumentation,
      value: "dashboard"
    },
    {
      title: "Appareils et capteurs",
      component: DevicesAndSensorsDocumentation,
      value: "devices"
    },
    {
      title: "Alertes",
      component: AlertsDocumentation,
      value: "alerts"
    },
    {
      title: "Compte",
      component: AccountDocumentation,
      value: "account"
    },
    {
      title: "Statistiques",
      component: StatsDocumentation,
      value: "stats"
    }
  ]

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
        <NavbarDocumentation />

        {pages.map((page) => (
          <TabsContent key={page.value} value={page.value} className="space-y-4">
            <page.component />
          </TabsContent>
        ))}
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