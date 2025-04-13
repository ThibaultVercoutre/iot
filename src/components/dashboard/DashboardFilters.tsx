"use client"

import { Filter, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { SensorType } from '@prisma/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { TimePeriod, formatTimeOffset } from "@/lib/time-utils"

interface DashboardFiltersProps {
  selectedPeriod: TimePeriod
  selectedType: SensorType | 'all'
  alertFilter: 'all' | 'alert'
  viewMode: 'grid' | 'list'
  onPeriodChange: (period: TimePeriod) => void
  onTypeChange: (type: SensorType | 'all') => void
  onAlertFilterChange: (filter: 'all' | 'alert') => void
  onViewModeChange: (mode: 'grid' | 'list') => void
  timeOffset: number
  onTimeOffsetChange?: (offset: number) => void
}

export function DashboardFilters({
  selectedPeriod,
  selectedType,
  alertFilter,
  viewMode,
  onPeriodChange,
  onTypeChange,
  onAlertFilterChange,
  onViewModeChange,
  timeOffset = 0,
  onTimeOffsetChange
}: DashboardFiltersProps) {
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date>(new Date())
  
  // Journaliser la période sélectionnée lors du rendu initial et des changements
  useEffect(() => {
    console.log('DashboardFilters - selectedPeriod:', selectedPeriod);
  }, [selectedPeriod]);
  
  // Calculer les dates de début et de fin en fonction de la période et du décalage
  useEffect(() => {
    const end = new Date()
    let start = new Date()
    
    if (timeOffset !== 0) {
      // Si on a un décalage, on décale les deux dates
      end.setHours(end.getHours() - timeOffset * getPeriodInHours(selectedPeriod))
      start = new Date(end)
    }
    
    // Calculer la date de début en fonction de la période
    if (selectedPeriod === '1h') start.setHours(start.getHours() - 1)
    else if (selectedPeriod === '3h') start.setHours(start.getHours() - 3)
    else if (selectedPeriod === '6h') start.setHours(start.getHours() - 6)
    else if (selectedPeriod === '12h') start.setHours(start.getHours() - 12)
    else if (selectedPeriod === 'day') start.setDate(start.getDate() - 1)
    else if (selectedPeriod === 'week') start.setDate(start.getDate() - 7)
    else if (selectedPeriod === 'month') start.setMonth(start.getMonth() - 1)
    
    setStartDate(start)
    setEndDate(end)
  }, [selectedPeriod, timeOffset])
  
  // Fonction pour obtenir la période en heures
  const getPeriodInHours = (period: string): number => {
    switch(period) {
      case '1h': return 1
      case '3h': return 3
      case '6h': return 6
      case '12h': return 12
      case 'day': return 24
      case 'week': return 24 * 7
      case 'month': return 24 * 30
      default: return 24
    }
  }
  
  // Formater une date en format court lisible
  const formatDate = (date: Date): string => {
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  // Gérer le changement de décalage temporel
  const handleTimeNavigation = (direction: 'prev' | 'next') => {
    if (!onTimeOffsetChange) return
    
    if (direction === 'prev') {
      onTimeOffsetChange(timeOffset + 1)
    } else {
      // Ne pas aller au-delà du temps présent
      if (timeOffset > 0) {
        onTimeOffsetChange(timeOffset - 1)
      }
    }
  }
  
  // Déterminer si on est au temps présent
  const isPresent = timeOffset === 0
  
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
      <div className="flex items-center gap-2">
        {onTimeOffsetChange && (
          <>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => handleTimeNavigation('prev')}
              className="h-9 w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-sm px-2 min-w-[200px] text-center">
              {formatDate(startDate)} - {formatDate(endDate)}
              {!isPresent && (
                <div className="text-xs text-gray-500">
                  {timeOffset !== 0 && formatTimeOffset(selectedPeriod, timeOffset)}
                </div>
              )}
            </div>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => handleTimeNavigation('next')}
              className="h-9 w-9"
              disabled={isPresent}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
} 