'use client'

import { useState } from 'react'
import { 
  Building2, MapPin, Navigation, Calendar, 
  CheckCircle, Clock, ChevronRight, X, 
  MessageSquare, Award, Phone, AlertTriangle 
} from 'lucide-react'
import { completarVisitaAction, reagendarVisitaAction } from './actions'

interface Empresa {
  id: number
  nombre: string
  direccion: string | null
  barrio: string | null
  telefono: string | null
  estado: string
  latitud?: number | null
  longitud?: number | null
}

interface AccionVisita {
  id: number
  empresaId: number
  descripcion: string
  orden: number
  empresa: Empresa
}

interface Props {
  initialVisitas: AccionVisita[]
}

export default function VisitasHoyCabaClient({ initialVisitas }: Props) {
  const [visitas, setVisitas] = useState<AccionVisita[]>(initialVisitas)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  
  // Modal completar
  const [completarModal, setCompletarModal] = useState<AccionVisita | null>(null)
  const [resultado, setResultado] = useState('visita_realizada')
  const [notas, setNotas] = useState('')
  const [submitError, setSubmitError] = useState('')

  // Modal reagendar
  const [reagendarModal, setReagendarModal] = useState<AccionVisita | null>(null)
  const [reagendaFecha, setReagendaFecha] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1) // default tomorrow
    return d.toISOString().split('T')[0]
  })

  const openGoogleMaps = (emp: any) => {
    if (emp.latitud && emp.longitud) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${emp.latitud},${emp.longitud}`, '_blank')
    } else {
      const addressStr = [emp.direccion, emp.barrio, 'CABA'].filter(Boolean).join(', ')
      const query = encodeURIComponent(addressStr)
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
    }
  }

  const handleCompletar = async () => {
    if (!completarModal) return
    setLoadingId(completarModal.id)
    setSubmitError('')
    try {
      const res = await completarVisitaAction(
        completarModal.id,
        completarModal.empresaId,
        notas,
        resultado
      )
      if (res.success) {
        setVisitas(prev => prev.filter(v => v.id !== completarModal.id))
        setCompletarModal(null)
        setNotas('')
        setResultado('visita_realizada')
      } else {
        setSubmitError(res.error || 'Error al completar la visita')
      }
    } catch (e) {
      setSubmitError('Error de red al completar la visita')
    } finally {
      setLoadingId(null)
    }
  }

  const handleReagendar = async () => {
    if (!reagendarModal || !reagendaFecha) return
    setLoadingId(reagendarModal.id)
    setSubmitError('')
    try {
      const res = await reagendarVisitaAction(reagendarModal.id, reagendaFecha)
      if (res.success) {
        setVisitas(prev => prev.filter(v => v.id !== reagendarModal.id))
        setReagendarModal(null)
      } else {
        setSubmitError(res.error || 'Error al reagendar la visita')
      }
    } catch (e) {
      setSubmitError('Error de red al reagendar la visita')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#080b16] text-white flex flex-col font-sans">
      
      {/* Header Premium Móvil */}
      <header className="sticky top-0 z-40 bg-[#0e1428]/85 backdrop-blur-md border-b border-white/5 px-4 py-4.5 flex flex-col gap-1 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h1 className="text-base font-black uppercase tracking-wider text-white">Visitas Hoy CABA</h1>
          </div>
          <span className="text-xs font-bold bg-primary/20 text-primary border border-primary/30 px-2.5 py-1 rounded-full">
            {visitas.length} Pendientes
          </span>
        </div>
        <p className="text-[10px] text-secondary font-medium uppercase tracking-widest mt-0.5">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </header>

      {/* Cuerpo principal */}
      <main className="flex-1 p-4 flex flex-col gap-4 max-w-md mx-auto w-full">
        
        {/* Listado de tarjetas de visitas */}
        <div className="flex flex-col gap-4">
          {visitas.map((visita, idx) => {
            const emp = visita.empresa
            return (
              <div 
                key={visita.id} 
                className="relative bg-gradient-to-br from-[#12182c] to-[#0e1224] border border-white/5 hover:border-white/10 rounded-2xl p-4.5 shadow-xl transition-all duration-300 flex flex-col gap-4"
              >
                {/* Cabecera Tarjeta: Número y Nombre */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary font-black text-sm flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-white truncate leading-snug">{emp.nombre}</h2>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          emp.estado === 'activo' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        }`}>
                          {emp.estado}
                        </span>
                        {emp.telefono && (
                          <a 
                            href={`tel:${emp.telefono}`} 
                            className="flex items-center gap-0.5 text-secondary hover:text-white text-[10px] font-semibold ml-2"
                          >
                            <Phone size={10} /> Call
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dirección / Mapa */}
                <div className="flex flex-col gap-1 text-xs text-secondary">
                  <div className="flex items-start gap-1.5">
                    <MapPin size={14} className="text-secondary/70 mt-0.5 flex-shrink-0" />
                    <span className="leading-snug">{emp.direccion || 'Sin dirección registrada'}</span>
                  </div>
                  <div className="text-[10px] text-secondary/50 font-bold ml-5">
                    {emp.barrio || 'Sin Barrio'}
                  </div>
                </div>

                {/* Motivo programado */}
                {visita.descripcion && (
                  <div className="text-xs bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-white/80">
                    <span className="text-[8px] font-black uppercase text-secondary/70 tracking-widest block mb-0.5">Indicaciones</span>
                    {visita.descripcion}
                  </div>
                )}

                {/* Botones de acción móvil (Grandes y táctiles) */}
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  
                  {/* Botón Navegar */}
                  <button
                    onClick={() => openGoogleMaps(emp)}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-green-500/10 text-green-400 border border-green-500/25 active:bg-green-500/20 transition-all cursor-pointer"
                  >
                    <Navigation size={15} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Navegar</span>
                  </button>

                  {/* Botón Reagendar */}
                  <button
                    onClick={() => setReagendarModal(visita)}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/25 active:bg-blue-500/20 transition-all cursor-pointer"
                  >
                    <Calendar size={15} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Reagendar</span>
                  </button>

                  {/* Botón Completar */}
                  <button
                    onClick={() => setCompletarModal(visita)}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/25 active:bg-primary/20 transition-all cursor-pointer"
                  >
                    <CheckCircle size={15} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Completar</span>
                  </button>

                </div>
              </div>
            )
          })}
        </div>

        {/* Pantalla vacía - Ruta Completada */}
        {visitas.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 my-auto gap-5 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/5">
              <Award size={42} className="animate-bounce" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">¡Ruta completada! 🎉</h2>
              <p className="text-secondary text-xs mt-1.5 max-w-[240px] mx-auto leading-relaxed">
                Excelente trabajo. No quedan más visitas programadas para hoy en la zona de CABA.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* MODAL REGISTRAR DETALLES DE VISITA COMPLETADA */}
      {completarModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-[#0e1326] border border-white/10 rounded-t-3xl md:rounded-3xl w-full max-w-sm p-6 flex flex-col gap-5 animate-slide-up shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider text-white">Completar Visita</h3>
                <p className="text-[10px] text-secondary mt-0.5 truncate max-w-[200px]">{completarModal.empresa.nombre}</p>
              </div>
              <button 
                onClick={() => setCompletarModal(null)} 
                className="text-secondary hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Resultado de la visita */}
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black uppercase text-secondary tracking-widest">Resultado</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'visita_realizada', label: 'Contacto exitoso', color: 'border-blue-500/20 active:bg-blue-500/10 text-blue-400' },
                  { key: 'venta', label: 'Hubo venta 🛒', color: 'border-green-500/20 active:bg-green-500/10 text-green-400' },
                  { key: 'reprogramado', label: 'Reprogramar', color: 'border-yellow-500/20 active:bg-yellow-500/10 text-yellow-400' },
                  { key: 'sin_contacto', label: 'No atendió / Cerrado', color: 'border-red-500/20 active:bg-red-500/10 text-red-400' }
                ].map(r => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setResultado(r.key)}
                    className={`p-3.5 rounded-xl border text-xs font-bold text-center transition-all ${
                      resultado === r.key 
                        ? 'bg-primary/10 border-primary text-primary shadow-[0_0_12px_rgba(59,130,246,0.1)]' 
                        : `bg-[#151c36]/40 text-secondary border-white/5 hover:text-white ${r.color}`
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notas opcionales */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase text-secondary tracking-widest flex items-center gap-1">
                <MessageSquare size={10} /> Notas de la gestión
              </label>
              <textarea
                rows={3}
                placeholder="Escribe observaciones de la visita..."
                value={notas}
                onChange={e => setNotas(e.target.value)}
                className="form-input bg-[#12182c]/60 border border-white/10 rounded-xl text-xs p-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
                spellCheck="true" lang="es-AR" autoCorrect="on"
              />
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold flex items-center gap-1.5">
                <AlertTriangle size={12} /> {submitError}
              </div>
            )}

            {/* Acciones */}
            <button
              onClick={handleCompletar}
              disabled={loadingId !== null}
              className="w-full btn btn-primary py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
            >
              {loadingId ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                'Registrar y Guardar'
              )}
            </button>
          </div>
        </div>
      )}

      {/* MODAL REAGENDAR VISITA */}
      {reagendarModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-[#0e1326] border border-white/10 rounded-t-3xl md:rounded-3xl w-full max-w-sm p-6 flex flex-col gap-5 animate-slide-up shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider text-white">Reagendar Visita</h3>
                <p className="text-[10px] text-secondary mt-0.5 truncate max-w-[200px]">{reagendarModal.empresa.nombre}</p>
              </div>
              <button 
                onClick={() => setReagendarModal(null)} 
                className="text-secondary hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Selector de fecha */}
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black uppercase text-secondary tracking-widest">Seleccionar nueva fecha</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={reagendaFecha}
                onChange={e => setReagendaFecha(e.target.value)}
                className="form-input bg-[#12182c]/60 border border-white/10 rounded-xl text-xs p-3.5 focus:border-primary outline-none text-white transition-all"
              />
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold flex items-center gap-1.5">
                <AlertTriangle size={12} /> {submitError}
              </div>
            )}

            {/* Botón guardar reagendamiento */}
            <button
              onClick={handleReagendar}
              disabled={loadingId !== null || !reagendaFecha}
              className="w-full btn btn-primary py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
            >
              {loadingId ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                'Confirmar Nueva Fecha'
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
