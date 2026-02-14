"use client"

import { useEffect, useState } from "react"
import { Bell } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import useSWR from "swr"

export interface Notification {
  id: number
  usuario_id: number
  tipo: string
  titulo: string
  mensaje: string
  leida: boolean
  fecha_envio: string
  datos?: any
  created_at: string
  updated_at: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function NotificationsDropdown() {
  const { data = [], error, isLoading } = useSWR<Notification[]>('/api/notificaciones', fetcher, {
    refreshInterval: 15000,
  })

  const unreadCount = data?.filter((n) => !n.leida).length || 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notificaciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : error ? (
          <div className="py-6 text-center text-sm text-red-500">Error al cargar notificaciones</div>
        ) : data.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No hay notificaciones</div>
        ) : (
          data.slice(0, 5).map((notification) => (
            <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-3 cursor-pointer">
              <div className="flex items-start gap-2 w-full">
                {!notification.leida && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">{notification.titulo}</p>
                  <p className="text-sm text-muted-foreground">{notification.mensaje}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.fecha_envio).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center text-center cursor-pointer">
          Ver todas las notificaciones
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
