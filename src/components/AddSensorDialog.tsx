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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AddSensorDialogProps {
  onSensorAdded: () => void
  deviceId: number
}

export function AddSensorDialog({ onSensorAdded, deviceId }: AddSensorDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState<SensorType>(SensorType.SOUND)
  const [threshold, setThreshold] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return

    setIsLoading(true)
    try {
      const token = document.cookie
        .split("; ")
        .find(row => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) return

      const isBinary = type === SensorType.BUTTON || type === SensorType.VIBRATION

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
          isBinary,
        }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la création du capteur")
      }

      const sensor = await response.json()
      console.log('Capteur créé:', sensor)

      // Si c'est un capteur de son et qu'un seuil est défini, créer le seuil
      if (type === SensorType.SOUND && threshold) {
        console.log('Création du seuil pour le capteur de son:', threshold)
        const thresholdResponse = await fetch(`/api/sensors/${sensor.id}/threshold`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            value: parseFloat(threshold)
          }),
        })

        if (!thresholdResponse.ok) {
          const error = await thresholdResponse.json()
          console.error('Erreur lors de la création du seuil:', error)
          throw new Error("Erreur lors de la création du seuil")
        }

        const thresholdData = await thresholdResponse.json()
        console.log('Seuil créé:', thresholdData)
      }

      setName("")
      setType(SensorType.SOUND)
      setThreshold("")
      setOpen(false)
      onSensorAdded()
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              <Select value={type} onValueChange={(value) => setType(value as SensorType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SensorType.SOUND}>Son</SelectItem>
                  <SelectItem value={SensorType.VIBRATION}>Vibration</SelectItem>
                  <SelectItem value={SensorType.BUTTON}>Bouton</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {type === SensorType.SOUND && (
              <div className="grid gap-2">
                <Label htmlFor="threshold">Seuil d&apos;alerte</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="Ex: 1450"
                />
                <p className="text-sm text-muted-foreground">
                  Une alerte sera déclenchée si la valeur dépasse ce seuil
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading || !name}>
              {isLoading ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 