import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Phone, Mail, Globe, Map as MapIcon, Building2, User, FileText, Edit, Tag, Navigation, MessageCircle } from 'lucide-react'
import { CompleteActionButton } from './ActionButtons'
import { addVisita, addAccion, addAlerta } from './actions'
import { QuickActionsClient } from './QuickActionsClient'
import { getSessionUser } from '@/lib/auth'
import { HistorialComprasClient } from './HistorialComprasClient'
import { NuevoContactoForm } from './NuevoContactoForm'
import { RespuestaObtenidaButton } from './RespuestaObtenidaButton'
import { NuevaAccionForm } from './NuevaAccionForm'

export const dynamic = 'force-dynamic'

const getRubroDisplayName = (name: string) => {
  if (!name) return 'No asignado';
  const match = name.match(/^CATEGORIA\s+(\d+)$/i);
  if (match) {
    return `Categoría ${match[1]}`;
  }
  return name;
};

const getRubroEmoji = (name: string) => {
  if (!name) return '🏷️';
  const mapping: Record<string, string> = {
    'CATEGORIA 1': '🍬',
    'CATEGORIA 2': '🍽️',
    'CATEGORIA 3': '🛒',
    'CATEGORIA 4': '🧀',
    'CATEGORIA 5': '🌱',
    'CATEGORIA 6': '🏪',
    'CATEGORIA 7': '🚚',
    'CATEGORIA 8': '🎉',
    'CATEGORIA 9': '❌',
    'CATEGORIA 10': '📦',
    'CATEGORIA 11': '🏥'
  };
  return mapping[name.toUpperCase()] || '🏷️';
};


function InfoGeneral({ empresa }: { empresa: any }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Building2 size={16} className="text-secondary" />
        <div>
          <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Zona</div>
          <div style={{ fontWeight: 500 }}>{empresa.zona || 'No asignada'}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Tag size={16} className="text-secondary" />
        <div>
          <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Rubro Comercial</div>
          <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>{getRubroEmoji(empresa.rubro || '')}</span>
            <span>{getRubroDisplayName(empresa.rubro || '')}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-3">
          <MapPin size={16} className="text-secondary" />
          <div>
            <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Dirección</div>
            <div style={{ fontWeight: 500 }}>{empresa.direccion || 'No especificada'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{empresa.barrio || ''}</div>
          </div>
        </div>
        {empresa.direccion && (() => {
          const mapsQuery = (empresa.latitud && empresa.longitud) 
            ? `${empresa.latitud},${empresa.longitud}`
            : encodeURIComponent([empresa.direccion, empresa.barrio, empresa.partido].filter(Boolean).join(', '))
          return (
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-secondary !p-2 !rounded-full text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
              title="Abrir en Google Maps"
            >
              <Navigation size={18} />
            </a>
          )
        })()}
      </div>

      <div className="flex items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-3">
          <MessageCircle size={16} className="text-secondary" />
          <div>
            <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Teléfono / WhatsApp</div>
            <div style={{ fontWeight: 500 }}>{empresa.telefono || 'No especificado'}</div>
          </div>
        </div>
        {empresa.telefono && (
          <a 
            href={`https://wa.me/${empresa.telefono.replace(/[^0-9]/g, '')}`}
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-secondary !p-2 !rounded-full text-green-400 hover:text-green-300 hover:bg-green-900/20"
            title="Enviar WhatsApp"
          >
            <MessageCircle size={18} />
          </a>
        )}
      </div>

      {empresa.telefono2 && (
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-3">
            <Phone size={16} className="text-secondary" />
            <div>
              <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Teléfono #2</div>
              <div style={{ fontWeight: 500 }}>{empresa.telefono2}</div>
            </div>
          </div>
          <a 
            href={`tel:${empresa.telefono2.replace(/[^0-9+]/g, '')}`}
            className="btn btn-secondary !p-2 !rounded-full text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
            title="Llamar"
          >
            <Phone size={18} />
          </a>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Mail size={16} className="text-secondary" />
        <div>
          <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Email</div>
          <div style={{ fontWeight: 500 }}>{empresa.email || 'No especificado'}</div>
        </div>
      </div>

      {(empresa.url || empresa.googleMaps) && (
        <div className="flex gap-2" style={{ marginTop: '0.5rem' }}>
          {empresa.url && (
            <a href={empresa.url.startsWith('http') ? empresa.url : `https://${empresa.url}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary flex-1">
              <Globe size={14} /> Website
            </a>
          )}
          {empresa.googleMaps && (
            <a href={empresa.googleMaps} target="_blank" rel="noopener noreferrer" className="btn btn-secondary flex-1">
              <MapIcon size={14} /> Maps
            </a>
          )}
        </div>
      )}

      {empresa.notas && (
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem', color: 'var(--warning)', fontWeight: 500 }}>
            <FileText size={14} /> Notas Importantes
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{empresa.notas}</p>
        </div>
      )}
    </div>
  )
}

function AccionesTareas({ empresa, empresaId, addAccionAction }: { empresa: any, empresaId: number, addAccionAction: any }) {
  return (
    <>
      <NuevaAccionForm empresaId={empresaId} addAccionAction={addAccionAction} />

      <div className="flex flex-col gap-2 mt-4">
        {empresa.acciones.filter((a: any) => a.estado === 'pendiente').map((accion: any) => (
          <div key={accion.id} className="flex justify-between items-center p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <div>
              <div className="flex gap-2 items-center">
                <span className="badge badge-info">{accion.tipo}</span>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{accion.descripcion}</span>
              </div>
              {accion.fechaVencimiento && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Vence: {new Date(accion.fechaVencimiento).toLocaleDateString()}
                </div>
              )}
            </div>
            <CompleteActionButton accionId={accion.id} empresaId={empresaId} />
          </div>
        ))}
        {empresa.acciones.filter((a: any) => a.estado === 'pendiente').length === 0 && (
          <p style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No hay acciones pendientes.</p>
        )}
      </div>
    </>
  )
}

function HistorialVisitas({ empresa, zonaName, empresaId }: { empresa: any, zonaName: string, empresaId: number }) {
  return (
    <div className="flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: '400px' }}>
      {empresa.visitas.map((visita: any) => (
        <div key={visita.id} className="p-4" style={{ borderLeft: `2px solid ${
          visita.tipo === 'correo'   ? '#8b5cf6' :
          visita.tipo === 'whatsapp' ? '#22c55e' :
          'var(--accent-primary)'
        }`, backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}>
          <div className="flex justify-between items-start" style={{ marginBottom: '0.5rem' }}>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem' }}>
                {visita.tipo === 'correo' ? '📧' : visita.tipo === 'whatsapp' ? '💬' : '🚗'}
              </span>
              {new Date(visita.fecha).toLocaleDateString('es-AR')}
            </div>
            <span className={`badge ${visita.resultado === 'venta' ? 'badge-success' : visita.resultado === 'negativo' ? 'badge-danger' : 'badge-neutral'}`}>
              {visita.resultado.replace(/_/g, ' ')}
            </span>
          </div>
          
          {visita.contacto && (
            <div className="flex items-center gap-1" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              <User size={14} /> {visita.contacto} {visita.cargo ? `(${visita.cargo})` : ''}
            </div>
          )}
          
          {visita.notas && (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{visita.notas}</p>
          )}

          {visita.proximaAccion && (
            <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.5rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
              <strong>Próxima acción:</strong> {visita.proximaAccion}
            </div>
          )}

          {(visita.tipo === 'whatsapp' || visita.tipo === 'correo') && (
            <RespuestaObtenidaButton 
              visitaId={visita.id} 
              initialStatus={visita.respuestaObtenida} 
              zonaName={zonaName}
              empresaId={empresaId}
            />
          )}
        </div>
      ))}
      {empresa.visitas.length === 0 && (
        <p style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No hay visitas registradas aún.</p>
      )}
    </div>
  )
}


export default async function EmpresaPage({ params }: { params: Promise<{ id: string; zonaName: string }> }) {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }

  const { id, zonaName } = await params
  const decodedZona = decodeURIComponent(zonaName)
  const empresaId = parseInt(id)
  
  if (isNaN(empresaId)) {
    notFound()
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    include: {
      visitas: { orderBy: { fecha: 'desc' } },
      acciones: { orderBy: { fechaVencimiento: 'asc' } },
      alertas: { orderBy: { creadoEn: 'desc' } }
    }
  })

  if (!empresa) {
    notFound()
  }

  // Security: level 3 users can only access their assigned companies
  if (user.nivel === 3 && empresa.vendedorAsignado !== user.alias) {
    notFound()
  }


  const hasPendingDeleteRequest = await prisma.solicitudEliminacion.findFirst({
    where: {
      tipo: 'EMPRESA',
      targetId: empresaId,
      estado: 'pendiente'
    }
  })

  // Serializar la empresa para pasar al cliente sin problemas de fechas
  const serializedEmpresa = {
    ...empresa,
    creadoEn: empresa.creadoEn.toISOString(),
    actualizadoEn: empresa.actualizadoEn.toISOString(),
    fechaBaja: empresa.fechaBaja ? empresa.fechaBaja.toISOString() : null,
    visitas: [],
    acciones: [],
    alertas: []
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="w-full">
          <Link href={`/zonas/${zonaName}/empresas`} className="flex items-center gap-2" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            <ArrowLeft size={16} /> Volver a empresas
          </Link>
          <div className="flex justify-between items-start md:items-center mb-6 w-full flex-col md:flex-row gap-4">
            <div>
              <h1 className="page-title !mb-0 flex items-center gap-2">
                <Building2 className="text-primary" /> {empresa.nombre}
              </h1>
              <p className="page-subtitle mt-1 flex items-center gap-2">
                <span className={`badge ${
                  empresa.estado === 'prospecto' ? 'badge-warning' :
                  empresa.estado === 'activo'    ? 'badge-success' :
                  empresa.estado === 'baja'      ? 'badge-danger'  :
                  'badge-neutral'
                }`}>
                  {empresa.estado === 'baja' ? '🔴 BAJA' : empresa.estado}
                </span>
                {empresa.zona && <span>• {empresa.zona}</span>}
              </p>
            </div>
            <div className="flex gap-2">
              <QuickActionsClient 
                id={empresa.id} 
                estado={empresa.estado} 
                zonaName={zonaName} 
                empresa={serializedEmpresa}
                userNivel={user.nivel}
                userAlias={user.alias}
                hasPendingDeleteRequest={!!hasPendingDeleteRequest}
              />
              <Link href={`/zonas/${zonaName}/empresas/${empresaId}/editar`} className="btn btn-secondary flex items-center gap-2">
                <Edit size={16} /> Editar Ficha
              </Link>
            </div>
          </div>
        </div>
      </div>

      
      {/* ── DESKTOP VIEW ── */}
      <div className="hidden md:block">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="glass-panel card flex-col gap-4">
            <h3 className="card-title border-b pb-2" style={{ borderBottom: '1px solid var(--border-light)' }}>Información General</h3>
            <InfoGeneral empresa={empresa} />
          </div>
          <div className="glass-panel card delay-100" style={{ gridColumn: 'span 2' }}>
            <h3 className="card-title border-b pb-4 mb-4" style={{ borderBottom: '1px solid var(--border-light)' }}>Registrar Nuevo Contacto</h3>
            <NuevoContactoForm empresaId={empresaId} addVisitaAction={addVisita.bind(null, empresaId)} />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6" style={{ marginTop: '1.5rem' }}>
          <div className="glass-panel card delay-200">
            <h3 className="card-title border-b pb-4 mb-4" style={{ borderBottom: '1px solid var(--border-light)' }}>Acciones y Tareas</h3>
            <AccionesTareas empresa={empresa} empresaId={empresaId} addAccionAction={addAccion} />
          </div>
          <div className="glass-panel card delay-300">
            <h3 className="card-title border-b pb-4 mb-4" style={{ borderBottom: '1px solid var(--border-light)' }}>Historial de Visitas</h3>
            <HistorialVisitas empresa={empresa} zonaName={zonaName} empresaId={empresaId} />
          </div>
          <div className="glass-panel card delay-300" style={{ gridColumn: 'span 2' }}>
            <h3 className="card-title mb-4">Historial de Compras</h3>
            <HistorialComprasClient empresaId={empresaId} userNivel={user.nivel} />
          </div>
        </div>
      </div>

      {/* ── MOBILE VIEW (ACCORDIONS) ── */}
      <div className="md:hidden flex flex-col gap-4 mt-6">
        <details className="glass-panel rounded-xl group" open>
          <summary className="p-4 font-bold text-white flex justify-between items-center cursor-pointer list-none bg-white/5 rounded-xl">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-primary" />
              Información General
            </div>
            <span className="text-secondary group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="p-4 pt-2 border-t border-white/5 mt-2">
            <InfoGeneral empresa={empresa} />
          </div>
        </details>

        <details className="glass-panel rounded-xl group">
          <summary className="p-4 font-bold text-white flex justify-between items-center cursor-pointer list-none bg-white/5 rounded-xl">
            <div className="flex items-center gap-2">
              <Phone size={18} className="text-green-400" />
              Registrar Contacto
            </div>
            <span className="text-secondary group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="p-4 pt-2 border-t border-white/5 mt-2">
            <NuevoContactoForm empresaId={empresaId} addVisitaAction={addVisita.bind(null, empresaId)} />
          </div>
        </details>

        <details className="glass-panel rounded-xl group">
          <summary className="p-4 font-bold text-white flex justify-between items-center cursor-pointer list-none bg-white/5 rounded-xl">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-blue-400" />
              Acciones y Tareas
            </div>
            <span className="text-secondary group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="p-4 pt-2 border-t border-white/5 mt-2">
            <AccionesTareas empresa={empresa} empresaId={empresaId} addAccionAction={addAccion} />
          </div>
        </details>

        <details className="glass-panel rounded-xl group">
          <summary className="p-4 font-bold text-white flex justify-between items-center cursor-pointer list-none bg-white/5 rounded-xl">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-yellow-400" />
              Historial de Visitas
            </div>
            <span className="text-secondary group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="p-4 pt-2 border-t border-white/5 mt-2">
            <HistorialVisitas empresa={empresa} zonaName={zonaName} empresaId={empresaId} />
          </div>
        </details>

        <details className="glass-panel rounded-xl group">
          <summary className="p-4 font-bold text-white flex justify-between items-center cursor-pointer list-none bg-white/5 rounded-xl">
            <div className="flex items-center gap-2">
              <Tag size={18} className="text-purple-400" />
              Historial de Compras
            </div>
            <span className="text-secondary group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="p-4 pt-2 border-t border-white/5 mt-2">
            <HistorialComprasClient empresaId={empresaId} userNivel={user.nivel} />
          </div>
        </details>
      </div>
    </div>
  )
}