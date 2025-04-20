"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { DashboardFilters, loadDashboardPreferences, saveDashboardPreferences, loadDashboardData, filterDevices, updateSensorsAlertStatus, DEFAULT_FILTERS } from "@/services/dashboardService"
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

// Pas besoin de constante pour le polling, nous utilisons maintenant les SSE
// const DATA_REFRESH_INTERVAL = 10000;

export default function Dashboard() {
  const router = useRouter()
  const handleError = useErrorHandler()
  
  // État
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [devices, setDevices] = useState<DeviceType[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [activeAlerts, setActiveAlerts] = useState<AlertLog[]>([])
  
  // Référence pour la connexion SSE
  const eventSourceRef = useRef<EventSource | null>(null)
  
  // Filtres avec valeurs par défaut
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  
  // Référence pour éviter les requêtes simultanées
  const isFetchingRef = useRef(false)
  
  // Filtrer les appareils selon les critères sélectionnés
  const filteredDevices = useMemo(() => {
    return filterDevices(devices, activeAlerts, filters);
  }, [devices, activeAlerts, filters]);

  // Charger les préférences utilisateur depuis la BD
  useEffect(() => {
    async function loadPreferences() {
      try {
        // Éviter de recharger si déjà chargé
        if (preferencesLoaded) return;
        
        const userPreferences = await loadDashboardPreferences();
        setFilters(userPreferences);
      } catch (error) {
        handleError(error, 'Chargement des préférences');
      } finally {
        setPreferencesLoaded(true);
      }
    }
    
    loadPreferences();
  }, [handleError, preferencesLoaded]);

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
      const maxRetries = 3;
      let retryCount = 0;
      let retryDelay = 1000; // 1 seconde de délai initial
      
      const attemptVerify = async () => {
        try {
          await verifyAuth();
          setIsLoading(false);
        } catch (error) {
          if (retryCount < maxRetries) {
            retryCount++;
            console.warn(`Tentative de reconnexion ${retryCount}/${maxRetries} après ${retryDelay}ms`);
            setTimeout(attemptVerify, retryDelay);
            // Backoff exponentiel pour les tentatives suivantes
            retryDelay = retryDelay * 2;
          } else {
            handleError(error);
            router.push("/");
          }
        }
      };
      
      attemptVerify();
    }
    checkAuth();
  }, [router, handleError]);
  
  // Configuration de la connexion SSE
  useEffect(() => {
    if (isLoading || !preferencesLoaded) return;

    // Charger les données initiales
    fetchDashboardData();

    // Récupérer le token d'authentification depuis les cookies
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth-token='))
      ?.split('=')[1];

    // Créer la connexion SSE avec le token
    const sseUrl = `/api/socket${token ? `?token=${token}` : ''}`;
    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    // Gérer les événements de la connexion SSE
    eventSource.onopen = () => {
      console.log('Connexion SSE établie');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'CONNECTION_ESTABLISHED':
            console.log(data.message);
            break;
            
          case 'SENSORS_UPDATED':
            // Mettre à jour le device spécifique
            setDevices(prevDevices => 
              prevDevices.map(device => 
                device.id === data.device.id 
                  ? updateSensorsAlertStatus([data.device], activeAlerts)[0] 
                  : device
              )
            );
            break;
          
          case 'NEW_ALERTS':
            // Actualiser la liste complète des alertes actives
            fetchDashboardData();
            break;
            
          case 'ALERTS_STATUS_CHANGED':
            // Mettre à jour l'état des alertes de l'utilisateur
            if (user) {
              setUser(prev => prev ? { ...prev, alertsEnabled: data.alertsEnabled } : prev);
            }
            break;
            
          default:
            console.log('Message SSE non reconnu:', data);
        }
      } catch (error) {
        console.error('Erreur lors du traitement du message SSE:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Erreur SSE:', error);
      
      // Fermer la connexion en cas d'erreur
      eventSource.close();
      eventSourceRef.current = null;
      
      // Essayer de reconnecter après un délai
      setTimeout(() => {
        if (document.visibilityState !== 'hidden') {
          console.log('Tentative de reconnexion SSE...');
          fetchDashboardData();
        }
      }, 3000);
    };

    // Nettoyage à la déconnexion
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isLoading, preferencesLoaded, fetchDashboardData, activeAlerts, user]);
  
  // Reconnexion SSE lors du retour sur l'onglet
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !eventSourceRef.current) {
        fetchDashboardData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchDashboardData]);
  
  // Fonctions de gestion des filtres
  const handlePeriodChange = useCallback((period: TimePeriod) => {
    
    // Validation supplémentaire pour s'assurer que la période est valide
    const validPeriods: TimePeriod[] = ['1h', '3h', '6h', '12h', 'day', 'week', 'month'];
    if (!validPeriods.includes(period)) {
      console.error(`Période invalide reçue: ${period}`);
      return;
    }
    
    // Force une mise à jour immédiate avec sauvegarde
    setFilters(prev => {
      const newFilters = {
        ...prev,
        period,
        timeOffset: 0, // Réinitialiser le décalage temporel lors du changement de période
        // Assurer que tous les champs obligatoires sont présents
        type: prev.type || 'all',
        alertFilter: prev.alertFilter || 'all',
        viewMode: prev.viewMode || 'grid'
      };
      
      
      // Sauvegarde locale immédiate
      try {
        localStorage.setItem('iot_dashboard_preferences', JSON.stringify(newFilters));
      } catch (e) {
        console.error('Erreur sauvegarde locale:', e);
      }
      
      // Sauvegarde en base de données directement
      saveDashboardPreferences(newFilters).catch(error => {
        console.error('Erreur sauvegarde préférences, désactivation temporaire:', error);
      });
      
      return newFilters;
    });
  }, []);
  
  const handleTypeChange = useCallback((type: SensorType | 'all') => {
    setFilters(prev => {
      const newFilters = { ...prev, type };
      saveDashboardPreferences(newFilters).catch(error => {
        console.error('Erreur sauvegarde type, désactivation temporaire:', error);
      });
      return newFilters;
    });
  }, []);
  
  const handleAlertFilterChange = useCallback((alertFilter: 'all' | 'alert') => {
    setFilters(prev => {
      const newFilters = { ...prev, alertFilter };
      saveDashboardPreferences(newFilters).catch(error => {
        console.error('Erreur sauvegarde alertFilter, désactivation temporaire:', error);
      });
      return newFilters;
    });
  }, []);
  
  const handleViewModeChange = useCallback((viewMode: 'grid' | 'list') => {
    setFilters(prev => {
      const newFilters = { ...prev, viewMode };
      saveDashboardPreferences(newFilters).catch(error => {
        console.error('Erreur sauvegarde viewMode, désactivation temporaire:', error);
      });
      return newFilters;
    });
  }, []);
  
  const handleTimeOffsetChange = useCallback((timeOffset: number) => {
    setFilters(prev => {
      const newFilters = { ...prev, timeOffset };
      saveDashboardPreferences(newFilters).catch(error => {
        console.error('Erreur sauvegarde timeOffset, désactivation temporaire:', error);
      });
      return newFilters;
    });
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
  
  if (isLoading || !preferencesLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {user ? (
        <AlertStatus alertsEnabled={user.alertsEnabled} />
      ) : (
        <AlertStatus alertsEnabled={undefined} />
      )}
      
      {user?.alertsEnabled && <ActiveAlerts alerts={activeAlerts} />}
      
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
            type={filters.type}
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