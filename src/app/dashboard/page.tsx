"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { DashboardFilters, loadDashboardPreferences, saveDashboardPreferences, loadDashboardData, filterDevices, updateSensorsAlertStatus } from "@/services/dashboardService"
import { useErrorHandler } from "@/lib/error-utils"
import { AddDeviceDialog } from "@/components/AddDeviceDialog"
import { AlertStatus } from "../../components/dashboard/AlertStatus"
import { ActiveAlerts } from "../../components/dashboard/ActiveAlerts"
import { DashboardFilters as DashboardFiltersComponent } from "../../components/dashboard/DashboardFilters"
import { Device } from "../../components/dashboard/Device"
import { verifyAuth } from "@/services/authService"
import { getDevicesWithSensors } from "@/services/deviceService"
import { Device as DeviceType, User } from "@/types/sensors"
import { AlertLog } from "@/services/alertService"
import { TimePeriod } from "@/lib/time-utils"
import { SensorType } from "@prisma/client"

// Constante pour l'intervalle d'actualisation
const DATA_REFRESH_INTERVAL = 1000;    // 1 seconde pour rafraîchissement rapide

export default function Dashboard() {
  const router = useRouter()
  const handleError = useErrorHandler()
  
  // État
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [devices, setDevices] = useState<DeviceType[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [activeAlerts, setActiveAlerts] = useState<AlertLog[]>([])
  
  // Filtres
  const [filters, setFilters] = useState<DashboardFilters>(loadDashboardPreferences())
  
  // Référence pour éviter les requêtes simultanées
  const isFetchingRef = useRef(false)
  
  // Filtrer les appareils selon les critères sélectionnés
  const filteredDevices = useMemo(() => {
    return filterDevices(devices, activeAlerts, filters);
  }, [devices, activeAlerts, filters]);

  // Charger les données du tableau de bord
  const fetchDashboardData = useCallback(async (showRefreshState = false) => {
    if (isFetchingRef.current) return;
    
    try {
      isFetchingRef.current = true;
      if (showRefreshState) setIsRefreshing(true);
      
      const dashboardData = await loadDashboardData(filters);
      setUser(dashboardData.user);
      
      // Mettre à jour les alertes et appliquer l'état d'alerte aux capteurs
      setActiveAlerts(dashboardData.activeAlerts);
      setDevices(updateSensorsAlertStatus(dashboardData.devices, dashboardData.activeAlerts));
    } catch (error) {
      handleError(error);
    } finally {
      isFetchingRef.current = false;
      if (showRefreshState) setIsRefreshing(false);
    }
  }, [filters, handleError]);
  
  // Vérifier l'authentification
  useEffect(() => {
    async function checkAuth() {
      try {
        await verifyAuth();
        setIsLoading(false);
      } catch (error) {
        handleError(error);
        router.push("/");
      }
    }
    checkAuth();
  }, [router, handleError]);
  
  // Charger les données initiales et configurer l'intervalle d'actualisation
  useEffect(() => {
    if (isLoading) return;
    
    // Charger les données immédiatement
    fetchDashboardData();
    
    // Configurer l'intervalle de rafraîchissement
    const interval = setInterval(() => fetchDashboardData(), DATA_REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [isLoading, fetchDashboardData]);
  
  // Sauvegarder les préférences de filtre
  useEffect(() => {
    saveDashboardPreferences(filters);
  }, [filters]);
  
  // Fonctions de gestion des filtres
  const handlePeriodChange = useCallback((period: TimePeriod) => {
    setFilters(prev => ({
      ...prev,
      period,
      timeOffset: 0 // Réinitialiser le décalage temporel lors du changement de période
    }));
  }, []);
  
  const handleTypeChange = useCallback((type: SensorType | 'all') => {
    setFilters(prev => ({ ...prev, type }));
  }, []);
  
  const handleAlertFilterChange = useCallback((alertFilter: 'all' | 'alert') => {
    setFilters(prev => ({ ...prev, alertFilter }));
  }, []);
  
  const handleViewModeChange = useCallback((viewMode: 'grid' | 'list') => {
    setFilters(prev => ({ ...prev, viewMode }));
  }, []);
  
  const handleTimeOffsetChange = useCallback((timeOffset: number) => {
    setFilters(prev => ({ ...prev, timeOffset }));
  }, []);
  
  // Mettre à jour un device spécifique
  const handleDeviceChange = useCallback((updatedDevice: DeviceType) => {
    setDevices(prevDevices => 
      prevDevices.map(device => 
        device.id === updatedDevice.id ? updatedDevice : device
      )
    );
  }, []);
  
  // Actualisation manuelle des données
  const handleManualRefresh = useCallback(() => {
    fetchDashboardData(true);
  }, [fetchDashboardData]);
  
  // Ajout d'un nouveau device
  const handleDeviceAdded = useCallback(async () => {
    try {
      const devicesWithSensors = await getDevicesWithSensors(filters.period, filters.timeOffset);
      setDevices(devicesWithSensors);
    } catch (error) {
      handleError(error);
    }
  }, [filters.period, filters.timeOffset, handleError]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {user && <AlertStatus alertsEnabled={user.alertsEnabled} />}
      
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
        
        <DashboardFiltersComponent
          selectedPeriod={filters.period}
          selectedType={filters.type}
          alertFilter={filters.alertFilter}
          viewMode={filters.viewMode}
          onPeriodChange={handlePeriodChange}
          onTypeChange={handleTypeChange}
          onAlertFilterChange={handleAlertFilterChange}
          onViewModeChange={handleViewModeChange}
          timeOffset={filters.timeOffset}
          onTimeOffsetChange={handleTimeOffsetChange}
        />
      </div>
      
      <div className="grid gap-6">
        {filteredDevices.map(device => (
          <Device 
            key={device.id}
            device={device}
            viewMode={filters.viewMode}
            selectedPeriod={filters.period}
            user={user}
            onDeviceChange={handleDeviceChange}
            timeOffset={filters.timeOffset}
            activeAlerts={activeAlerts}
          />
        ))}
        
        <AddDeviceDialog onDeviceAdded={handleDeviceAdded} />
      </div>
    </div>
  )
} 