'use client'

import { useState } from 'react'
import { 
  Building2, MapPin, Navigation, Calendar, 
  CheckCircle, X, MessageSquare, Award, Phone, 
  AlertTriangle, MessageCircle, Mail
} from 'lucide-react'
import { completarAccionMovil, reagendarAccionMovil } from './actions'

interface Empresa {
  id: number
  nombre: string
  direccion: string | null
  barrio: string | null
  telefono: string | null
  email: string | null
  estado: string
  latitud?: number | null
  longitud?: number | null
}

interface Accion {
  id: number
  empresaId: number
  tipo: string
  descripcion: string
  orden: number
  empresa: Empresa
}

interface Props {
  initialAcciones: Accion[]
  zonaName: string
}

const TIPO_CONFIG: Record<string, { label: string; color: string; bgClass: string; emoji: string }> = {
  visita_programada: { label: 'Visita',    color: '#10b981', bgClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25', emoji: '🏢' },
  whatsapp:         { label: 'WhatsApp',   color: '#25d366', bgClass: 'bg-green-500/10 text-green-400 border-green-500/25', emoji: '💬' },
  correo:           { label: 'Correo',     color: '#3b82f6', bgClass: 'bg-blue-500/10 text-blue-400 border-blue-500/25', emoji: '📧' },
  llamada:          { label: 'Llamada',    color: '#f59e0b', bgClass: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25', emoji: '📞' },
  planificacion:    { label: 'Planificación', color: '#c084fc', bgClass: 'bg-purple-500/10 text-purple-400 border-purple-500/25', emoji: '📅' },
}

export default function VisitasHoyClient({ initialAcciones, zonaName }: Props) {
  const [acciones, setAcciones] = useState<Accion[]>(initialAcciones)
  const [loadingId, setLoadingId] = useState<number | null>(null)

  // Modal completar
  const [completarModal, setCompletarModal] = useState<Accion | null>(null)
  const [resultado, setResultado] = useState('gestionado')
  const [notas, setNotas] = useState('')
  const [submitError, setSubmitError] = useState('')

  // Modal reagendar
  const [reagendarModal, setReagendarModal] = useState<Accion | null>(null)
  const [reagendaFecha, setReagendaFecha] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })

  const handleCompletar = async () => {
    if (!completarModal) return
    setLoadingId(completarModal.id)
    setSubmitError('')
    try {
      const res = await completarAccionMovil(
        completarModal.id,
        completarModal.empresaId,
        notas,
        resultado,
        completarModal.tipo
      )
      if (res.success) {
        setAcciones(prev => prev.filter(a => a.id !== completarModal.id))
        setCompletarModal(null)
        setNotas('')
        setResultado('gestionado')
      } else {
        setSubmitError(res.error || 'Error al gestionar')
      }
    } catch {
      setSubmitError('Error de red')
    } finally {
      setLoadingId(null)
    }
  }

  const handleReagendar = async () => {
    if (!reagendarModal || !reagendaFecha) return
    setLoadingId(reagendarModal.id)
    try {
      const res = await reagendarAccionMovil(reagendarModal.id, reagendaFecha)
      if (res.success) {
        setAcciones(prev => prev.filter(a => a.id !== reagendarModal.id))
        setReagendarModal(null)
      } else {
        setSubmitError(res.error || 'Error al reagendar')
      }
    } catch {
      setSubmitError('Error de red')
    } finally {
      setLoadingId(null)
    }
  }

  const openContextualLink = (accion: Accion) => {
    const emp = accion.empresa
    if (accion.tipo === 'visita_programada') {
      if (emp.latitud && emp.longitud) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${emp.latitud},${emp.longitud}`, '_blank')
      } else {
        const addressStr = [emp.direccion, emp.barrio, zonaName].filter(Boolean).join(', ')
        const q = encodeURIComponent(addressStr)
        window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank')
      }
    } else if (accion.tipo === 'whatsapp') {
      const phone = emp.telefono?.replace(/\D/g, '') || ''
      if (phone) window.open(`https://wa.me/${phone}`, '_blank')
    } else if (accion.tipo === 'correo') {
      if (emp.email) window.open(`mailto:${emp.email}`, '_blank')
    } else if (accion.tipo === 'llamada') {
      if (emp.telefono) window.open(`tel:${emp.telefono}`, '_blank')
    }
  }

  const getContextualIcon = (tipo: string) => {
    switch (tipo) {
      case 'visita_programada': return <Navigation size={15} />
      case 'whatsapp': return <MessageCircle size={15} />
      case 'correo': return <Mail size={15} />
      case 'llamada': return <Phone size={15} />
      default: return <Navigation size={15} />
    }
  }

  const getContextualLabel = (tipo: string) => {
    switch (tipo) {
      case 'visita_programada': return 'Navegar'
      case 'whatsapp': return 'WhatsApp'
      case 'correo': return 'Correo'
      case 'llamada': return 'Llamar'
      default: return 'Ir'
    }
  }

  // Agrupar: visitas primero, luego el resto
  const visitasGrupo = acciones.filter(a => a.tipo === 'visita_programada')
  const otrasGrupo = acciones.filter(a => a.tipo !== 'visita_programada')

  return (
    <div className="min-h-screen bg-[#080b16] text-white flex flex-col font-sans">

      {/* Header Premium Móvil */}
      <header className="sticky top-0 z-40 bg-[#0e1428]/85 backdrop-blur-md border-b border-white/5 px-4 py-4.5 flex flex-col gap-1 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h1 className="text-base font-black uppercase tracking-wider text-white">Ruta Hoy · {zonaName}</h1>
          </div>
          <span className="text-xs font-bold bg-primary/20 text-primary border border-primary/30 px-2.5 py-1 rounded-full">
            {acciones.length} Pendientes
          </span>
        </div>
        <p className="text-[10px] text-secondary font-medium uppercase tracking-widest mt-0.5">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-4 max-w-md mx-auto w-full">

        {/* Grupo Visitas */}
        {visitasGrupo.length > 0 && (
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-emerald-400/70 mb-2 px-1">
              🏢 Visitas Programadas ({visitasGrupo.length})
            </div>
            <div className="flex flex-col gap-4">
              {visitasGrupo.map((accion, idx) => renderCard(accion, idx))}
            </div>
          </div>
        )}

        {/* Grupo Comunicaciones */}
        {otrasGrupo.length > 0 && (
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-indigo-400/70 mb-2 px-1 mt-2">
              📱 Comunicaciones ({otrasGrupo.length})
            </div>
            <div className="flex flex-col gap-4">
              {otrasGrupo.map((accion, idx) => renderCard(accion, idx))}
            </div>
          </div>
        )}

        {/* Pantalla vacía */}
        {acciones.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 my-auto gap-5 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/5">
              <Award size={42} className="animate-bounce" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">¡Ruta completada! 🎉</h2>
              <p className="text-secondary text-xs mt-1.5 max-w-[240px] mx-auto leading-relaxed">
                Excelente trabajo. No quedan más acciones pendientes para hoy en {zonaName}.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* MODAL GESTIONAR */}
      {completarModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1326] border border-white/10 rounded-3xl w-full max-w-sm p-6 flex flex-col gap-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider text-white">
                  {completarModal.tipo === 'visita_programada' ? 'Completar Visita' : 'Gestionar ' + (TIPO_CONFIG[completarModal.tipo]?.label || completarModal.tipo)}
                </h3>
                <p className="text-[10px] text-secondary mt-0.5 truncate max-w-[200px]">{completarModal.empresa.nombre}</p>
              </div>
              <button onClick={() => setCompletarModal(null)} className="text-secondary hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black uppercase text-secondary tracking-widest">Resultado</label>
              <div className="grid grid-cols-2 gap-2">
                {(completarModal.tipo === 'visita_programada'
                  ? [
                      { key: 'visita_realizada', label: 'Contacto exitoso' },
                      { key: 'venta', label: 'Hubo venta 🛒' },
                      { key: 'reprogramado', label: 'Reprogramar' },
                      { key: 'sin_contacto', label: 'No atendió / Cerrado' }
                    ]
                  : [
                      { key: 'gestionado', label: 'Gestionado ✓' },
                      { key: 'sin_respuesta', label: 'Sin respuesta' },
                    ]
                ).map(r => (
                  <button key={r.key} type="button" onClick={() => setResultado(r.key)}
                    className={`p-3.5 rounded-xl border text-xs font-bold text-center transition-all ${resultado === r.key ? 'bg-primary/10 border-primary text-primary' : 'bg-[#151c36]/40 text-secondary border-white/5 hover:text-white'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase text-secondary tracking-widest flex items-center gap-1">
                <MessageSquare size={10} /> Notas
              </label>
              <textarea rows={3} placeholder="Observaciones..." value={notas} onChange={e => setNotas(e.target.value)}
                className="form-input bg-[#12182c]/60 border border-white/10 rounded-xl text-xs p-3 focus:border-primary outline-none resize-none" spellCheck="true" lang="es-AR" autoCorrect="on" />
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold flex items-center gap-1.5">
                <AlertTriangle size={12} /> {submitError}
              </div>
            )}

            <button onClick={handleCompletar} disabled={loadingId !== null}
              className="w-full btn btn-primary py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
              {loadingId ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Registrar y Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL REAGENDAR */}
      {reagendarModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-[#0e1326] border border-white/10 rounded-t-3xl md:rounded-3xl w-full max-w-sm p-6 flex flex-col gap-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider text-white">Reagendar</h3>
                <p className="text-[10px] text-secondary mt-0.5 truncate max-w-[200px]">{reagendarModal.empresa.nombre}</p>
              </div>
              <button onClick={() => setReagendarModal(null)} className="text-secondary hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black uppercase text-secondary tracking-widest">Nueva Fecha</label>
              <input type="date" min={new Date().toISOString().split('T')[0]} value={reagendaFecha}
                onChange={e => setReagendaFecha(e.target.value)}
                className="form-input bg-[#12182c]/60 border border-white/10 rounded-xl text-xs p-3.5 focus:border-primary outline-none text-white" />
            </div>
            <button onClick={handleReagendar} disabled={loadingId !== null || !reagendaFecha}
              className="w-full btn btn-primary py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
              {loadingId ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Confirmar Nueva Fecha'}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  function renderCard(accion: Accion, idx: number) {
    const emp = accion.empresa
    const cfg = TIPO_CONFIG[accion.tipo] || { label: accion.tipo, color: '#94a3b8', bgClass: 'bg-gray-500/10 text-gray-400 border-gray-500/25', emoji: '📋' }
    return (
      <div key={accion.id} className="relative bg-gradient-to-br from-[#12182c] to-[#0e1224] border border-white/5 hover:border-white/10 rounded-2xl p-4.5 shadow-xl transition-all duration-300 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary font-black text-sm flex items-center justify-center flex-shrink-0">
              {idx + 1}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate leading-snug">{emp.nombre}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${emp.estado === 'activo' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                  {emp.estado}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${cfg.bgClass}`}>
                  {cfg.emoji} {cfg.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {accion.tipo === 'visita_programada' && (
          <div className="flex flex-col gap-1 text-xs text-secondary">
            <div className="flex items-start gap-1.5">
              <MapPin size={14} className="text-secondary/70 mt-0.5 flex-shrink-0" />
              <span className="leading-snug">{emp.direccion || 'Sin dirección registrada'}</span>
            </div>
            <div className="text-[10px] text-secondary/50 font-bold ml-5">{emp.barrio || 'Sin Barrio'}</div>
          </div>
        )}

        {accion.descripcion && (
          <div className="text-xs bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-white/80">
            <span className="text-[8px] font-black uppercase text-secondary/70 tracking-widest block mb-0.5">Indicaciones</span>
            {accion.descripcion}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mt-1.5">
          <button onClick={() => openContextualLink(accion)}
            className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl border active:opacity-80 transition-all cursor-pointer ${cfg.bgClass}`}>
            {getContextualIcon(accion.tipo)}
            <span className="text-[9px] font-black uppercase tracking-wider">{getContextualLabel(accion.tipo)}</span>
          </button>

          <button onClick={() => setReagendarModal(accion)}
            className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/25 active:bg-blue-500/20 transition-all cursor-pointer">
            <Calendar size={15} />
            <span className="text-[9px] font-black uppercase tracking-wider">Reagendar</span>
          </button>

          <button onClick={() => setCompletarModal(accion)}
            className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/25 active:bg-primary/20 transition-all cursor-pointer">
            <CheckCircle size={15} />
            <span className="text-[9px] font-black uppercase tracking-wider">Completar</span>
          </button>
        </div>
      </div>
    )
  }
}
