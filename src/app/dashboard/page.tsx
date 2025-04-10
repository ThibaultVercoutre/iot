"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { SensorType } from '@prisma/client'

import { AddDeviceDialog } from "@/components/AddDeviceDialog"
import { AlertStatus } from "../../components/dashboard/AlertStatus"
import { ActiveAlerts } from "../../components/dashboard/ActiveAlerts"
import { DashboardFilters } from "../../components/dashboard/DashboardFilters"
import { Device } from "../../components/dashboard/Device"
import { verifyAuth, getUser } from "@/services/authService"
import { getDevicesWithSensors } from "@/services/deviceService"
import { Device as DeviceType, SensorWithData, User } from "@/types/sensors"

export default function Dashboard() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [devices, setDevices] = useState<DeviceType[]>([])
  const [sensorsInAlert, setSensorsInAlert] = useState<SensorWithData[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'1h' | '3h' | '6h' | '12h' | 'day' | 'week' | 'month'>('day')
  const [selectedType, setSelectedType] = useState<SensorType | 'all'>('all')
  const [alertFilter, setAlertFilter] = useState<'all' | 'alert'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [timeOffset, setTimeOffset] = useState<number>(0)

  // Restaurer les filtres depuis le localStorage
  useEffect(() => {
    const savedPeriod = localStorage.getItem('dashboardPeriod')
    const savedType = localStorage.getItem('dashboardType')
    const savedAlertFilter = localStorage.getItem('dashboardAlertFilter')
    const savedViewMode = localStorage.getItem('dashboardViewMode')
    const savedTimeOffset = localStorage.getItem('dashboardTimeOffset')

    if (savedPeriod) setSelectedPeriod(savedPeriod as '1h' | '3h' | '6h' | '12h' | 'day' | 'week' | 'month')
    if (savedType) setSelectedType(savedType as SensorType | 'all')
    if (savedAlertFilter) setAlertFilter(savedAlertFilter as 'all' | 'alert')
    if (savedViewMode) setViewMode(savedViewMode as 'grid' | 'list')
    if (savedTimeOffset) setTimeOffset(parseInt(savedTimeOffset, 10))
  }, [])

  // Sauvegarder les filtres dans le localStorage
  useEffect(() => {
    localStorage.setItem('dashboardPeriod', selectedPeriod)
    localStorage.setItem('dashboardType', selectedType)
    localStorage.setItem('dashboardAlertFilter', alertFilter)
    localStorage.setItem('dashboardViewMode', viewMode)
    localStorage.setItem('dashboardTimeOffset', timeOffset.toString())
  }, [selectedPeriod, selectedType, alertFilter, viewMode, timeOffset])

  // Filtrer les devices en fonction des filtres sélectionnés
  const filteredDevices = devices.filter(device => {
    // Filtrer par type de capteur
    if (selectedType !== 'all') {
      const hasMatchingSensor = device.sensors.some(sensor => sensor.type === selectedType)
      if (!hasMatchingSensor) return false
    }
    
    // Filtrer par état d'alerte
    if (alertFilter === 'alert') {
      const hasAlertSensor = device.sensors.some(sensor => sensor.isInAlert)
      if (!hasAlertSensor) return false
    }
    
    return true
  })

  // Fonction pour mettre à jour un device spécifique
  const handleDeviceChange = useCallback((updatedDevice: DeviceType) => {
    setDevices(prevDevices => 
      prevDevices.map(device => 
        device.id === updatedDevice.id ? updatedDevice : device
      )
    )
    
    // Mettre à jour les capteurs en alerte
    const allSensors = devices.flatMap(device => 
      device.id === updatedDevice.id 
        ? updatedDevice.sensors 
        : device.sensors
    )
    const alertSensors = allSensors.filter(sensor => sensor.isInAlert)
    setSensorsInAlert(alertSensors)
  }, [devices])

  // Réinitialiser le décalage temporel lors du changement de période
  const handlePeriodChange = (period: '1h' | '3h' | '6h' | '12h' | 'day' | 'week' | 'month') => {
    setSelectedPeriod(period)
    setTimeOffset(0) // Réinitialiser le décalage temporel
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await verifyAuth()
        setIsLoading(false)
      } catch (error) {
        console.error("Erreur lors de la vérification de l'authentification :", error)
        router.push("/")
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, devicesWithSensors] = await Promise.all([
          getUser(),
          getDevicesWithSensors(selectedPeriod, timeOffset)
        ])
        
        setUser(userData)
        setDevices(devicesWithSensors)
        
        // Filtrer les capteurs en alerte
        const alertSensors = devicesWithSensors.flatMap(device => 
          device.sensors.filter(sensor => sensor.isInAlert)
        )
        setSensorsInAlert(alertSensors)
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error)
      }
    }

    // Exécuter fetchData immédiatement
    fetchData()

    // Configurer l'intervalle pour exécuter fetchData toutes les secondes (uniquement si timeOffset = 0)
    let interval: NodeJS.Timeout | null = null
    if (timeOffset === 0) {
      interval = setInterval(fetchData, 1000)
    }

    // Nettoyer l'intervalle lors du démontage du composant
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [selectedPeriod, timeOffset])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      {user && (
        <AlertStatus alertsEnabled={user.alertsEnabled} />
      )}
      
      {user && user.alertsEnabled && sensorsInAlert.length > 0 && (
        <ActiveAlerts />
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Tableau de bord des capteurs</h1>
        
        <DashboardFilters
          selectedPeriod={selectedPeriod}
          selectedType={selectedType}
          alertFilter={alertFilter}
          viewMode={viewMode}
          onPeriodChange={handlePeriodChange}
          onTypeChange={setSelectedType}
          onAlertFilterChange={setAlertFilter}
          onViewModeChange={setViewMode}
          timeOffset={timeOffset}
          onTimeOffsetChange={setTimeOffset}
        />
      </div>
      
      <div className="grid gap-6">
        {filteredDevices.map(device => (
          <Device 
            key={device.id}
            device={device}
            viewMode={viewMode}
            selectedPeriod={selectedPeriod}
            user={user}
            onDeviceChange={handleDeviceChange}
            timeOffset={timeOffset}
          />
        ))}
        
        <AddDeviceDialog onDeviceAdded={async () => {
          try {
            const devicesWithSensors = await getDevicesWithSensors(selectedPeriod, timeOffset)
            setDevices(devicesWithSensors)
            
            // Filtrer les capteurs en alerte
            const alertSensors = devicesWithSensors.flatMap(device => 
              device.sensors.filter(sensor => sensor.isInAlert)
            )
            setSensorsInAlert(alertSensors)
          } catch (error) {
            console.error('Erreur lors de la récupération des données:', error)
          }
        }} />
      </div>
    </div>
  )
} 