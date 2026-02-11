"use server"

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
    // Import the API-based dashboard stats function
    const { getDashboardStats: getApiDashboardStats } = await import("@/lib/api/dashboard")
    
    const stats = await getApiDashboardStats()
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
