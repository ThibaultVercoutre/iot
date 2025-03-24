"use client"

import { useState } from "react"
import { SensorType } from "@prisma/client"
import { Plus } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AddSensorDialogProps {
  onSensorAdded: () => void;
}

export function AddSensorDialog({ onSensorAdded }: AddSensorDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState<SensorType | "">("")
  const [deviceId, setDeviceId] = useState("")
  const [joinEui, setJoinEui] = useState("")
  const [devEui, setDevEui] = useState("")
  const [isBinary, setIsBinary] = useState(false)
  const [threshold, setThreshold] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !type || !deviceId || !joinEui || !devEui) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/sensors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          type,
          deviceId,
          joinEui,
          devEui,
          isBinary,
          threshold: !isBinary && threshold ? parseFloat(threshold) : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la création du capteur")
      }

      // Réinitialiser le formulaire
      setName("")
      setType("")
      setDeviceId("")
      setJoinEui("")
      setDevEui("")
      setIsBinary(false)
      setThreshold("")
      setOpen(false)
      onSensorAdded()
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="flex h-full min-h-[300px] cursor-pointer items-center justify-center hover:bg-gray-50">
          <Plus className="h-12 w-12 text-gray-400" />
        </Card>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter un capteur</DialogTitle>
            <DialogDescription>
              Remplissez les informations ci-dessous pour ajouter un nouveau capteur.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom du capteur"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(value: SensorType) => setType(value)}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SensorType.SOUND}>Son</SelectItem>
                  <SelectItem value={SensorType.VIBRATION}>Vibration</SelectItem>
                  <SelectItem value={SensorType.BUTTON}>Bouton</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deviceId">Device ID</Label>
              <Input
                id="deviceId"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="ID de l'appareil"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="joinEui">Join EUI</Label>
              <Input
                id="joinEui"
                value={joinEui}
                onChange={(e) => setJoinEui(e.target.value)}
                placeholder="Join EUI"
                maxLength={16}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="devEui">Dev EUI</Label>
              <Input
                id="devEui"
                value={devEui}
                onChange={(e) => setDevEui(e.target.value)}
                placeholder="Dev EUI"
                maxLength={16}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="isBinary"
                checked={isBinary}
                onCheckedChange={setIsBinary}
              />
              <Label htmlFor="isBinary">Capteur binaire (ON/OFF)</Label>
            </div>
            {!isBinary && (
              <div className="grid gap-2">
                <Label htmlFor="threshold">Seuil</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="Seuil d'alerte"
                  step="0.1"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 