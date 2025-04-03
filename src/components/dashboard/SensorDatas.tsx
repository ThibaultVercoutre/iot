import { AlertCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import SensorChart from "@/components/dashboard/SensorChart"
import { formatValue, getSensorColor } from "@/lib/utils"
import { SensorData, SensorWithData, User } from "@/types/sensors"

interface SensorDatasProps {
  sensor: SensorWithData
  latestData: SensorData | null
  user: User | null
  thresholdValue: string
  setThresholdValue: (value: string) => void
  onThresholdChange: (sensorId: number, value: string) => Promise<void>
  viewMode: string
  selectedPeriod: string
}

export function SensorDatas({
  sensor,
  latestData,
  user,
  thresholdValue,
  setThresholdValue,
  onThresholdChange,
  viewMode,
  selectedPeriod
}: SensorDatasProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div 
          className={`text-4xl font-bold mb-2 ${
            user?.alertsEnabled && sensor.isInAlert ? 'text-red-500' : ''
          }`} 
          style={{ color: user?.alertsEnabled && sensor.isInAlert ? undefined : getSensorColor(sensor.type) }}
        >
          {latestData ? formatValue(sensor, latestData.value) : 'N/A'}
        </div>
        <div className="text-sm text-gray-500 mb-4">
          Dernière mise à jour: {latestData ? new Date(latestData.timestamp).toLocaleDateString() + ' ' + new Date(latestData.timestamp).toLocaleTimeString() : 'N/A'}
        </div>
        {!sensor.isBinary && (
          <div className="flex items-center gap-2 mb-4">
            <Label htmlFor={`threshold-${sensor.id}`} className="flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Seuil
            </Label>
            <Input
              id={`threshold-${sensor.id}`}
              type="number"
              value={thresholdValue}
              onChange={(e) => setThresholdValue(e.target.value)}
              onBlur={(e) => {
                if (e.target.value) {
                  onThresholdChange(sensor.id, e.target.value)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              className="w-24"
              min="0"
              step="0.1"
            />
          </div>
        )}
      </div>
      <div className={viewMode === 'list' ? 'h-[200px]' : ''}>
        <SensorChart 
          data={sensor.historicalData}
          label={sensor.name}
          color={getSensorColor(sensor.type)}
          timeRange={selectedPeriod === 'week' ? 168 : // 7 jours * 24h
                   selectedPeriod === 'month' ? 720 : // 30 jours * 24h
                   selectedPeriod === '12h' ? 12 :
                   selectedPeriod === '6h' ? 6 :
                   selectedPeriod === '3h' ? 3 :
                   selectedPeriod === '1h' ? 1 :
                   24} // 24h par défaut (day)
          threshold={sensor.threshold?.value}
          isBinary={sensor.isBinary}
        />
      </div>
    </div>
  )
} 