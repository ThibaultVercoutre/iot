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

      const response = await fetch("/api/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
        }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la création du device")
      }

      setName("")
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