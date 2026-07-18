import re

with open('src/app/zonas/[zonaName]/empresas/[id]/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the components to insert
components = """
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
        {empresa.direccion && (
          <a 
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${empresa.direccion}, ${empresa.barrio || ''}, ${empresa.partido || ''}`)}`}
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-secondary !p-2 !rounded-full text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
            title="Abrir en Google Maps"
          >
            <Navigation size={18} />
          </a>
        )}
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
  )
}

function RegistroContacto({ empresaId, addVisitaAction }: { empresaId: number, addVisitaAction: any }) {
  return (
    <form action={addVisitaAction} className="grid grid-cols-2 gap-4">
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
"""

content = content.replace('export default async function EmpresaPage', components + '\n\nexport default async function EmpresaPage')

# Now replace the return statement body
start_idx = content.find('<div className="grid lg:grid-cols-3 gap-6">')
end_idx = content.rfind('</div>\n    </div>\n  )\n}')

desktop_mobile_view = """
      {/* ── DESKTOP VIEW ── */}
      <div className="hidden md:block">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="glass-panel card flex-col gap-4">
            <h3 className="card-title border-b pb-2" style={{ borderBottom: '1px solid var(--border-light)' }}>Información General</h3>
            <InfoGeneral empresa={empresa} />
          </div>
          <div className="glass-panel card delay-100" style={{ gridColumn: 'span 2' }}>
            <h3 className="card-title border-b pb-4 mb-4" style={{ borderBottom: '1px solid var(--border-light)' }}>Registrar Nuevo Contacto</h3>
            <RegistroContacto empresaId={empresaId} addVisitaAction={addVisita.bind(null, empresaId)} />
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
            <RegistroContacto empresaId={empresaId} addVisitaAction={addVisita.bind(null, empresaId)} />
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
      </div>"""

new_content = content[:start_idx] + desktop_mobile_view + '\n    </div>\n  )\n}'

with open('src/app/zonas/[zonaName]/empresas/[id]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('File refactored successfully.')
