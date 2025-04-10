"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { SensorType } from '@prisma/client'

import { AddDeviceDialog } from "@/components/AddDeviceDialog"
import { AlertStatus } from "../../components/dashboard/AlertStatus"
import { ActiveAlerts } from "../../components/dashboard/ActiveAlerts"
import { DashboardFilters } from "../../components/dashboard/DashboardFilters"
import { Device } from "../../components/dashboard/Device"
import { verifyAuth, getUser } from "@/services/authService"
import { getDevicesWithSensors } from "@/services/deviceService"
import { getAlertLogs, AlertLog } from "@/services/alertService"
import { Device as DeviceType, User } from "@/types/sensors"
import { TimePeriod } from "@/lib/time-utils"

// Constantes pour les intervalles d'actualisation
const ALERTS_REFRESH_INTERVAL = 1000; // 10 secondes (peut rester moins fréquent)
const DATA_REFRESH_INTERVAL = 1000;    // 1 seconde comme avant


export default function Dashboard() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [devices, setDevices] = useState<DeviceType[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [activeAlerts, setActiveAlerts] = useState<AlertLog[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('day')
  const [selectedType, setSelectedType] = useState<SensorType | 'all'>('all')
  const [alertFilter, setAlertFilter] = useState<'all' | 'alert'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [timeOffset, setTimeOffset] = useState<number>(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Référence pour suivre si les données sont en cours de chargement
  const isFetchingRef = useRef(false);

  // Restaurer les filtres depuis le localStorage
  useEffect(() => {
    const savedPeriod = localStorage.getItem('dashboardPeriod')
    const savedType = localStorage.getItem('dashboardType')
    const savedAlertFilter = localStorage.getItem('dashboardAlertFilter')
    const savedViewMode = localStorage.getItem('dashboardViewMode')
    const savedTimeOffset = localStorage.getItem('dashboardTimeOffset')

    if (savedPeriod) setSelectedPeriod(savedPeriod as TimePeriod)
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

  // Fonction optimisée pour récupérer les alertes actives
  const fetchAlerts = useCallback(async () => {
    try {
      const alerts = await getAlertLogs(true) // Récupérer uniquement les alertes actives
      setActiveAlerts(alerts)
    } catch (error) {
      console.error("Erreur lors de la récupération des alertes :", error)
    }
  }, []);

  // Récupérer les alertes actives périodiquement
  useEffect(() => {
    if (isLoading) return;
    
    fetchAlerts();
    
    // Rafraîchir les alertes à un intervalle raisonnable
    const alertsInterval = setInterval(fetchAlerts, ALERTS_REFRESH_INTERVAL);
    return () => clearInterval(alertsInterval);
  }, [isLoading, fetchAlerts]);

  // Filtrer les devices en fonction des filtres sélectionnés
  const filteredDevices = devices.filter(device => {
    // Filtrer par type de capteur
    if (selectedType !== 'all') {
      const hasMatchingSensor = device.sensors.some(sensor => sensor.type === selectedType)
      if (!hasMatchingSensor) return false
    }
    
    // Filtrer par état d'alerte
    if (alertFilter === 'alert') {
      // Utiliser les données d'alerte du service au lieu de historicalData
      const hasAlertSensor = device.sensors.some(sensor => {
        return activeAlerts.some(alert => alert.sensor.id === sensor.id && alert.isActive)
      })
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
  }, [])

  // Réinitialiser le décalage temporel lors du changement de période
  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period)
    setTimeOffset(0) // Réinitialiser le décalage temporel
  }

  // Vérification de l'authentification une seule fois au chargement
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

  // Fonction optimisée pour récupérer les données des appareils et capteurs
  const fetchData = useCallback(async (showRefreshState = false) => {
    // Éviter les appels simultanés
    if (isFetchingRef.current) return;
    
    try {
      isFetchingRef.current = true;
      if (showRefreshState) setIsRefreshing(true);
      
      const [userData, devicesWithSensors] = await Promise.all([
        getUser(),
        getDevicesWithSensors(selectedPeriod, timeOffset)
      ]);
      
      setUser(userData);
      setDevices(devicesWithSensors);
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
    } finally {
      isFetchingRef.current = false;
      if (showRefreshState) setIsRefreshing(false);
    }
  }, [selectedPeriod, timeOffset]);

  // Récupérer les données périodiquement
  useEffect(() => {
    // Exécuter fetchData immédiatement lors du chargement ou d'un changement de filtre
    fetchData();

    // Configurer l'intervalle avec une fréquence plus raisonnable
    const interval = setInterval(() => fetchData(), DATA_REFRESH_INTERVAL);

    // Nettoyer l'intervalle lors du démontage du composant
    return () => clearInterval(interval);
  }, [fetchData]);

  // Fonction pour déclencher une actualisation manuelle des données
  const handleManualRefresh = () => {
    fetchData(true); 
  };

  // Mettre à jour l'état d'alerte des capteurs en fonction des alertes actives
  useEffect(() => {
    if (activeAlerts.length > 0 && devices.length > 0) {
      const updatedDevices = devices.map(device => {
        const updatedSensors = device.sensors.map(sensor => {
          // Vérifier si le capteur a une alerte active
          const isInAlert = activeAlerts.some(
            alert => alert.sensor.id === sensor.id && alert.isActive
          )
          return { ...sensor, isInAlert }
        })
        return { ...device, sensors: updatedSensors }
      })
      setDevices(updatedDevices)
    }
  }, [activeAlerts])

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
      
      <ActiveAlerts alerts={activeAlerts} />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Tableau de bord des capteurs</h1>
          <button 
            onClick={handleManualRefresh} 
            disabled={isRefreshing}
            className="p-2 text-sm rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
            title="Actualiser les données"
          >
            {isRefreshing ? (
              <span className="animate-spin inline-block h-5 w-5 border-t-2 border-b-2 border-blue-600 rounded-full" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 16H3v5" />
              </svg>
            )}
          </button>
        </div>
        
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
            activeAlerts={activeAlerts}
          />
        ))}
        
        <AddDeviceDialog onDeviceAdded={async () => {
          try {
            const devicesWithSensors = await getDevicesWithSensors(selectedPeriod, timeOffset)
            setDevices(devicesWithSensors)
          } catch (error) {
            console.error('Erreur lors de la récupération des données:', error)
          }
        }} />
      </div>
    </div>
  )
} 