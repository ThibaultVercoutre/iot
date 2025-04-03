"use client"

import { Filter, Clock } from "lucide-react"
import { SensorType } from '@prisma/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

interface DashboardFiltersProps {
  selectedPeriod: '1h' | '3h' | '6h' | '12h' | 'day' | 'week' | 'month'
  selectedType: SensorType | 'all'
  alertFilter: 'all' | 'alert'
  viewMode: 'grid' | 'list'
  onPeriodChange: (value: '1h' | '3h' | '6h' | '12h' | 'day' | 'week' | 'month') => void
  onTypeChange: (value: SensorType | 'all') => void
  onAlertFilterChange: (value: 'all' | 'alert') => void
  onViewModeChange: (value: 'grid' | 'list') => void
}

export function DashboardFilters({
  selectedPeriod,
  selectedType,
  alertFilter,
  viewMode,
  onPeriodChange,
  onTypeChange,
  onAlertFilterChange,
  onViewModeChange
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 w-full sm:w-auto">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4" />
        <Select value={selectedPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sélectionner une période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">1 heure</SelectItem>
            <SelectItem value="3h">3 heures</SelectItem>
            <SelectItem value="6h">6 heures</SelectItem>
            <SelectItem value="12h">12 heures</SelectItem>
            <SelectItem value="day">24 heures</SelectItem>
            <SelectItem value="week">1 semaine</SelectItem>
            <SelectItem value="month">1 mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4" />
        <Select value={selectedType} onValueChange={onTypeChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value={SensorType.SOUND}>Son</SelectItem>
            <SelectItem value={SensorType.VIBRATION}>Vibration</SelectItem>
            <SelectItem value={SensorType.BUTTON}>Bouton</SelectItem>
          </SelectContent>
        </Select>

        <Select value={alertFilter} onValueChange={onAlertFilterChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="État" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="alert">En alerte</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onViewModeChange(viewMode === 'grid' ? 'list' : 'grid')}
          className="h-9 w-9"
        >
          {viewMode === 'grid' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          )}
        </Button>
      </div>
    </div>
  )
} 