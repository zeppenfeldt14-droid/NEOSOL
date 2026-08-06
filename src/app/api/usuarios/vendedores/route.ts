import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const zonaParam = searchParams.get('zona')

    // Find all active users that have rol = 'Vendedor' (or 'Admin' if they can also be assigned)
    // To be safe, we just find all active users that are somehow related to sales or are vendors.
    const query: any = {
      activo: true,
      OR: [
        { rol: 'Vendedor' },
        { rol: 'Admin' }
      ]
    }

    const usuarios = await prisma.usuario.findMany({
      where: query,
      select: {
        id: true,
        nombre: true,
        alias: true,
        zona: true,
        zonasHabilitadas: true
      },
      orderBy: { nombre: 'asc' }
    })

    // If zonaParam is provided, filter them (they must have zona == zonaParam OR zonasHabilitadas array includes zonaParam)
    // Note: zonasHabilitadas is a JSON array. We handle it in memory since Prisma JSON filtering can be tricky for arrays in some DB versions
    let filteredUsuarios = usuarios;
    
    if (zonaParam) {
      filteredUsuarios = usuarios.filter(u => {
        const zonasHab = Array.isArray(u.zonasHabilitadas) ? u.zonasHabilitadas : [];
        return u.zona === zonaParam || zonasHab.includes(zonaParam);
      });
    }

    return NextResponse.json(filteredUsuarios)
  } catch (error: any) {
    console.error('[API GET Vendedores] Error:', error)
    return NextResponse.json({ error: 'Error al listar vendedores.' }, { status: 500 })
  }
}
