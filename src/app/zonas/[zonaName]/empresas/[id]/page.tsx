import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Phone, Mail, Globe, Map as MapIcon, Building2, User, FileText, Edit } from 'lucide-react'
import { CompleteActionButton } from './ActionButtons'
import { addVisita, addAccion, addAlerta } from './actions'
import { QuickActionsClient } from './QuickActionsClient'
import { getSessionUser } from '@/lib/auth'
import { HistorialComprasClient } from './HistorialComprasClient'

export const dynamic = 'force-dynamic'

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


  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <Link href={`/zonas/${zonaName}/empresas`} className="flex items-center gap-2" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            <ArrowLeft size={16} /> Volver a empresas
          </Link>
          <div className="flex justify-between items-start mb-6">
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
              <QuickActionsClient id={empresa.id} estado={empresa.estado} />
              <Link href={`/zonas/${zonaName}/empresas/${empresaId}/editar`} className="btn btn-secondary flex items-center gap-2">
                <Edit size={16} /> Editar Ficha
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="glass-panel card flex-col gap-4">
          <h3 className="card-title border-b pb-2" style={{ borderBottom: '1px solid var(--border-light)' }}>Información General</h3>
          
          <div className="flex items-center gap-3">
            <Building2 size={16} className="text-secondary" />
            <div>
              <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Zona</div>
              <div style={{ fontWeight: 500 }}>{empresa.zona || 'No asignada'}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <MapPin size={16} className="text-secondary" />
            <div>
              <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Dirección</div>
              <div style={{ fontWeight: 500 }}>{empresa.direccion || 'No especificada'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{empresa.barrio || ''}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Phone size={16} className="text-secondary" />
            <div>
              <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Teléfono</div>
              <div style={{ fontWeight: 500 }}>{empresa.telefono || 'No especificado'}</div>
            </div>
          </div>

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

        {/* Formularios - Acciones / Visitas */}
        <div className="glass-panel card delay-100" style={{ gridColumn: 'span 2' }}>
          
          <div className="flex gap-4" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
            <h3 className="card-title m-0">Registrar Nuevo Contacto</h3>
          </div>

          <form action={addVisita.bind(null, empresaId)} className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Fecha</label>
              <input type="date" name="fecha" required defaultValue={new Date().toISOString().split('T')[0]} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de Contacto</label>
              <select name="tipo" className="form-input">
                <option value="visita">🚗 Visita Presencial</option>
                <option value="correo">📧 Correo Electrónico</option>
                <option value="whatsapp">💬 WhatsApp</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Resultado</label>
              <select name="resultado" required className="form-input">
                <option value="muestra_dejada">Muestra Dejada</option>
                <option value="venta">Cierre de Venta ✅</option>
                <option value="negativo">Rechazo ❌</option>
                <option value="neutro">En Evaluación 🔄</option>
                <option value="contacto_obtenido">Contacto Obtenido 📋</option>
                <option value="sin_respuesta">Sin Respuesta 📵</option>
                <option value="reprogramado">Reprogramado 📅</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Persona de Contacto</label>
              <input type="text" name="contacto" placeholder="Nombre (ej. Alberto)" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Cargo</label>
              <input type="text" name="cargo" placeholder="Encargado de compras, etc." className="form-input" />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Notas / Observaciones</label>
              <textarea name="notas" rows={3} placeholder="Detalles de la visita..." className="form-input"></textarea>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Próxima Acción Recomendada</label>
              <input type="text" name="proximaAccion" placeholder="Ej. Enviar lista de precios por correo" className="form-input" />
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary">Registrar Visita</button>
            </div>
          </form>

        </div>
      </div>

      {/* Historial y Acciones Pendientes */}
      <div className="grid lg:grid-cols-2 gap-6" style={{ marginTop: '1.5rem' }}>
        
        <div className="glass-panel card delay-200">
          <div className="flex justify-between items-center border-b pb-4" style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '1rem' }}>
            <h3 className="card-title m-0">Acciones y Tareas</h3>
            {/* Modal opener could go here in a real app, for now just a form below */}
          </div>
          
          <form action={addAccion.bind(null, empresaId)} className="flex gap-2 items-end mb-4 bg-black/20 p-3 rounded-lg">
             <div className="form-group flex-1 mb-0">
               <input type="text" name="descripcion" required placeholder="Nueva tarea (ej. Enviar catálogo)" className="form-input" style={{ padding: '0.5rem', fontSize: '0.75rem' }} />
             </div>
             <div className="form-group mb-0" style={{ width: '130px' }}>
               <select name="tipo" className="form-input" style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                 <option value="llamada">Llamada</option>
                 <option value="correo">Correo</option>
                 <option value="visita">Visita</option>
                 <option value="whatsapp">WhatsApp</option>
               </select>
             </div>
             <div className="form-group mb-0" style={{ width: '130px' }}>
               <input type="date" name="fechaVencimiento" className="form-input" style={{ padding: '0.5rem', fontSize: '0.75rem' }} />
             </div>
             <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem', height: '36px' }}>+</button>
          </form>

          <div className="flex flex-col gap-2">
            {empresa.acciones.filter(a => a.estado === 'pendiente').map(accion => (
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
            {empresa.acciones.filter(a => a.estado === 'pendiente').length === 0 && (
              <p style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No hay acciones pendientes.</p>
            )}
          </div>
        </div>

        <div className="glass-panel card delay-300" style={{ gridColumn: 'span 2' }}>
          <h3 className="card-title m-0">Historial de Compras</h3>
          <HistorialComprasClient empresaId={empresaId} userNivel={user.nivel} />
        </div>

        <div className="glass-panel card delay-300">
          <h3 className="card-title border-b pb-4" style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '1rem' }}>Historial de Visitas</h3>
          
          <div className="flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: '400px' }}>
            {empresa.visitas.map(visita => (
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
              </div>
            ))}
            {empresa.visitas.length === 0 && (
              <p style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No hay visitas registradas aún.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
