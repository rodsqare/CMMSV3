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
    console.log('[v0] getNotificationsForUser - session:', !!session, session?.email, session?.id)
    
    if (!session) {
      console.error('[v0] getNotificationsForUser - no session found, cannot fetch notifications')
      return []
    }
    
    console.log('[v0] getNotificationsForUser - fetching notifications for user:', session.id)
    const notifications = await prisma.notificacion.findMany({
      where: { usuario_id: session.id },
      orderBy: { created_at: 'desc' },
      take: 50,
    })
    
    console.log('[v0] getNotificationsForUser - found', notifications.length, 'notifications for user', session.id)
    return notifications as Notification[]
  } catch (error) {
    console.error("[v0] Error fetching notifications:", error)
    throw error
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

/**
 * Genera automáticamente notificaciones para mantenimientos próximos, vencidos o sin técnico asignado
 */
export async function generateMaintenanceNotifications(): Promise<{ notificaciones_creadas: number }> {
  let totalCreadas = 0
  
  try {
    console.log('[v0] Starting automatic maintenance notifications generation')
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Obtener todos los usuarios activos (especialmente administradores y gestores)
    const usuarios = await prisma.usuario.findMany({
      where: { 
        activo: true,
        rol: { in: ['admin', 'gestor'] }
      },
    })
    
    if (usuarios.length === 0) {
      console.log('[v0] No active users found to receive maintenance notifications')
      return { notificaciones_creadas: 0 }
    }
    
    // 1. Mantenimientos vencidos (proxima_programada < hoy)
    const mantenimientosVencidos = await prisma.mantenimiento.findMany({
      where: {
        activo: true,
        proxima_programada: { lt: today },
      },
      include: {
        equipo: true,
        realizaciones: {
          orderBy: { fecha_realizacion: 'desc' },
          take: 1,
        },
      },
    })
    
    console.log('[v0] Found', mantenimientosVencidos.length, 'overdue maintenances')
    
    for (const mant of mantenimientosVencidos) {
      const diasVencido = Math.floor((today.getTime() - mant.proxima_programada.getTime()) / (1000 * 60 * 60 * 24))
      const titulo = `Mantenimiento vencido: ${mant.equipo.nombre}`
      const mensaje = `El mantenimiento ${mant.tipo} del equipo ${mant.equipo.nombre} (${mant.equipo.codigo}) estaba programado para hace ${diasVencido} días.`
      
      const creadas = await createMaintenanceNotificationForAllUsers(usuarios, titulo, mensaje, 'mantenimiento_vencido', mant.id)
      totalCreadas += creadas
    }
    
    // 2. Mantenimientos próximos (proxima_programada entre hoy y 7 días)
    const semanaDespues = new Date(today)
    semanaDespues.setDate(semanaDespues.getDate() + 7)
    
    const mantenimientosProximos = await prisma.mantenimiento.findMany({
      where: {
        activo: true,
        proxima_programada: {
          gte: today,
          lte: semanaDespues,
        },
      },
      include: {
        equipo: true,
      },
    })
    
    console.log('[v0] Found', mantenimientosProximos.length, 'upcoming maintenances')
    
    for (const mant of mantenimientosProximos) {
      const diasFaltantes = Math.floor((mant.proxima_programada.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const titulo = `Mantenimiento próximo: ${mant.equipo.nombre}`
      const mensaje = `El mantenimiento ${mant.tipo} del equipo ${mant.equipo.nombre} (${mant.equipo.codigo}) está programado para ${diasFaltantes} día(s).`
      
      const creadas = await createMaintenanceNotificationForAllUsers(usuarios, titulo, mensaje, 'mantenimiento_proximo', mant.id)
      totalCreadas += creadas
    }
    
    // 3. Mantenimientos sin técnico asignado
    // En este caso, buscar órdenes de mantenimiento sin asignar
    const ordenesMantenimientoSinAsignar = await prisma.ordenTrabajo.findMany({
      where: {
        tipo: { in: ['mantenimiento', 'preventivo', 'correctivo'] },
        asignado_a: null,
        estado: { not: 'completado' },
      },
      include: {
        equipo: true,
      },
    })
    
    console.log('[v0] Found', ordenesMantenimientoSinAsignar.length, 'maintenance orders without technician')
    
    for (const orden of ordenesMantenimientoSinAsignar) {
      const titulo = `Orden de mantenimiento sin asignar: ${orden.equipo.nombre}`
      const mensaje = `La orden de trabajo #${orden.numero_orden} (${orden.tipo}) para el equipo ${orden.equipo.nombre} (${orden.equipo.codigo}) no tiene técnico asignado.`
      
      const creadas = await createMaintenanceNotificationForAllUsers(usuarios, titulo, mensaje, 'mantenimiento_sin_asignar', orden.id)
      totalCreadas += creadas
    }
    
    console.log('[v0] Automatic maintenance notifications generation completed, total created:', totalCreadas)
    return { notificaciones_creadas: totalCreadas }
  } catch (error) {
    console.error('[v0] Error generating maintenance notifications:', error)
    return { notificaciones_creadas: 0 }
  }
}

/**
 * Crea una notificación para todos los usuarios administradores/gestores
 * Retorna el número de notificaciones creadas
 */
async function createMaintenanceNotificationForAllUsers(
  usuarios: any[],
  titulo: string,
  mensaje: string,
  tipo: string,
  referencia_id: number
): Promise<number> {
  try {
    let creadas = 0
    // Verificar si la notificación ya existe para evitar duplicados (últimas 24 horas)
    const horaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    for (const usuario of usuarios) {
      const notificacionExistente = await prisma.notificacion.findFirst({
        where: {
          usuario_id: usuario.id,
          tipo: tipo,
          titulo: titulo,
          created_at: { gte: horaAtras },
        },
      })
      
      if (!notificacionExistente) {
        await prisma.notificacion.create({
          data: {
            usuario_id: usuario.id,
            tipo: tipo,
            titulo: titulo,
            mensaje: mensaje,
            datos: {
              referencia_id: referencia_id,
              generada_automaticamente: true,
            },
          },
        })
        
        console.log('[v0] Created notification for user', usuario.id, 'tipo:', tipo)
        creadas++
      }
    }
    
    return creadas
  } catch (error) {
    console.error('[v0] Error creating maintenance notification:', error)
    return 0
  }
}
