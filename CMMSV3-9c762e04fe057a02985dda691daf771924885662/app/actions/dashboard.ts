"use server"

import mysql from 'mysql2/promise'

export type DashboardStats = {
  usuariosCount: number
  equiposCount: number
  mantenimientosCount: number
  ordenesCount: number
  equiposPorFabricante: Array<{ nombre: string; cantidad: number }>
  mantenimientosPorMes: Array<{ mes: string; cantidad: number }>
}

const mockDashboardStats: DashboardStats = {
  usuariosCount: 0,
  equiposCount: 0,
  mantenimientosCount: 0,
  ordenesCount: 0,
  equiposPorFabricante: [],
  mantenimientosPorMes: (() => {
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    const result = []
    const today = new Date()
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      result.push({
        mes: meses[date.getMonth()],
        cantidad: 0,
      })
    }
    return result
  })(),
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

async function fetchDashboardStatsFromDatabase(): Promise<DashboardStats> {
  try {
    const pool = await getDbConnection()
    
    // Fetch all data in parallel
    const [usuariosResult, equiposResult, mantenimientosResult, ordenesResult, equiposPorMarcaResult] = await Promise.all([
      pool.execute('SELECT COUNT(*) as count FROM usuarios'),
      pool.execute('SELECT COUNT(*) as count FROM equipos'),
      pool.execute('SELECT COUNT(*) as count FROM mantenimientos'),
      pool.execute('SELECT COUNT(*) as count FROM ordenes_trabajo'),
      pool.execute(`
        SELECT marca as nombre, COUNT(*) as cantidad 
        FROM equipos 
        WHERE marca IS NOT NULL AND marca != ''
        GROUP BY marca 
        ORDER BY cantidad DESC 
        LIMIT 10
      `),
    ])
    
    // Get maintenance by month (last 6 months)
    const [mantenimientosPorMesResult] = await pool.execute(`
      SELECT 
        DATE_FORMAT(proxima_programada, '%Y-%m') as mes,
        COUNT(*) as cantidad
      FROM mantenimientos
      WHERE proxima_programada >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(proxima_programada, '%Y-%m')
      ORDER BY mes ASC
    `)
    
    await pool.end()
    
    // Process results
    const usuariosCount = (usuariosResult[0] as any[])[0].count
    const equiposCount = (equiposResult[0] as any[])[0].count
    const mantenimientosCount = (mantenimientosResult[0] as any[])[0].count
    const ordenesCount = (ordenesResult[0] as any[])[0].count
    
    const equiposPorFabricante = (equiposPorMarcaResult[0] as any[]).map((row: any) => ({
      nombre: row.nombre || 'Desconocido',
      cantidad: row.cantidad,
    }))
    
    // Build maintenance by month with all 6 months
    const mesesNombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    const mantenimientosPorMesMap = new Map<string, number>()
    
    // Initialize last 6 months
    const today = new Date()
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const mesKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      mantenimientosPorMesMap.set(mesKey, 0)
    }
    
    // Fill in data from query
    (mantenimientosPorMesResult as any[]).forEach((row: any) => {
      mantenimientosPorMesMap.set(row.mes, row.cantidad)
    })
    
    // Convert to array
    const mantenimientosPorMes: Array<{ mes: string; cantidad: number }> = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const mesKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const mesNombre = mesesNombres[date.getMonth()]
      mantenimientosPorMes.push({
        mes: mesNombre,
        cantidad: mantenimientosPorMesMap.get(mesKey) || 0,
      })
    }
    
    return {
      usuariosCount,
      equiposCount,
      mantenimientosCount,
      ordenesCount,
      equiposPorFabricante,
      mantenimientosPorMes,
    }
  } catch (error) {
    console.error("[v0] Error fetching dashboard stats from database:", error)
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
    }
    throw error
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    console.log("[v0] Dashboard - fetching stats from database...")
    const stats = await fetchDashboardStatsFromDatabase()
    console.log("[v0] Dashboard - stats received:", stats)
    return stats
  } catch (error) {
    console.error("[v0] Error fetching dashboard stats:", error)
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
    }
    console.log("[v0] Returning mock data as fallback")
    return mockDashboardStats
  }
}
