'use client'

import { useState, useTransition } from 'react'
import {
  X, Check, MessageCircle, Mail, Phone, CalendarPlus,
  User, Briefcase, ClipboardList, Star, Eye, ThumbsUp
} from 'lucide-react'
import { completarVisitaConRegistro } from '@/app/zonas/[zonaName]/planificador/actions'

const RESULTADOS = [
  { value: 'muestra_dejada',     label: 'Muestra Dejada',      color: '#7c3aed', icon: '🎁' },
  { value: 'contacto_positivo',  label: 'Contacto Positivo',   color: '#2563eb', icon: '👍' },
  { value: 'interes_futuro',     label: 'Interés Futuro',      color: '#0891b2', icon: '🌱' },
  { value: 'venta',              label: 'Venta Cerrada',        color: '#16a34a', icon: '🏆' },
  { value: 'reprogramado',       label: 'Reprogramado',         color: '#d97706', icon: '📅' },
  { value: 'sin_respuesta',      label: 'Sin Respuesta',        color: '#6b7280', icon: '🔇' },
  { value: 'negativo',           label: 'Negativo / Rechazo',  color: '#dc2626', icon: '❌' },
  { value: 'neutro',             label: 'Neutro',               color: '#475569', icon: '➡️' },
]

const ACCIONES_TIPO = [
  { value: 'whatsapp',           label: 'Enviar WhatsApp',     icon: <MessageCircle size={14} /> },
  { value: 'correo',             label: 'Enviar Correo',        icon: <Mail size={14} /> },
  { value: 'llamada',            label: 'Llamada de Cierre',   icon: <Phone size={14} /> },
  { value: 'visita_programada',  label: 'Nueva Visita',         icon: <CalendarPlus size={14} /> },
]

const EXHIBICION = [
  { value: 'buena',    label: 'Buena',    color: '#16a34a' },
  { value: 'regular',  label: 'Regular',  color: '#d97706' },
  { value: 'mala',     label: 'Mala',     color: '#dc2626' },
]

type Props = {
  accionId: number
  empresaId: number
  empresaNombre: string
  tipo?: string
  onClose: () => void
}

export default function CheckoutVisitaModal({ accionId, empresaId, empresaNombre, tipo = 'visita_programada', onClose }: Props) {
  const [isPending, startTransition] = useTransition()

  const [resultado, setResultado] = useState('')
  const [contacto, setContacto]   = useState('')
  const [cargo, setCargo]         = useState('')
  const [notas, setNotas]         = useState('')
  const [exhibicion, setExhibicion] = useState('')

  const [crearSiguiente, setCrearSiguiente] = useState(false)
  const [sigTipo, setSigTipo]               = useState('whatsapp')
  const [sigDescripcion, setSigDescripcion] = useState('')
  const [sigFecha, setSigFecha]             = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    return d.toISOString().split('T')[0]
  })
  const [sigPrioridad, setSigPrioridad] = useState('media')
  const [error, setError] = useState('')

  const tipoLabel = tipo === 'whatsapp' ? 'WhatsApp' : tipo === 'correo' ? 'Correo' : tipo === 'llamada' ? 'Llamada' : 'Visita'

  const handleSubmit = () => {
    if (!resultado) { setError('Seleccioná un resultado para continuar.'); return }
    if (!notas.trim()) { setError('Las notas son obligatorias.'); return }
    setError('')

    startTransition(async () => {
      await completarVisitaConRegistro({
        accionId,
        empresaId,
        tipo: tipo === 'visita_programada' ? 'visita' : tipo,
        resultado,
        contacto,
        cargo,
        notas,
        exhibicion,
        crearSiguienteAccion: crearSiguiente,
        siguienteAccionTipo: crearSiguiente ? sigTipo : undefined,
        siguienteAccionDescripcion: crearSiguiente ? sigDescripcion : undefined,
        siguienteAccionFecha: crearSiguiente ? sigFecha : undefined,
        siguienteAccionPrioridad: crearSiguiente ? sigPrioridad : undefined,
      })
      onClose()
    })
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
        padding: '1rem'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: '420px', background: 'linear-gradient(135deg, #141a2e 0%, #1a2240 100%)',
        borderRadius: '20px', border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden',
        position: 'relative', animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }} onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          padding: '1.5rem 1.5rem 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Check size={16} color="white" />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Registro de {tipoLabel}
              </span>
            </div>
            <h2 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{empresaNombre}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* RESULTADO */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <Star size={12} /> Resultado de la Visita *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {RESULTADOS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setResultado(r.value)}
                  style={{
                    padding: '0.6rem 0.75rem', borderRadius: '10px', cursor: 'pointer',
                    textAlign: 'left', fontSize: '0.85rem', fontWeight: 500,
                    border: resultado === r.value ? `2px solid ${r.color}` : '2px solid rgba(255,255,255,0.08)',
                    background: resultado === r.value ? `${r.color}22` : 'rgba(255,255,255,0.04)',
                    color: resultado === r.value ? 'white' : 'rgba(255,255,255,0.6)',
                    transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}
                >
                  <span>{r.icon}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* CONTACTO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                <User size={11} /> Contacto
              </label>
              <input
                value={contacto}
                onChange={e => setContacto(e.target.value)}
                placeholder="Nombre de quien atendió"
                style={{
                  width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
                  color: 'white', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                <Briefcase size={11} /> Cargo
              </label>
              <input
                value={cargo}
                onChange={e => setCargo(e.target.value)}
                placeholder="Ej: Gerente de Compras"
                style={{
                  width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
                  color: 'white', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* EXHIBICION */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              <Eye size={11} /> Exhibición en Góndola
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setExhibicion('')}
                style={{
                  padding: '0.4rem 0.75rem', borderRadius: '8px', cursor: 'pointer',
                  border: exhibicion === '' ? '2px solid rgba(255,255,255,0.5)' : '2px solid rgba(255,255,255,0.08)',
                  background: exhibicion === '' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem'
                }}
              >N/A</button>
              {EXHIBICION.map(ex => (
                <button
                  key={ex.value}
                  onClick={() => setExhibicion(ex.value)}
                  style={{
                    padding: '0.4rem 0.75rem', borderRadius: '8px', cursor: 'pointer',
                    border: exhibicion === ex.value ? `2px solid ${ex.color}` : '2px solid rgba(255,255,255,0.08)',
                    background: exhibicion === ex.value ? `${ex.color}22` : 'rgba(255,255,255,0.04)',
                    color: exhibicion === ex.value ? 'white' : 'rgba(255,255,255,0.6)', fontSize: '0.8rem',
                    transition: 'all 0.15s ease'
                  }}
                >{ex.label}</button>
              ))}
            </div>
          </div>

          {/* NOTAS */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              <ClipboardList size={11} /> Notas de la Visita *
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Describí lo que pasó en la visita: qué dijo el cliente, qué mostraste, acuerdos o comentarios relevantes..."
              rows={4}
              style={{
                width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
                color: 'white', fontSize: '0.875rem', outline: 'none', resize: 'vertical',
                boxSizing: 'border-box', lineHeight: 1.5
              }}
            />
          </div>

          {/* SIGUIENTE ACCIÓN */}
          <div style={{
            borderRadius: '12px',
            border: crearSiguiente ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
            background: crearSiguiente ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
            overflow: 'hidden', transition: 'all 0.2s ease'
          }}>
            <button
              onClick={() => setCrearSiguiente(!crearSiguiente)}
              style={{
                width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none',
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarPlus size={15} color={crearSiguiente ? '#818cf8' : 'rgba(255,255,255,0.4)'} />
                <span style={{ color: crearSiguiente ? '#c7d2fe' : 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: '0.85rem' }}>
                  Programar Próxima Acción
                </span>
              </div>
              <div style={{
                width: '36px', height: '20px', borderRadius: '10px',
                background: crearSiguiente ? '#6366f1' : 'rgba(255,255,255,0.15)',
                transition: 'background 0.2s', position: 'relative'
              }}>
                <div style={{
                  position: 'absolute', top: '2px',
                  left: crearSiguiente ? '18px' : '2px',
                  width: '16px', height: '16px', borderRadius: '50%',
                  background: 'white', transition: 'left 0.2s ease'
                }} />
              </div>
            </button>

            {crearSiguiente && (
              <div style={{ padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Tipo */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {ACCIONES_TIPO.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setSigTipo(t.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                        padding: '0.4rem 0.65rem', borderRadius: '8px', cursor: 'pointer',
                        border: sigTipo === t.value ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.1)',
                        background: sigTipo === t.value ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                        color: sigTipo === t.value ? '#c7d2fe' : 'rgba(255,255,255,0.5)',
                        fontSize: '0.8rem', transition: 'all 0.15s ease'
                      }}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
                {/* Descripción */}
                <input
                  value={sigDescripcion}
                  onChange={e => setSigDescripcion(e.target.value)}
                  placeholder="Detalle de la acción (ej: Enviar lista de precios por WhatsApp)"
                  style={{
                    width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)',
                    color: 'white', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box'
                  }}
                />
                {/* Fecha y Prioridad */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Fecha</label>
                    <input
                      type="date"
                      value={sigFecha}
                      onChange={e => setSigFecha(e.target.value)}
                      style={{
                        width: '100%', padding: '0.5rem 0.6rem', borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)',
                        color: 'white', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
                        colorScheme: 'dark'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Prioridad</label>
                    <select
                      value={sigPrioridad}
                      onChange={e => setSigPrioridad(e.target.value)}
                      style={{
                        width: '100%', padding: '0.5rem 0.6rem', borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)', background: '#1a2240',
                        color: 'white', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box'
                      }}
                    >
                      <option value="alta">Alta</option>
                      <option value="media">Media</option>
                      <option value="baja">Baja</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ERROR */}
          {error && (
            <p style={{ color: '#f87171', fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>{error}</p>
          )}

          {/* FOOTER */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '0.75rem', borderRadius: '10px', cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '0.9rem'
              }}
            >Cancelar</button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              style={{
                flex: 2, padding: '0.75rem', borderRadius: '10px', cursor: isPending ? 'not-allowed' : 'pointer',
                border: 'none', background: isPending ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white', fontWeight: 700, fontSize: '0.9rem',
                boxShadow: isPending ? 'none' : '0 4px 15px rgba(99,102,241,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                transition: 'all 0.2s ease'
              }}
            >
              {isPending ? (
                <>
                  <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Guardando...
                </>
              ) : (
                <><ThumbsUp size={16} /> Guardar Check-out</>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalSlideIn {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
