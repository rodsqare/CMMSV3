"use server"

import { prisma, waitForDbInit } from "@/lib/prisma"

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

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Check DATABASE_URL is available
    console.log("[v0] DATABASE_URL available:", !!process.env.DATABASE_URL)
    if (!process.env.DATABASE_URL) {
      console.error("[v0] ERROR: DATABASE_URL is not set in environment variables!")
      console.error("[v0] Please add DATABASE_URL to your project's Vars section in the sidebar")
      console.error("[v0] Format: mysql://user:password@host:port/database")
    }
    
    console.log("[v0] Starting dashboard stats fetch...")
    await waitForDbInit()
    console.log("[v0] Database initialized, querying counts...")
    
    const [usuariosCount, equiposCount, mantenimientosCount, ordenesCount] = await Promise.all([
      prisma.usuario.count(),
      prisma.equipo.count(),
      prisma.mantenimiento.count(),
      prisma.orden_trabajo.count(),
    ])
    
    console.log("[v0] Dashboard counts:", {
      usuariosCount,
      equiposCount,
      mantenimientosCount,
      ordenesCount
    })
    
    // Get equipment by manufacturer - filter out null values
    let equiposPorFabricante: Array<{ nombre: string; cantidad: number }> = []
    
    try {
      const equipos = await prisma.equipo.groupBy({
        by: ['marca'],
        _count: {
          id: true
        },
        where: {
          AND: [
            {
              marca: {
                not: null
              }
            },
            {
              marca: {
                not: ''
              }
            }
          ]
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 4
      })
      
      console.log("[v0] Equipment by manufacturer raw:", equipos)
      console.log("[v0] Total equipment count:", equiposCount)
      
      equiposPorFabricante = equipos
        .filter(e => e.marca != null && e.marca !== '')
        .map(e => ({
          nombre: e.marca?.trim() || "Desconocido",
          cantidad: e._count.id || 0
        }))
      
      console.log("[v0] Equipment by manufacturer after filtering:", equiposPorFabricante)
      
      // If no data from database, provide sample data for demonstration
      if (equiposPorFabricante.length === 0 && equiposCount > 0) {
        console.log("[v0] No equipment by manufacturer found, generating sample data")
        equiposPorFabricante = [
          { nombre: "Sin Marca", cantidad: equiposCount }
        ]
      }
      
      console.log("[v0] Equipment by manufacturer processed:", equiposPorFabricante)
    } catch (fabricanteError) {
      console.error("[v0] Error fetching equipment by manufacturer:", fabricanteError)
      // Provide sample data if database query fails
      if (equiposCount > 0) {
        equiposPorFabricante = [
          { nombre: "Sin Marca Asignada", cantidad: equiposCount }
        ]
      }
    }
    
    // Get maintenance by month (last 6 months)
    const mesesNombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    let mantenimientosPorMes: Array<{ mes: string; cantidad: number }> = []
    
    try {
      const mantenimientosPorMesMap = new Map<string, number>()
      
      // Initialize last 6 months
      const today = new Date()
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
        const monthNum = String(date.getMonth() + 1).padStart(2, '0')
        const mesKey = `${date.getFullYear()}-${monthNum}`
        mantenimientosPorMesMap.set(mesKey, 0)
      }
      
      // Fetch maintenances from the database
      const mantenimientos = await prisma.mantenimiento.findMany({
        select: {
          proxima_programada: true
        }
      })
      
      console.log("[v0] Total maintenances found:", mantenimientos.length)
      
      // Count by month
      mantenimientos.forEach((mant) => {
        if (mant.proxima_programada) {
          const fecha = new Date(mant.proxima_programada)
          const monthNum = String(fecha.getMonth() + 1).padStart(2, '0')
          const mesKey = `${fecha.getFullYear()}-${monthNum}`
          if (mantenimientosPorMesMap.has(mesKey)) {
            mantenimientosPorMesMap.set(mesKey, (mantenimientosPorMesMap.get(mesKey) || 0) + 1)
          }
        }
      })
      
      // Convert to array with month names
      for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
        const monthNum = String(date.getMonth() + 1).padStart(2, '0')
        const mesKey = `${date.getFullYear()}-${monthNum}`
        const mesNombre = mesesNombres[date.getMonth()]
        const cantidad = mantenimientosPorMesMap.get(mesKey) || 0
        mantenimientosPorMes.push({
          mes: mesNombre,
          cantidad,
        })
      }
      
      console.log("[v0] Maintenance by month processed:", mantenimientosPorMes)
    } catch (mantenimientoError) {
      console.error("[v0] Error fetching maintenance by month:", mantenimientoError)
      // Provide sample data if database query fails
      const today = new Date()
      for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
        const mesNombre = mesesNombres[date.getMonth()]
        mantenimientosPorMes.push({
          mes: mesNombre,
          cantidad: 0,
        })
      }
    }
    
    console.log("[v0] Dashboard stats loaded successfully:", {
      usuariosCount,
      equiposCount,
      mantenimientosCount,
      ordenesCount,
    })
    
    return {
      usuariosCount,
      equiposCount,
      mantenimientosCount,
      ordenesCount,
      equiposPorFabricante,
      mantenimientosPorMes,
    }
  } catch (error) {
    console.error("[v0] Error fetching dashboard stats:", error)
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)
    }
    console.log("[v0] Returning mock data as fallback")
    return mockDashboardStats
  }
}
