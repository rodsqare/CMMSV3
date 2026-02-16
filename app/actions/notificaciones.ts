"use server"

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

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
    console.log('[v0] getNotificationsForUser - attempting to get session')
    const session = await getSession()
    console.log('[v0] getNotificationsForUser - session:', !!session, session?.email)
    
    if (!session) {
      console.log('[v0] getNotificationsForUser - no session found')
      return []
    }
    
    const notifications = await prisma.notificacion.findMany({
      where: { usuario_id: session.id },
      orderBy: { created_at: 'desc' },
      take: 50,
    })
    
    console.log('[v0] getNotificationsForUser - found', notifications.length, 'notifications')
    return notifications as Notification[]
  } catch (error) {
    console.error("[v0] Error fetching notifications:", error)
    return []
  }
}

export async function markNotificationAsRead(id: number): Promise<{ success: boolean }> {
  try {
    const session = await getSession()
    
    if (!session) {
      return { success: false }
    }
    
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
    const session = await getSession()
    
    if (!session) {
      return { success: false }
    }
    
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
    const session = await getSession()
    
    if (!session) {
      return { success: false }
    }
    
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
    const session = await getSession()
    
    if (!session) {
      return 0
    }
    
    const count = await prisma.notificacion.count({
      where: { usuario_id: session.id, leida: false },
    })
    
    return count
  } catch (error) {
    console.error("[v0] Error getting unread count:", error)
    return 0
  }
}
