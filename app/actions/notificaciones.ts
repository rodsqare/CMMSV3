"use server"

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

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

export async function getNotificationsForUser(): Promise<Notification[]> {
  try {
    const session = await requireAuth()
    
    const notifications = await prisma.notificacion.findMany({
      where: { usuario_id: session.id },
      orderBy: { created_at: 'desc' },
      take: 50,
    })
    
    return notifications as Notification[]
  } catch (error) {
    console.error("[v0] Error fetching notifications:", error)
    return []
  }
}

export async function markNotificationAsRead(id: number): Promise<{ success: boolean }> {
  try {
    const session = await requireAuth()
    
    const notification = await prisma.notificacion.findUnique({
      where: { id },
    })
    
    if (!notification || notification.usuario_id !== session.id) {
      return { success: false }
    }
    
    await prisma.notificacion.update({
      where: { id },
      data: { leida: true },
    })
    
    return { success: true }
  } catch (error) {
    console.error("[v0] Error marking notification as read:", error)
    return { success: false }
  }
}

export async function markAllNotificationsAsRead(): Promise<{ success: boolean }> {
  try {
    const session = await requireAuth()
    
    await prisma.notificacion.updateMany({
      where: { usuario_id: session.id, leida: false },
      data: { leida: true },
    })
    
    return { success: true }
  } catch (error) {
    console.error("[v0] Error marking all notifications as read:", error)
    return { success: false }
  }
}

export async function deleteNotificationAction(id: number): Promise<{ success: boolean }> {
  try {
    const session = await requireAuth()
    
    const notification = await prisma.notificacion.findUnique({
      where: { id },
    })
    
    if (!notification || notification.usuario_id !== session.id) {
      return { success: false }
    }
    
    await prisma.notificacion.delete({
      where: { id },
    })
    
    return { success: true }
  } catch (error) {
    console.error("[v0] Error deleting notification:", error)
    return { success: false }
  }
}

export async function getUnreadCount(): Promise<number> {
  try {
    const session = await requireAuth()
    
    const count = await prisma.notificacion.count({
      where: { usuario_id: session.id, leida: false },
    })
    
    return count
  } catch (error) {
    console.error("[v0] Error getting unread count:", error)
    return 0
  }
}
