"use client"

import { AlertCircle, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface AlertStatusProps {
  alertsEnabled: boolean | undefined
}

export function AlertStatus({ alertsEnabled }: AlertStatusProps) {

  if (alertsEnabled === undefined) {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className={`p-4 rounded-lg w-full sm:flex-1 bg-green-100 text-gray-800 border border-green-200`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">
               Chargement des alertes...
            </span>
          </div>
        </div>
        
        <Link href="/dashboard/alerts" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <History className="mr-2 h-4 w-4" />
            Historique des alertes
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
      <div className={`p-4 rounded-lg w-full sm:flex-1 ${
        alertsEnabled 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-orange-100 text-orange-800 border border-orange-200'
      }`}>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">
            {alertsEnabled 
              ? 'Les alertes sont actives' 
              : 'Les alertes sont suspendues'}
          </span>
        </div>
      </div>
      
      <Link href="/dashboard/alerts" className="w-full sm:w-auto">
        <Button className="w-full sm:w-auto">
          <History className="mr-2 h-4 w-4" />
          Historique des alertes
        </Button>
      </Link>
    </div>
  )
} 