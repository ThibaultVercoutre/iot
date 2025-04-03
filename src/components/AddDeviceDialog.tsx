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

interface AddDeviceDialogProps {
  onDeviceAdded: () => void
}

export function AddDeviceDialog({ onDeviceAdded }: AddDeviceDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [joinEui, setJoinEui] = useState("")
  const [devEui, setDevEui] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !joinEui || !devEui) return

    setIsLoading(true)
    try {
      const token = document.cookie
        .split("; ")
        .find(row => row.startsWith("auth-token="))
        ?.split("=")[1]

      if (!token) return

      const response = await fetch("/api/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          joinEui,
          devEui
        }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la création du device")
      }

      setName("")
      setJoinEui("")
      setDevEui("")
      setOpen(false)
      onDeviceAdded()
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
          Ajouter un device
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter un device</DialogTitle>
            <DialogDescription>
              Créez un nouveau device pour regrouper vos capteurs.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom du device</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Device salon"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="joinEui">Join EUI</Label>
              <Input
                id="joinEui"
                value={joinEui}
                onChange={(e) => setJoinEui(e.target.value)}
                placeholder="Ex: 7878787878787878"
                maxLength={16}
              />
              <p className="text-sm text-muted-foreground">
                L'identifiant EUI de jointure doit faire 16 caractères
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="devEui">Dev EUI</Label>
              <Input
                id="devEui"
                value={devEui}
                onChange={(e) => setDevEui(e.target.value)}
                placeholder="Ex: 70B3D57ED006F550"
                maxLength={16}
              />
              <p className="text-sm text-muted-foreground">
                L'identifiant EUI du device doit faire 16 caractères
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading || !name || !joinEui || !devEui || joinEui.length !== 16 || devEui.length !== 16}>
              {isLoading ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 