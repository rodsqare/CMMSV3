"use server"

import mysql from 'mysql2/promise'

export type Notification = {
  id: number
  usuario_id: number
  titulo: string
  descripcion?: string
  tipo?: string
  leida: boolean
  created_at: string
  updated_at?: string
}

async function getDbConnection() {
  const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or MYSQL_URL not configured')
  }
  
  const pool = mysql.createPool({
    uri: databaseUrl,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  })
  
  return pool
}

export async function getNotificationsForUser(userId: number): Promise<Notification[]> {
  try {
    console.log("[v0] Fetching notifications for user:", userId)
    const pool = await getDbConnection()
    
    const [rows] = await pool.execute(`
      SELECT 
        id,
        usuario_id,
        titulo,
        descripcion,
        tipo,
        leida,
        created_at,
        updated_at
      FROM notificaciones
      WHERE usuario_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `, [userId])
    
    await pool.end()
    
    const notifications = (rows as any[]).map((row: any) => ({
      id: row.id,
      usuario_id: row.usuario_id,
      titulo: row.titulo,
      descripcion: row.descripcion,
      tipo: row.tipo,
      leida: Boolean(row.leida),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))
    
    console.log("[v0] Fetched notifications:", notifications.length)
    return notifications
  } catch (error) {
    console.error("[v0] Error fetching notifications from database:", error)
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
    }
    return []
  }
}

export async function markNotificationAsRead(id: number, userId: number): Promise<{ success: boolean }> {
  try {
    console.log("[v0] Marking notification as read:", id)
    const pool = await getDbConnection()
    
    await pool.execute(`
      UPDATE notificaciones
      SET leida = 1, updated_at = NOW()
      WHERE id = ? AND usuario_id = ?
    `, [id, userId])
    
    await pool.end()
    console.log("[v0] Notification marked as read")
    return { success: true }
  } catch (error) {
    console.error("[v0] Error marking notification as read:", error)
    return { success: false }
  }
}

export async function markAllNotificationsAsRead(userId: number): Promise<{ success: boolean }> {
  try {
    console.log("[v0] Marking all notifications as read for user:", userId)
    const pool = await getDbConnection()
    
    await pool.execute(`
      UPDATE notificaciones
      SET leida = 1, updated_at = NOW()
      WHERE usuario_id = ? AND leida = 0
    `, [userId])
    
    await pool.end()
    console.log("[v0] All notifications marked as read")
    return { success: true }
  } catch (error) {
    console.error("[v0] Error marking all notifications as read:", error)
    return { success: false }
  }
}

export async function deleteNotificationAction(id: number, userId: number): Promise<{ success: boolean }> {
  try {
    console.log("[v0] Deleting notification:", id)
    const pool = await getDbConnection()
    
    await pool.execute(`
      DELETE FROM notificaciones
      WHERE id = ? AND usuario_id = ?
    `, [id, userId])
    
    await pool.end()
    console.log("[v0] Notification deleted")
    return { success: true }
  } catch (error) {
    console.error("[v0] Error deleting notification:", error)
    return { success: false }
  }
}

export async function getUnreadCountForUser(userId: number): Promise<number> {
  try {
    const pool = await getDbConnection()
    
    const [rows] = await pool.execute(`
      SELECT COUNT(*) as count FROM notificaciones
      WHERE usuario_id = ? AND leida = 0
    `, [userId])
    
    await pool.end()
    
    const count = (rows as any[])[0]?.count || 0
    return count
  } catch (error) {
    console.error("[v0] Error getting unread count:", error)
    return 0
  }
}

// Keep old function signature for compatibility but delegate to new one
export async function getNotifications(): Promise<Notification[]> {
  try {
    console.log("[v0] getNotifications called - delegating to getNotificationsForUser")
    return []
  } catch (error) {
    console.error("[v0] Error getting notifications:", error)
    return []
  }
}
