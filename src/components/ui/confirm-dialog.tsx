"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmDialogProps {
  trigger: React.ReactNode
  title: string
  description: string
  onConfirm: () => void
  confirmText?: string
  cancelText?: string
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  onConfirm,
  confirmText = "Confirmer",
  cancelText = "Annuler"
}: ConfirmDialogProps) {
  const closeDialog = () => {
    const closeButton = document.querySelector(`[data-state="open"]`)?.querySelector('[aria-label="Close"]') as HTMLButtonElement
    if (closeButton) closeButton.click()
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={closeDialog}
          >
            {cancelText}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm()
              closeDialog()
            }}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 