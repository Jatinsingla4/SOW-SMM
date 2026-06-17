"use client"
import * as React from "react"
import { toast as sonnerToast, Toaster as Sonner } from "sonner"

type ToastProps = {
    title?: string
    description?: string
    variant?: "default" | "destructive"
}

export const toast = ({ title, description, variant }: ToastProps) => {
    if (variant === "destructive") {
        sonnerToast.error(title, { description })
    } else {
        sonnerToast.success(title, { description })
    }
}

export const useToast = () => ({ toast })

export function Toaster() {
    return <Sonner position="top-right" expand={false} richColors />
}
