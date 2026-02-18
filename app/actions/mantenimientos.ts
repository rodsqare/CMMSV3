"use server"

import { prisma } from "@/lib/prisma"
import { transformMantenimientoToUI, type Mantenimiento } from "@/lib/mantenimiento-transform"
import { createAuditLog } from "./logs"

export async function getAllMantenimientos(params?: {
  page?: number
  perPage?: number
  tipo?: string
  frecuencia?: string
  activo?: boolean
  search?: string
}) {
  try {
    const page = params?.page || 1
    const perPage = params?.perPage || 10
    const skip = (page - 1) * perPage

    const where: any = {}
    
    if (params?.tipo) {
      where.tipo = params.tipo
    }
    
    if (params?.frecuencia) {
      where.frecuencia = params.frecuencia
    }
    
    if (params?.activo !== undefined) {
      where.activo = params.activo
    }
    
    if (params?.search) {
      where.OR = [
        { descripcion: { contains: params.search } },
        { procedimiento: { contains: params.search } },
        { equipo: { nombre: { contains: params.search } } },
      ]
    }

    const [data, total] = await Promise.all([
      prisma.mantenimiento.findMany({
        where,
        include: {
          equipo: true,
        },
        skip,
        take: perPage,
        orderBy: { created_at: 'desc' }
      }),
      prisma.mantenimiento.count({ where })
    ])

    // Transform data to UI format (camelCase)
    const transformedData = data.map(transformMantenimientoToUI)

    return { data: transformedData, total, page, perPage }
  } catch (error) {
    console.error("[v0] Error fetching mantenimientos:", error)
    return { data: [], total: 0, page: 1, perPage: 10 }
  }
}

export async function getMantenimientoById(id: number) {
  try {
    const data = await prisma.mantenimiento.findUnique({
      where: { id },
      include: {
        equipo: true,
      }
    })
    
    if (!data) return null
    
    return transformMantenimientoToUI(data)
  } catch (error) {
    console.error("[v0] Error fetching mantenimiento:", error)
    return null
  }
}

// Helper function to convert frecuencia text to days
function frecuenciaToDias(frecuencia: string): number {
  const frecuenciaMap: Record<string, number> = {
    'diaria': 1,
    'semanal': 7,
    'quincenal': 15,
    'mensual': 30,
    'bimensual': 60,
    'trimestral': 90,
    'semestral': 180,
    'anual': 365,
  }
  return frecuenciaMap[frecuencia?.toLowerCase()] || 30
}

export async function createMantenimiento(mantenimiento: any, usuarioId?: number) {
  console.log("[v0] Action: Creating maintenance", mantenimiento)

  try {
    // Get current user if not provided
    let creadorId = usuarioId
    if (!creadorId) {
      // Try to get from session or use a default - this might need to be passed from the component
      creadorId = 1
    }

    const frecuenciaDias = frecuenciaToDias(mantenimiento.frecuencia)
    const descripcion = mantenimiento.descripcion || mantenimiento.observaciones || "Sin descripción"

    const result = await prisma.mantenimiento.create({
      data: {
        equipo_id: mantenimiento.equipoId || mantenimiento.equipo_id,
        tipo: mantenimiento.tipo?.toLowerCase(),
        descripcion: descripcion,
        procedimiento: mantenimiento.procedimiento,
        frecuencia: mantenimiento.frecuencia?.toLowerCase(),
        frecuencia_dias: frecuenciaDias,
        ultima_realizacion: mantenimiento.ultimaFecha ? new Date(mantenimiento.ultimaFecha) : null,
        proxima_programada: new Date(mantenimiento.proximaFecha || mantenimiento.proxima_programada),
        activo: mantenimiento.activo ?? true,
        creado_por: creadorId,
      }
    })
    console.log("[v0] Action: Maintenance created successfully", result)
    
    // Log the creation
    await createAuditLog({
      accion: 'CREAR',
      modulo: 'MANTENIMIENTOS',
      descripcion: `Mantenimiento ${mantenimiento.tipo} creado para equipo`,
      datos: { mantenimientoId: result.id, tipo: mantenimiento.tipo, equipoId: mantenimiento.equipoId }
    }).catch(err => console.error("[v0] Error logging mantenimiento creation:", err))
    
    return { success: true, data: result }
  } catch (error: any) {
    console.error("[v0] Action: Error creating maintenance", error)
    const errorMessage = error.message || "Error al crear el mantenimiento"
    return { success: false, error: errorMessage }
  }
}

export async function updateMantenimiento(id: number, mantenimiento: any) {
  console.log("[v0] Action: Updating maintenance", id, mantenimiento)

  try {
    const frecuenciaDias = frecuenciaToDias(mantenimiento.frecuencia)
    const descripcion = mantenimiento.descripcion || mantenimiento.observaciones

    const updateData: any = {
      tipo: mantenimiento.tipo?.toLowerCase(),
      descripcion: descripcion,
      procedimiento: mantenimiento.procedimiento,
      frecuencia: mantenimiento.frecuencia?.toLowerCase(),
      frecuencia_dias: frecuenciaDias,
      updated_at: new Date(),
    }

    if (mantenimiento.ultimaFecha) {
      updateData.ultima_realizacion = new Date(mantenimiento.ultimaFecha)
    }
    
    if (mantenimiento.proximaFecha || mantenimiento.proxima_programada) {
      updateData.proxima_programada = new Date(mantenimiento.proximaFecha || mantenimiento.proxima_programada)
    }
    
    if (mantenimiento.activo !== undefined) {
      updateData.activo = mantenimiento.activo
    }

    const result = await prisma.mantenimiento.update({
      where: { id },
      data: updateData
    })
    console.log("[v0] Action: Maintenance updated successfully", result)
    
    // Log the update
    await createAuditLog({
      accion: 'EDITAR',
      modulo: 'MANTENIMIENTOS',
      descripcion: `Mantenimiento ${id} actualizado`,
      datos: { mantenimientoId: id, tipo: mantenimiento.tipo }
    }).catch(err => console.error("[v0] Error logging mantenimiento update:", err))
    
    return { success: true, data: result }
  } catch (error: any) {
    console.error("[v0] Action: Error updating maintenance", error)
    const errorMessage = error.message || "Error al actualizar el mantenimiento"
    return { success: false, error: errorMessage }
  }
}

export async function deleteMantenimiento(id: number) {
  console.log("[v0] Action: Deleting maintenance", id)

  try {
    const mantenimiento = await prisma.mantenimiento.findUnique({ where: { id } })
    
    await prisma.mantenimiento.delete({
      where: { id }
    })
    
    // Log the deletion
    if (mantenimiento) {
      await createAuditLog({
        accion: 'ELIMINAR',
        modulo: 'MANTENIMIENTOS',
        descripcion: `Mantenimiento ${mantenimiento.tipo} eliminado`,
        datos: { mantenimientoId: id, tipo: mantenimiento.tipo }
      }).catch(err => console.error("[v0] Error logging mantenimiento deletion:", err))
    }
    
    return { success: true }
  } catch (error: any) {
    console.error("[v0] Action: Error deleting maintenance", error)
    const errorMessage = error.message || "Error al eliminar el mantenimiento"
    return { success: false, error: errorMessage }
  }
}

export async function getMantenimientosStats() {
  try {
    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    // Calculate stats in parallel
    const [total, vencidos, proximos, completados] = await Promise.all([
      // Total active maintenance records
      prisma.mantenimiento.count({ where: { activo: true } }),
      
      // Overdue maintenance (proxima_programada < today)
      prisma.mantenimiento.count({ 
        where: { 
          proxima_programada: { lt: today },
          activo: true 
        } 
      }),
      
      // Upcoming in next 7 days (today <= proxima_programada <= nextWeek)
      prisma.mantenimiento.count({ 
        where: { 
          proxima_programada: { gte: today, lte: nextWeek },
          activo: true 
        } 
      }),
      
      // Completed maintenance in the last 30 days (count MantenimientoRealizado)
      prisma.mantenimientoRealizado.count({ 
        where: { 
          fecha_realizacion: { gte: thirtyDaysAgo }
        } 
      }),
    ])

    return {
      vencidos,
      proximos,
      completados,
      total,
    }
  } catch (error) {
    console.error("[v0] Error fetching maintenance stats:", error)
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
    }
    return { vencidos: 0, proximos: 0, completados: 0, total: 0 }
  }
}

export async function checkUpcomingMaintenances() {
  try {
    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    const upcoming = await prisma.mantenimiento.findMany({
      where: {
        proxima_programada: {
          gte: today,
          lte: nextWeek,
        },
        activo: true,
      },
      include: {
        equipo: true,
      },
      orderBy: { proxima_programada: 'asc' }
    })

    console.log("[v0] Upcoming maintenances checked:", { count: upcoming.length })
    return { 
      upcoming, 
      count: upcoming.length,
      notificaciones_creadas: upcoming.length // For compatibility with notification generation
    }
  } catch (error) {
    console.error("[v0] Error checking upcoming maintenances:", error)
    return { upcoming: [], count: 0, notificaciones_creadas: 0 }
  }
}

export async function completeMantenimiento(
  id: number,
  data: {
    tiempo_real?: number
    costo?: number
    observaciones?: string
    tareas_realizadas?: any
    estado_equipo?: string
  },
  usuarioId: number
) {
  console.log("[v0] Action: Completing maintenance", id, data)

  try {
    // Get the maintenance record
    const mantenimiento = await prisma.mantenimiento.findUnique({
      where: { id },
      include: { equipo: true },
    })

    if (!mantenimiento) {
      return { success: false, error: "Mantenimiento no encontrado" }
    }

    // Create maintenance realization record
    const realizacion = await prisma.mantenimientoRealizado.create({
      data: {
        mantenimiento_id: mantenimiento.id,
        equipo_id: mantenimiento.equipo_id,
        realizado_por: usuarioId,
        tiempo_real: data.tiempo_real,
        costo: data.costo ? parseFloat(data.costo.toString()) : null,
        observaciones: data.observaciones,
        tareas_realizadas: data.tareas_realizadas,
        estado_equipo: data.estado_equipo,
      },
    })

    // Calculate next scheduled date
    const proximaFecha = new Date()
    proximaFecha.setDate(proximaFecha.getDate() + mantenimiento.frecuencia_dias)

    // Update maintenance
    await prisma.mantenimiento.update({
      where: { id: mantenimiento.id },
      data: {
        ultima_realizacion: new Date(),
        proxima_programada: proximaFecha,
      },
    })

    // Update equipment
    await prisma.equipo.update({
      where: { id: mantenimiento.equipo_id },
      data: {
        ultima_mantencion: new Date(),
        proxima_mantencion: proximaFecha,
        estado: data.estado_equipo || mantenimiento.equipo.estado,
      },
    })

    // Log the action
    await createAuditLog({
      accion: 'COMPLETAR',
      modulo: 'MANTENIMIENTOS',
      descripcion: `Mantenimiento ${mantenimiento.tipo} completado para equipo ${mantenimiento.equipo.nombre}`,
      datos: {
        mantenimientoId: id,
        equipoId: mantenimiento.equipo_id,
        realizacionId: realizacion.id,
      },
    }).catch(err => console.error("[v0] Error logging maintenance completion:", err))

    console.log("[v0] Action: Maintenance completed successfully", realizacion.id)

    return { success: true, data: realizacion }
  } catch (error: any) {
    console.error("[v0] Action: Error completing maintenance", error)
    const errorMessage = error.message || "Error al completar el mantenimiento"
    return { success: false, error: errorMessage }
  }
}
