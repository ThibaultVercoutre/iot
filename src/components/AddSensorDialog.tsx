"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { SensorType } from "@prisma/client"
import { v4 as uuidv4 } from 'uuid'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Device {
  id: number
  name: string
}

interface AddSensorDialogProps {
  onSensorAdded: () => void
}

export function AddSensorDialog({ onSensorAdded }: AddSensorDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState<SensorType>(SensorType.SOUND)
  const [deviceId, setDeviceId] = useState<number | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !deviceId) return

    setIsLoading(true)
    try {
      const token = document.cookie
        .split("; ")
        .find(row => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) return

      const response = await fetch("/api/sensors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          type,
          deviceId,
          uniqueId: uuidv4(),
          isBinary: type === SensorType.BUTTON
        }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la création du capteur")
      }

      setName("")
      setType(SensorType.SOUND)
      setDeviceId(null)
      setOpen(false)
      onSensorAdded()
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDevices = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find(row => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) return

      const response = await fetch("/api/devices", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des devices")
      }

      const data = await response.json()
      setDevices(data)
    } catch (error) {
      console.error("Erreur:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (isOpen) {
        fetchDevices()
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-full">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un capteur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter un capteur</DialogTitle>
            <DialogDescription>
              Créez un nouveau capteur pour suivre vos données.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom du capteur</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Capteur de son salon"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type de capteur</Label>
              <Select value={type} onValueChange={(value: SensorType) => setType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SensorType.SOUND}>Son</SelectItem>
                  <SelectItem value={SensorType.VIBRATION}>Vibration</SelectItem>
                  <SelectItem value={SensorType.BUTTON}>Bouton</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="device">Device</Label>
              <Select 
                value={deviceId?.toString() || ""} 
                onValueChange={(value) => setDeviceId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un device" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.id} value={device.id.toString()}>
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading || !name || !deviceId}>
              {isLoading ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 