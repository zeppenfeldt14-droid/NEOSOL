'use client'

import { useState, useEffect } from 'react'
import { FileText, X, Check, Trash2, Plus, Building2, Bell, Clock, Search, ChevronDown } from 'lucide-react'

type Nota = {
  id: number
  texto: string
  empresaId: number | null
  empresa?: { id: number, nombre: string }
  destinatario: string
  estado: string
  creadoEn: string
  fechaRecordatorio: string | null
  recordatorioVisto: boolean
}

function ComboBox({ 
  value, 
  onChange, 
  options, 
  placeholder, 
  allowCustom = false,
  customText = "Buscar o crear..."
}: { 
  value: string, 
  onChange: (val: string) => void, 
  options: {value: string, label: string}[], 
  placeholder: string,
  allowCustom?: boolean,
  customText?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
  const selectedLabel = options.find(o => o.value === value)?.label || value || placeholder

  return (
    <div className="relative">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="form-input w-full cursor-pointer flex justify-between items-center bg-slate-800/60"
      >
        <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis">{selectedLabel}</span>
        <ChevronDown size={16} className="text-slate-400 flex-shrink-0 ml-2" />
      </div>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-xl flex flex-col" style={{ maxHeight: '250px' }}>
            <div className="p-2 border-b border-slate-700 flex items-center gap-2">
              <Search size={14} className="text-slate-400" />
              <input 
                type="text"
                autoFocus
                placeholder={customText}
                className="bg-transparent text-sm text-white w-full outline-none"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && allowCustom && search) {
                    onChange(search);
                    setIsOpen(false);
                    setSearch('');
                    e.preventDefault();
                  }
                }}
              />
            </div>
            <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
              {filtered.map(opt => (
                <div 
                  key={opt.value}
                  className={`px-3 py-2 text-sm rounded-sm cursor-pointer ${value === opt.value ? 'bg-blue-600/30 text-blue-400' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                  onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
                >
                  {opt.label}
                </div>
              ))}
              {filtered.length === 0 && !allowCustom && (
                <div className="px-3 py-4 text-sm text-center text-slate-500">
                  Sin resultados.
                </div>
              )}
              {filtered.length === 0 && allowCustom && search && (
                <div 
                  className="px-3 py-2 text-sm rounded-sm cursor-pointer text-blue-400 hover:bg-slate-700"
                  onClick={() => { onChange(search); setIsOpen(false); setSearch(''); }}
                >
                  + Crear "{search}"
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function PlannerNotes({ zona, empresasList }: { zona: string, empresasList: { id: number, nombre: string }[] }) {
  const [showModal, setShowModal] = useState(false)
  const [notas, setNotas] = useState<Nota[]>([])
  const [loading, setLoading] = useState(false)

  const [texto, setTexto] = useState('')
  const [empresaId, setEmpresaId] = useState('')
  const [destinatario, setDestinatario] = useState('personal')
  const [recordatorio, setRecordatorio] = useState('ninguno')
  const [customDate, setCustomDate] = useState('')

  const [isEmpresaDropdownOpen, setIsEmpresaDropdownOpen] = useState(false)
  const [empresaSearchTerm, setEmpresaSearchTerm] = useState('')

  const [activeAlarms, setActiveAlarms] = useState<Nota[]>([])

  const fetchNotas = async () => {
    try {
      const res = await fetch(`/api/notas-planificador?zona=${encodeURIComponent(zona)}`)
      if (res.ok) {
        const data = await res.json()
        setNotas(data)
        checkAlarms(data)
      }
    } catch (e) { console.error(e) }
  }

  const checkAlarms = (data: Nota[]) => {
    const now = new Date()
    const alarms = data.filter(n => 
      n.estado === 'pendiente' && 
      n.fechaRecordatorio && 
      !n.recordatorioVisto && 
      new Date(n.fechaRecordatorio) <= now
    )
    setActiveAlarms(alarms)
  }

  useEffect(() => {
    fetchNotas()
    const interval = setInterval(() => {
      fetchNotas()
    }, 60000)
    return () => clearInterval(interval)
  }, [zona])

  const uncompleted = notas.filter(n => n.estado === 'pendiente')

  const handleCrearNota = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!texto.trim()) return
    setLoading(true)

    let finalFechaRecordatorio = null
    const now = new Date()
    if (recordatorio === '1h') {
      now.setHours(now.getHours() + 1)
      finalFechaRecordatorio = now.toISOString()
    } else if (recordatorio === 'manana') {
      now.setDate(now.getDate() + 1)
      now.setHours(9, 0, 0, 0)
      finalFechaRecordatorio = now.toISOString()
    } else if (recordatorio === 'custom' && customDate) {
      finalFechaRecordatorio = new Date(customDate).toISOString()
    } else if (recordatorio !== 'ninguno') {
      const match = recordatorio.match(/^(\d+)\s*([hHmMdD])/);
      if (match) {
        const val = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        if (unit === 'h') now.setHours(now.getHours() + val);
        else if (unit === 'm') now.setMinutes(now.getMinutes() + val);
        else if (unit === 'd') now.setDate(now.getDate() + val);
        finalFechaRecordatorio = now.toISOString();
      }
    }

    try {
      const res = await fetch('/api/notas-planificador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto,
          empresaId: empresaId || null,
          destinatario,
          zona,
          fechaRecordatorio: finalFechaRecordatorio
        })
      })
      if (res.ok) {
        setTexto('')
        setEmpresaId('')
        setDestinatario('personal')
        setRecordatorio('ninguno')
        setCustomDate('')
        await fetchNotas()
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompletar = async (id: number, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'pendiente' ? 'completada' : 'pendiente'
    try {
      await fetch(`/api/notas-planificador/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
      })
      await fetchNotas()
    } catch (error) { console.error(error) }
  }

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Eliminar esta nota?')) return
    try {
      await fetch(`/api/notas-planificador/${id}`, {
        method: 'DELETE'
      })
      await fetchNotas()
    } catch (error) { console.error(error) }
  }

  const handleDismissAlarm = async (id: number) => {
    try {
      await fetch(`/api/notas-planificador/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordatorioVisto: true })
      })
      await fetchNotas()
    } catch (error) { console.error(error) }
  }

  const getRelativeTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffDays === 0) {
      if (diffHours === 0) {
        if (diffMinutes <= 1) return 'Hace 1 min'
        return `Hace ${diffMinutes} min`
      }
      return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
    } else if (diffDays === 1) {
      return 'Ayer'
    } else {
      return `Hace ${diffDays} días`
    }
  }

  const filteredEmpresas = empresasList.filter(emp => emp.nombre.toLowerCase().includes(empresaSearchTerm.toLowerCase()))
  const selectedEmpresaName = empresasList.find(e => e.id.toString() === empresaId)?.nombre || '-- General (Sin empresa) --'

  return (
    <>
      <button
        onClick={() => { setShowModal(true); fetchNotas(); }}
        className="btn flex items-center justify-center transition-all duration-300"
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          display: 'flex',
          gap: '0.5rem',
          fontWeight: 600,
          backgroundColor: uncompleted.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(192,132,252,0.15)',
          color: uncompleted.length > 0 ? '#ef4444' : '#c084fc',
          border: `1px solid ${uncompleted.length > 0 ? 'rgba(239,68,68,0.4)' : 'rgba(192,132,252,0.3)'}`,
          animation: uncompleted.length > 0 ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
        }}
      >
        <FileText size={18} />
        <span>NOTAS</span>
        {uncompleted.length > 0 && (
          <span style={{
            backgroundColor: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem'
          }}>{uncompleted.length}</span>
        )}
      </button>

      {/* MODAL PRINCIPAL */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)', zIndex: 99990, display: 'flex',
          justifyContent: 'center', alignItems: 'center', padding: '1rem'
        }}>
          <div className="glass-panel w-full max-w-2xl max-h-[90vh] flex flex-col" style={{ borderRadius: '12px', borderTop: '4px solid #c084fc' }}>
            
            <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white' }}>
                <FileText style={{ color: '#c084fc' }} /> Notas y Tareas Pendientes
              </h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--text-muted)' }}><X /></button>
            </div>

            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
              {/* Formulario */}
              <form onSubmit={handleCrearNota} className="mb-6 space-y-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Nueva Nota / Tarea</label>
                  <textarea 
                    value={texto}
                    onChange={e => setTexto(e.target.value)}
                    required
                    placeholder="Ej. Pedir muestras para Salvia de golosinería..."
                    className="form-input w-full"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="text-xs text-slate-400 mb-1 block">Empresa (Opcional)</label>
                    <ComboBox 
                      value={empresaId} 
                      onChange={setEmpresaId} 
                      options={[
                        { value: '', label: '-- General (Sin empresa) --' },
                        ...empresasList.map(e => ({ value: e.id.toString(), label: e.nombre }))
                      ]}
                      placeholder="-- General (Sin empresa) --"
                      customText="Buscar empresa..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Destinatario / Etiqueta</label>
                    <ComboBox 
                      value={destinatario} 
                      onChange={setDestinatario} 
                      options={[
                        { value: 'personal', label: 'Para Mí (Personal)' },
                        { value: 'gerencia', label: 'Para Gerencia' },
                        { value: 'asistente', label: 'Para Asistente / Soporte' }
                      ]}
                      placeholder="Seleccionar o crear..."
                      allowCustom={true}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Recordatorio / Alarma</label>
                    <ComboBox 
                      value={recordatorio} 
                      onChange={setRecordatorio} 
                      options={[
                        { value: 'ninguno', label: 'Sin recordatorio' },
                        { value: '1h', label: 'En 1 Hora' },
                        { value: 'manana', label: 'Mañana (09:00 AM)' },
                        { value: 'custom', label: 'Agendar fecha y hora exacta' }
                      ]}
                      placeholder="Seleccionar o crear (ej. 2h, 30m)..."
                      allowCustom={true}
                      customText="Buscar o escribir (ej. 2h, 30m)..."
                    />
                  </div>
                  {recordatorio === 'custom' && (
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Fecha y Hora</label>
                      <input 
                        type="datetime-local" 
                        value={customDate} 
                        onChange={e => setCustomDate(e.target.value)} 
                        className="form-input w-full" 
                        required 
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '0.5rem 1.5rem', borderRadius: '6px', display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#c084fc' }}>
                    <Plus size={16} /> Guardar Nota
                  </button>
                </div>
              </form>

              {/* Lista */}
              <div className="space-y-3">
                {notas.map(nota => (
                  <div key={nota.id} style={{ 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    backgroundColor: nota.estado === 'completada' ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.05)',
                    borderLeft: `4px solid ${nota.estado === 'completada' ? '#10b981' : nota.destinatario === 'gerencia' ? '#f59e0b' : nota.destinatario === 'asistente' ? '#3b82f6' : '#c084fc'}`,
                    opacity: nota.estado === 'completada' ? 0.6 : 1
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                      <div className="flex-1">
                        <div style={{ fontSize: '0.9rem', color: 'white', marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>
                          {nota.estado === 'completada' ? <s>{nota.texto}</s> : nota.texto}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#c084fc' }}>
                            <Clock size={12} /> {getRelativeTime(nota.creadoEn)}
                          </span>
                          {nota.empresa && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Building2 size={12} /> {nota.empresa.nombre}
                            </span>
                          )}
                          <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Para: {nota.destinatario}
                          </span>
                          {nota.fechaRecordatorio && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444' }}>
                              <Bell size={12} /> Recordatorio programado
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleCompletar(nota.id, nota.estado)} 
                          title={nota.estado === 'completada' ? 'Desmarcar' : 'Completar / Tildar'}
                          style={{ padding: '0.4rem', borderRadius: '6px', color: nota.estado === 'completada' ? '#10b981' : 'var(--text-muted)', backgroundColor: nota.estado === 'completada' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)' }}>
                          <Check size={16} />
                        </button>
                        <button onClick={() => handleEliminar(nota.id)} 
                          title="Eliminar permanentemente"
                          style={{ padding: '0.4rem', borderRadius: '6px', color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {notas.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No hay notas.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ALERTAS (RECORDATORIOS VENCIDOS) */}
      {activeAlarms.length > 0 && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex',
          justifyContent: 'center', alignItems: 'center', padding: '1rem'
        }}>
          <div className="glass-panel w-full max-w-lg flex flex-col" style={{ borderRadius: '12px', borderTop: '4px solid #ef4444', animation: 'scaleIn 0.3s ease-out' }}>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.2)', color: '#ef4444', marginBottom: '1rem', animation: 'pulse 1.5s infinite' }}>
                <Bell size={32} />
              </div>
              <h2 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.5rem', color: 'white', fontWeight: 700 }}>
                ¡Tienes {activeAlarms.length} {activeAlarms.length === 1 ? 'Recordatorio!' : 'Recordatorios!'}
              </h2>
              <p style={{ color: 'var(--text-muted)' }}>Estos son recordatorios programados que ya se han cumplido.</p>
            </div>
            
            <div style={{ padding: '0 1.5rem 1.5rem' }}>
              {activeAlarms.map(al => (
                <div key={al.id} style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '0.75rem', borderLeft: '3px solid #ef4444' }}>
                  <p style={{ fontSize: '1rem', color: 'white', margin: '0 0 0.5rem 0', whiteSpace: 'pre-wrap' }}>{al.texto}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {al.empresa ? al.empresa.nombre : 'General'}
                    </span>
                    <button 
                      onClick={() => handleDismissAlarm(al.id)}
                      className="btn btn-primary"
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', backgroundColor: '#ef4444', color: 'white' }}
                    >
                      Entendido
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
