import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Home, AlertCircle, Settings, PieChart, Tablet } from "lucide-react"

export default function NavbarDocumentation() {
  return (
    <TabsList className="grid grid-cols-5 gap-2">
      <TabsTrigger value="dashboard" className="flex items-center gap-2 cursor-pointer">
        <Home className="h-4 w-4" />
        <span className="hidden md:inline">Tableau de bord</span>
      </TabsTrigger>
      <TabsTrigger value="devices" className="flex items-center gap-2 cursor-pointer">
        <Tablet className="h-4 w-4" />
        <span className="hidden md:inline">Appareils et capteurs</span>
      </TabsTrigger>
      <TabsTrigger value="alerts" className="flex items-center gap-2 cursor-pointer">
        <AlertCircle className="h-4 w-4" />
        <span className="hidden md:inline">Alertes</span>
      </TabsTrigger>
      <TabsTrigger value="account" className="flex items-center gap-2 cursor-pointer">
        <Settings className="h-4 w-4" />
        <span className="hidden md:inline">Compte</span>
      </TabsTrigger>
      <TabsTrigger value="stats" className="flex items-center gap-2 cursor-pointer">
        <PieChart className="h-4 w-4" />
        <span className="hidden md:inline">Statistiques</span>
      </TabsTrigger>
    </TabsList>
  )
}
