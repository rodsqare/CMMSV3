import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET - Obtener documentos de un equipo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id } = await params
    const equipoId = parseInt(id)

    const documentos = await prisma.documento.findMany({
      where: { equipo_id: equipoId },
      orderBy: { created_at: 'desc' },
      include: {
        subidoPor: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(documentos)
  } catch (error: any) {
    console.error('[v0] Error fetching documentos:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener documentos' },
      { status: error.message === 'No autorizado' ? 401 : 500 }
    )
  }
}

// POST - Subir un nuevo documento
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[v0] POST /documentos - Starting upload')
    console.log('[v0] POST /documentos - Headers:', Object.fromEntries(request.headers.entries()))
    
    const session = await requireAuth(request)
    console.log('[v0] POST /documentos - Session authenticated:', session.email)
    
    const { id } = await params
    const equipoId = parseInt(id)

    // Verificar que el equipo existe
    const equipo = await prisma.equipo.findUnique({
      where: { id: equipoId },
    })

    if (!equipo) {
      console.log('[v0] POST /documentos - Equipment not found:', equipoId)
      return NextResponse.json(
        { error: 'Equipo no encontrado' },
        { status: 404 }
      )
    }

    // Obtener el FormData
    const formData = await request.formData()
    const archivo = formData.get('archivo') as File
    const subidoPorId = formData.get('subido_por_id') as string

    console.log('[v0] POST /documentos - FormData received')
    console.log('[v0] POST /documentos - archivo:', archivo ? `${archivo.name} (${archivo.size} bytes)` : 'NOT PROVIDED')
    console.log('[v0] POST /documentos - subidoPorId:', subidoPorId)

    if (!archivo) {
      console.log('[v0] POST /documentos - Error: No file provided')
      return NextResponse.json(
        { error: 'No se proporciono archivo' },
        { status: 400 }
      )
    }

    if (!subidoPorId) {
      console.log('[v0] POST /documentos - Error: No subidoPorId provided')
      return NextResponse.json(
        { error: 'No se proporciono el ID del usuario que sube' },
        { status: 400 }
      )
    }

    // Validar que el archivo no sea muy grande (máximo 50MB)
    const maxSize = 50 * 1024 * 1024
    if (archivo.size > maxSize) {
      console.log('[v0] POST /documentos - File too large:', archivo.size)
      return NextResponse.json(
        { error: 'El archivo es demasiado grande. Máximo 50MB' },
        { status: 400 }
      )
    }

    // Crear documento en la base de datos
    const documento = await prisma.documento.create({
      data: {
        nombre: archivo.name,
        tipo: archivo.type,
        tamanio_kb: Math.ceil(archivo.size / 1024),
        equipo_id: equipoId,
        subido_por: parseInt(subidoPorId),
        url_archivo: `equipos/${equipoId}/${Date.now()}-${archivo.name}`,
      },
      include: {
        subidoPor: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    })

    console.log('[v0] POST /documentos - Document created successfully:', documento.id)

    // Crear log
    await prisma.log.create({
      data: {
        usuario_id: session.id,
        accion: 'Subir',
        modulo: 'Documentos',
        descripcion: `Documento subido: ${archivo.name} para equipo ${equipo.nombre}`,
        datos: { documento_id: documento.id, equipo_id: equipoId },
      },
    })

    return NextResponse.json({ data: documento }, { status: 201 })
  } catch (error: any) {
    console.error('[v0] Error uploading documento:', error)
    return NextResponse.json(
      { error: error.message || 'Error al subir documento' },
      { status: error.message === 'No autorizado' ? 401 : 500 }
    )
  }
}
