'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Map as MapIcon, Printer, Navigation, Building2, Phone, MapPin, Trash2, Check, Link2, MessageCircle, Mail, AlertCircle, Download, ThumbsUp, ThumbsDown } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { CompleteActionButton } from '../empresas/[id]/ActionButtons'
import { formatDate } from '@/lib/date'
import { solicitarEliminacion, getSolicitudesPendientes, resolverSolicitudEliminacion } from '../empresas/[id]/quick-actions'

type EmpresaSugerida = {
  id: number
  nombre: string
  zona: string | null
  barrio: string | null
  direccion: string | null
  telefono: string | null
  estado: string
  cicloVentaDias: number | null
  diasDesdeUltimaVisita: number | null
  motivo: string
}

// Configuración visual por tipo de acción
const TIPO_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  visita:           { label: 'Visita',    color: '#10b981', bgColor: 'rgba(16,185,129,0.15)' },
  visita_programada: { label: 'Visita',    color: '#10b981', bgColor: 'rgba(16,185,129,0.15)' },
  whatsapp:         { label: 'WhatsApp',   color: '#25d366', bgColor: 'rgba(37,211,102,0.15)' },
  correo:           { label: 'Correo',     color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)'  },
  llamada:          { label: 'Llamada',    color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)' },
  planificacion:    { label: 'Planificación', color: '#c084fc', bgColor: 'rgba(192,132,252,0.15)' },
}

export default function IntelligentPlanner({
  sugerencias,
  zonas,
  crearRutaAction,
  accionesHoy = [],
  accionesFuturas = [],
  accionesVencidas = [],
  userNivel = 3,
  userAlias = '',
  pendingActionDeleteIds = [],
  eliminarAccionAction,
  reagendarAccionAction,
  reordenarRutaAction,
  marcarVisitadaAction,
  gestionarAccionNoVisitaAction,
  cambiarTipoAccionAction,
  vista = 'hoy'
}: {
  sugerencias: EmpresaSugerida[]
  zonas: string[]
  crearRutaAction: (empresaIds: number[], targetDateStr?: string) => Promise<void>
  accionesHoy?: any[]
  accionesFuturas?: any[]
  accionesVencidas?: any[]
  userNivel?: number
  userAlias?: string
  pendingActionDeleteIds?: number[]
  eliminarAccionAction?: (id: number) => Promise<void>
  reagendarAccionAction?: (id: number, dateStr: string) => Promise<void>
  reordenarRutaAction?: (ids: number[]) => Promise<void>
  marcarVisitadaAction?: (id: number) => Promise<void>
  gestionarAccionNoVisitaAction?: (payload: { accionId: number; empresaId: number; tipo: string; notas?: string }) => Promise<void>
  cambiarTipoAccionAction?: (accionId: number, nuevoTipo: string) => Promise<void>
  vista?: string
}) {
  const params = useParams()
  const zonaName = params.zonaName as string
  const [selectedZonas, setSelectedZonas] = useState<string[]>([])
  const [selectedRoute, setSelectedRoute] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showOnlyRoute, setShowOnlyRoute] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [generatingPdfDate, setGeneratingPdfDate] = useState<string | null>(null)
  const [localAccionesHoy, setLocalAccionesHoy] = useState<any[]>([])
  const [targetDate, setTargetDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })
  const pdfRef = useRef<HTMLDivElement>(null)
  const weeklyPdfRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [copied, setCopied] = useState(false)
  const [solicitudes, setSolicitudes] = useState<any[]>([])

  useEffect(() => {
    if (userNivel === 1) {
      getSolicitudesPendientes().then(setSolicitudes).catch(console.error)
    }
  }, [userNivel])

  const handleResolverSolicitud = async (solId: number, aprobado: boolean) => {
    if (confirm(`¿Estás seguro de que deseas ${aprobado ? 'APROBAR y eliminar permanentemente' : 'RECHAZAR'} esta solicitud?`)) {
      setIsSubmitting(true)
      await resolverSolicitudEliminacion(solId, aprobado)
      setSolicitudes(prev => prev.filter(s => s.id !== solId))
      window.location.reload()
    }
  }

  // Mini-modal Gestionado
  const [gestionandoAccion, setGestionandoAccion] = useState<any | null>(null)
  const [gestionNota, setGestionNota] = useState('')
  const [isGestionando, setIsGestionando] = useState(false)

  // Estado loading para Marcar Visitado
  const [marcandoVisitada, setMarcandoVisitada] = useState<number | null>(null)

  // Copiar link de ruta del día
  const handleCopyLink = () => {
    const link = `${window.location.origin}/visitas-hoy/${encodeURIComponent(zonaName)}`
    navigator.clipboard.writeText(link)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
      .catch(err => console.error('Error al copiar el enlace:', err))
  }

  useEffect(() => { setLocalAccionesHoy(accionesHoy || []) }, [accionesHoy])

  const moveAccionIndex = (oldIndex: number, newIndex: number) => {
    if (newIndex < 0 || newIndex >= localAccionesHoy.length || oldIndex === newIndex) return
    const newArray = [...localAccionesHoy]
    const [removed] = newArray.splice(oldIndex, 1)
    newArray.splice(newIndex, 0, removed)
    setLocalAccionesHoy(newArray)
    if (reordenarRutaAction) reordenarRutaAction(newArray.map(a => a.id))
  }

  const toggleZona = (zona: string) => {
    setSelectedZonas(prev => prev.includes(zona) ? prev.filter(z => z !== zona) : [...prev, zona])
  }

  const toggleEmpresa = (id: number) => {
    setSelectedRoute(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleCrearRuta = async () => {
    if (selectedRoute.length === 0) return
    setIsSubmitting(true)
    try {
      if (crearRutaAction) {
        await crearRutaAction(selectedRoute, vista === 'semana' ? targetDate : undefined)
        setSelectedRoute([])
        setShowOnlyRoute(true)
      }
    } catch (error) { console.error(error) }
    finally { setIsSubmitting(false) }
  }

  const handleEliminarAccion = async (accionId: number) => {
    if (!eliminarAccionAction) return

    if (userNivel === 1) {
      if (confirm('¿Eliminar esta acción de la ruta permanentemente?')) {
        await eliminarAccionAction(accionId)
      }
    } else {
      const motivo = prompt('Para solicitar la ELIMINACIÓN de esta tarea/acción, por favor justifica el motivo:')
      if (!motivo) return
      
      let desc = 'Tarea sin descripción'
      const foundHoy = localAccionesHoy.find(a => a.id === accionId)
      const foundFut = accionesFuturas.find(a => a.id === accionId)
      const foundVen = accionesVencidas.find(a => a.id === accionId)
      const targetAccion = foundHoy || foundFut || foundVen
      if (targetAccion) {
        desc = targetAccion.descripcion || `Acción de tipo ${targetAccion.tipo}`
      }

      await solicitarEliminacion('ACCION', accionId, desc, userAlias, motivo)
      alert('La solicitud de eliminación ha sido enviada al Administrador (Nivel 1) para su aprobación.')
      window.location.reload()
    }
  }

  const handleMarcarVisitada = async (accionId: number) => {
    if (!marcarVisitadaAction) return
    setMarcandoVisitada(accionId)
    try {
      await marcarVisitadaAction(accionId)
      setLocalAccionesHoy(prev => prev.filter(a => a.id !== accionId))
    } catch (e: any) {
      alert(`Error al marcar visitado: ${e?.message || 'Error desconocido'}`)
    } finally { 
      setMarcandoVisitada(null) 
    }
  }

  const handleCambiarTipo = async (accionId: number, nuevoTipo: string) => {
    if (!cambiarTipoAccionAction) return
    try {
      await cambiarTipoAccionAction(accionId, nuevoTipo)
    } catch (e: any) {
      alert(`Error al cambiar tipo: ${e?.message || 'Error desconocido'}`)
      console.error(e)
    }
  }

  const filteredSugerencias = useMemo(() => {
    const empresasYaProgramadas = accionesHoy.map(a => a.empresaId)
    let result = sugerencias.filter(s => !empresasYaProgramadas.includes(s.id))
    if (showOnlyRoute) {
      result = result.filter(s => selectedRoute.includes(s.id))
      result.sort((a, b) => selectedRoute.indexOf(a.id) - selectedRoute.indexOf(b.id))
      return result
    }
    if (selectedZonas.length > 0) {
      result = result.filter(s => s.zona && selectedZonas.includes(s.zona))
    }
    return result
  }, [sugerencias, selectedZonas, showOnlyRoute, selectedRoute, accionesHoy])

  // Agrupar: visitas primero, luego whatsapp/correo/llamada
  const accionesAgrupadas = useMemo(() => {
    const visitas = localAccionesHoy.filter(a => a.tipo === 'visita_programada' || a.tipo === 'visita')
    const otras = localAccionesHoy.filter(a => a.tipo !== 'visita_programada' && a.tipo !== 'visita')
    const ordenTipo: Record<string, number> = { whatsapp: 0, correo: 1, llamada: 2 }
    otras.sort((a, b) => (ordenTipo[a.tipo] ?? 9) - (ordenTipo[b.tipo] ?? 9))
    return { visitas, otras }
  }, [localAccionesHoy])

  const sinFechaAcciones = useMemo(() => {
    if (!accionesFuturas) return []
    return accionesFuturas.filter(accion => !accion.fechaVencimiento)
  }, [accionesFuturas])

  const groupedFuturas = useMemo(() => {
    const groups: Record<string, any[]> = {}
    if (!accionesFuturas) return []
    accionesFuturas.forEach(accion => {
      if (!accion.fechaVencimiento) return
      const dateKey = new Date(accion.fechaVencimiento).toISOString().split('T')[0]
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(accion)
    })
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({ date, items }))
  }, [accionesFuturas])

  const handleDownloadPDF = async (elementRef: React.RefObject<HTMLDivElement | null>) => {
    if (!elementRef.current) return
    try {
      setIsGeneratingPDF(true)
      const canvas = await html2canvas(elementRef.current, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, pdfWidth, (canvas.height * pdfWidth) / canvas.width)
      pdf.save(`Ruta_Del_Dia_${formatDate(new Date())}.pdf`)
    } catch (e) { alert('Error al generar PDF.') }
    finally { setIsGeneratingPDF(false) }
  }

  const handleDownloadWeeklyPDF = async (date: string) => {
    const element = weeklyPdfRefs.current[date]
    if (!element) return
    try {
      setGeneratingPdfDate(date)
      await new Promise(r => setTimeout(r, 150))
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, pdfWidth, (canvas.height * pdfWidth) / canvas.width)
      pdf.save(`Ruta_${formatDate(new Date(date + 'T12:00:00Z'))}.pdf`)
    } catch (e) { alert('Error al generar PDF.') }
    finally { setGeneratingPdfDate(null) }
  }

  // Render selector interactivo de tipo
  const renderTipoBadgeSelector = (accion: any) => {
    if (isGeneratingPDF) {
      const cfg = TIPO_CONFIG[accion.tipo] || { label: accion.tipo, color: '#94a3b8', bgColor: 'rgba(148,163,184,0.15)' }
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
          padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
          backgroundColor: cfg.bgColor, color: cfg.color, border: `1px solid ${cfg.color}40`,
          textTransform: 'uppercase', letterSpacing: '0.05em'
        }}>
          {cfg.label}
        </span>
      )
    }

    const cfg = TIPO_CONFIG[accion.tipo] || { color: '#94a3b8', bgColor: 'rgba(148,163,184,0.15)' }
    return (
      <select
        value={accion.tipo}
        onChange={(e) => handleCambiarTipo(accion.id, e.target.value)}
        style={{
          padding: '0.2rem 0.4rem',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 700,
          backgroundColor: cfg.bgColor,
          color: cfg.color,
          border: `1px solid ${cfg.color}40`,
          outline: 'none',
          cursor: 'pointer'
        }}
      >
        <option value="visita_programada">Visita</option>
        <option value="whatsapp">WhatsApp</option>
        <option value="correo">Correo</option>
        <option value="llamada">Llamada</option>
      </select>
    )
  }

  // Render badge estático
  const renderTipoBadgeStatic = (tipo: string) => {
    const cfg = TIPO_CONFIG[tipo] || { label: tipo, color: '#94a3b8', bgColor: 'rgba(148,163,184,0.15)' }
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
        padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
        backgroundColor: cfg.bgColor, color: cfg.color, border: `1px solid ${cfg.color}40`,
        textTransform: 'uppercase', letterSpacing: '0.05em'
      }}>
        {cfg.label}
      </span>
    )
  }

  // Render botón contextual según tipo
  const renderContextualBtn = (accion: any) => {
    const emp = accion.empresa
    if (accion.tipo === 'visita_programada') {
      return (
        <button
          onClick={e => { e.stopPropagation(); const q = encodeURIComponent(`${emp.direccion||''}, ${emp.barrio||''}, CABA`); window.open(`https://www.google.com/maps/search/?api=1&query=${q}`,'_blank') }}
          style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}
        >
          <Navigation size={13} /> Navegar
        </button>
      )
    }
    if (accion.tipo === 'whatsapp') {
      const phone = emp.telefono?.replace(/\D/g, '') || ''
      return phone ? (
        <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
          style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', backgroundColor: 'rgba(37,211,102,0.2)', color: '#25d366', border: '1px solid rgba(37,211,102,0.3)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', textDecoration: 'none' }}>
          <MessageCircle size={13} /> WhatsApp
        </a>
      ) : <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sin tel.</span>
    }
    if (accion.tipo === 'correo') {
      return emp.email ? (
        <a href={`mailto:${emp.email}`} onClick={e => e.stopPropagation()}
          style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', backgroundColor: 'rgba(59,130,246,0.2)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', textDecoration: 'none' }}>
          <Mail size={13} /> Correo
        </a>
      ) : <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sin email</span>
    }
    if (accion.tipo === 'llamada') {
      return emp.telefono ? (
        <a href={`tel:${emp.telefono}`} onClick={e => e.stopPropagation()}
          style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', backgroundColor: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', textDecoration: 'none' }}>
          <Phone size={13} /> {emp.telefono}
        </a>
      ) : <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sin tel.</span>
    }
    return null
  }

  const renderAccionRow = (accion: any, index: number, isVisita: boolean) => {
    const emp = accion.empresa
    const isMarking = marcandoVisitada === accion.id
    return (
      <tr key={accion.id} style={{ borderBottom: isGeneratingPDF ? '1px solid #f3f4f6' : '' }}>
        <td style={{ textAlign: 'center', width: '60px' }}>
          {isGeneratingPDF ? (
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#1B365D', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.875rem', margin: '0 auto' }}>{index + 1}</div>
          ) : isVisita ? (
            <input type="number" defaultValue={index + 1} min={1} max={accionesAgrupadas.visitas.length} disabled={vista === 'semana'}
              style={{ width: '48px', textAlign: 'center', padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--text-muted)', backgroundColor: 'transparent', color: 'white', opacity: vista === 'semana' ? 0.5 : 1 }}
              onBlur={e => {
                if (vista === 'semana') return
                const newOrder = parseInt(e.target.value)
                const currentIndex = localAccionesHoy.findIndex(a => a.id === accion.id)
                if (!isNaN(newOrder) && newOrder > 0 && newOrder <= accionesAgrupadas.visitas.length) moveAccionIndex(currentIndex, newOrder - 1)
                else e.target.value = (index + 1).toString()
              }}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
            />
          ) : (
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', margin: '0 auto' }}>{index + 1}</div>
          )}
        </td>
        {!isGeneratingPDF && <td style={{ width: '110px' }}>{renderTipoBadgeSelector(accion)}</td>}
        {vista === 'semana' && (
          <td><div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--primary)' }}>{accion.fechaVencimiento ? new Date(accion.fechaVencimiento).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }) : '-'}</div></td>
        )}
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Building2 size={16} style={{ color: isGeneratingPDF ? '#4b5563' : 'var(--text-muted)' }} />
            <div>
              <div style={{ fontWeight: 500, color: isGeneratingPDF ? 'black' : 'white' }}>{emp.nombre}</div>
              <div style={{ fontSize: '0.75rem', color: isGeneratingPDF ? '#6b7280' : 'var(--text-muted)' }}>
                {emp.estado?.toUpperCase()}
                {pendingActionDeleteIds.includes(accion.id) && (
                  <span className="text-warning ml-2 font-semibold">⚠️ Eliminación Pendiente</span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td>
          <div style={{ fontSize: '0.875rem' }}>
            <MapPin size={12} style={{ display: 'inline', color: isGeneratingPDF ? '#9ca3af' : 'var(--text-muted)', marginRight: '4px' }} />{emp.direccion || '-'}
          </div>
          <div style={{ fontSize: '0.75rem', color: isGeneratingPDF ? '#6b7280' : 'var(--text-muted)', marginTop: '0.25rem' }}>{emp.barrio} • {emp.zona}</div>
        </td>
        {!isGeneratingPDF && (
          <td style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
              {renderContextualBtn(accion)}
              <button onClick={() => handleMarcarVisitada(accion.id)} disabled={isMarking}
                style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', cursor: isMarking ? 'not-allowed' : 'pointer', backgroundColor: isMarking ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Completar para Registrar Resultado">
                {isMarking ? <div style={{ width: '14px', height: '14px', border: '2px solid rgba(52,211,153,0.3)', borderTopColor: '#34d399', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <ThumbsUp size={16} />}
              </button>
              <input type="date" title="Re-agendar"
                defaultValue={accion.fechaVencimiento ? new Date(accion.fechaVencimiento).toISOString().split('T')[0] : ''}
                onChange={async e => { if (e.target.value && reagendarAccionAction) await reagendarAccionAction(accion.id, e.target.value) }}
                style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--text-muted)', backgroundColor: 'transparent', color: 'white', fontSize: '0.75rem', width: '24px', cursor: 'pointer' }}
              />
              {(!pendingActionDeleteIds.includes(accion.id) || userNivel === 1) && (
                <button onClick={() => handleEliminarAccion(accion.id)}
                  style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Quitar"><Trash2 size={14} /></button>
              )}
            </div>
          </td>
        )}
      </tr>
    )
  }

  const tableHead = (showSemana = false) => (
    <tr style={isGeneratingPDF ? { borderBottom: '2px solid #e5e7eb' } : {}}>
      <th style={{ width: '50px', textAlign: 'center' }}>#</th>
      {!isGeneratingPDF && <th style={{ width: '110px' }}>Tipo</th>}
      {showSemana && <th>Fecha</th>}
      <th>Empresa</th>
      <th>Ubicación</th>
      {!isGeneratingPDF && <th style={{ textAlign: 'right' }}>Acciones</th>}
    </tr>
  )

  return (
    <div className="space-y-8" style={{ position: 'relative' }}>
      {/* MODAL BLOQUEANTE DE TAREAS VENCIDAS */}
      {accionesVencidas.length > 0 && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="glass-panel card max-w-4xl w-full" style={{ borderTop: '4px solid var(--error)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="card-title" style={{ margin: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error)', fontSize: '1.25rem' }}>
              <AlertCircle size={24} /> Tareas y Visitas Vencidas Pendientes
            </h2>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Atención: Tienes <strong>{accionesVencidas.length}</strong> tareas programadas de días anteriores que quedaron pendientes. Debes registrar una acción comercial (re-agendar, completar o eliminar) para poder continuar utilizando el Planificador.
            </p>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '90px' }}>Tipo</th>
                    <th>Empresa</th>
                    <th>Descripción / Tarea</th>
                    <th style={{ textAlign: 'right', width: '220px' }}>Gestión</th>
                  </tr>
                </thead>
                <tbody>
                  {accionesVencidas.map(accion => {
                    const emp = accion.empresa
                    return (
                      <tr key={accion.id}>
                        <td>{renderTipoBadgeStatic(accion.tipo)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Building2 size={16} style={{ color: 'var(--text-muted)' }} />
                            <div>
                              <div style={{ fontWeight: 500, color: 'white' }}>{emp?.nombre || 'General'}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp?.estado?.toUpperCase()}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                          {accion.descripcion}
                          <div style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: '0.25rem' }}>
                            Venció: {accion.fechaVencimiento ? new Date(accion.fechaVencimiento).toLocaleDateString() : '-'}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <input type="date" title="Re-agendar a futuro"
                              onChange={async e => { if (e.target.value && reagendarAccionAction) await reagendarAccionAction(accion.id, e.target.value) }}
                              style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--text-muted)', backgroundColor: 'transparent', color: 'white', fontSize: '0.75rem', width: '120px', cursor: 'pointer' }}
                            />
                            <button
                              onClick={async () => {
                                if (gestionarAccionNoVisitaAction) {
                                  await gestionarAccionNoVisitaAction({ accionId: accion.id, empresaId: emp.id, tipo: accion.tipo, notas: 'Completada desde bloqueo vencidas' })
                                  window.location.reload()
                                }
                              }}
                              className="btn btn-success"
                              style={{ padding: '0.25rem 0.5rem', height: '32px', fontSize: '0.75rem' }}
                              title="Completar tarea"
                            >
                              <ThumbsUp size={14} style={{ marginRight: '4px', display: 'inline' }} />
                              Completar
                            </button>
                            {(!pendingActionDeleteIds.includes(accion.id) || userNivel === 1) ? (
                              <button onClick={() => handleEliminarAccion(accion.id)}
                                style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Quitar"><Trash2 size={14} /></button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--warning)', padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: 'rgba(245,158,11,0.1)' }}>Pendiente</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* BLOQUE HOY */}
      {(localAccionesHoy.length > 0 || vista === 'hoy') && (
        <div className="glass-panel card" style={{ marginBottom: '2rem', borderTop: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 className="card-title" style={{ margin: 0 }}>Ruta Programada para Hoy</h2>
              <p className="card-subtitle">Tu recorrido actual. Puedes gestionar o eliminar acciones.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {/* Botón link de ruta del día */}
              <button onClick={handleCopyLink}
                className={`btn ${copied ? 'btn-success' : 'btn-secondary'}`}
                style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '38px', minHeight: '38px', borderRadius: '10px' }}
                title={copied ? '¡Enlace Copiado!' : 'Copiar Enlace de Ruta Móvil'}>
                {copied ? <Check size={16} /> : <Link2 size={16} />}
              </button>
              <button onClick={() => handleDownloadPDF(pdfRef)} disabled={isGeneratingPDF}
                className="btn btn-primary"
                style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '38px', minHeight: '38px', borderRadius: '10px' }}
                title="Descargar PDF de Ruta">
                {isGeneratingPDF ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Download size={16} />}
              </button>
            </div>
          </div>

          <div ref={pdfRef} style={isGeneratingPDF ? { backgroundColor: 'white', color: 'black', padding: '2rem' } : {}}>
            {isGeneratingPDF && (
              <div style={{ marginBottom: '2rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1B365D' }}>Mi Ruta del Día</h1>
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            )}

            <div className={`grid grid-cols-1 gap-6`}>
              {/* GRUPO 1: Visitas */}
              {accionesAgrupadas.visitas.length > 0 && (
                <div>
                  {!isGeneratingPDF && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', marginBottom: '0.75rem', backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: '6px', borderLeft: '3px solid #10b981' }}>
                      <Building2 size={14} style={{ color: '#10b981' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Visitas Programadas ({accionesAgrupadas.visitas.length})
                      </span>
                    </div>
                  )}
                  <div className={isGeneratingPDF ? '' : 'table-container'}>
                    <table className="table" style={isGeneratingPDF ? { color: 'black' } : {}}>
                      <thead>{tableHead(vista === 'semana')}</thead>
                      <tbody>{accionesAgrupadas.visitas.map((a, i) => renderAccionRow(a, i, true))}</tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* GRUPO 2: WhatsApp / Correo / Llamada */}
              {accionesAgrupadas.otras.length > 0 && (
                <div>
                  {!isGeneratingPDF && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', marginBottom: '0.75rem', backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: '6px', borderLeft: '3px solid #6366f1' }}>
                      <AlertCircle size={14} style={{ color: '#818cf8' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Comunicaciones del Día ({accionesAgrupadas.otras.length})
                      </span>
                    </div>
                  )}
                  <div className={isGeneratingPDF ? '' : 'table-container'}>
                    <table className="table" style={isGeneratingPDF ? { color: 'black' } : {}}>
                      <thead>{tableHead(vista === 'semana')}</thead>
                      <tbody>{accionesAgrupadas.otras.map((a, i) => renderAccionRow(a, i, false))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {localAccionesHoy.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No hay acciones programadas para hoy.
              </div>
            )}
          </div>
        </div>
      )}

      {/* BLOQUE FUTURAS */}
      {vista === 'semana' && (groupedFuturas.length > 0 || sinFechaAcciones.length > 0) && (
        <div className="space-y-6">
          {/* TAREAS SIN FECHA DEFINIDA */}
          {sinFechaAcciones.length > 0 && (
            <div className="glass-panel card">
              <h2 className="card-title" style={{ margin: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} className="text-warning" /> Tareas y Acciones sin Fecha Definida
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Estas tareas y acciones comerciales están pendientes pero no tienen fecha de vencimiento. Asignales una fecha para agendarlas en una ruta de visitas.
              </p>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '90px' }}>Tipo</th>
                      <th>Empresa</th>
                      <th>Descripción / Tarea</th>
                      <th style={{ textAlign: 'right', width: '220px' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sinFechaAcciones.map(accion => {
                      const emp = accion.empresa
                      return (
                        <tr key={accion.id}>
                          <td>{renderTipoBadgeStatic(accion.tipo)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <Building2 size={16} style={{ color: 'var(--text-muted)' }} />
                              <div>
                                <div style={{ fontWeight: 500, color: 'white' }}>{emp?.nombre || 'General'}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {emp?.estado?.toUpperCase()}
                                  {pendingActionDeleteIds.includes(accion.id) && (
                                    <span className="text-warning ml-2 font-semibold">⚠️ Eliminación Pendiente</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                            {accion.descripcion}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <input type="date" title="Asignar Fecha de Vencimiento"
                                onChange={async e => { if (e.target.value && reagendarAccionAction) await reagendarAccionAction(accion.id, e.target.value) }}
                                style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--text-muted)', backgroundColor: 'transparent', color: 'white', fontSize: '0.75rem', width: '120px', cursor: 'pointer' }}
                              />
                              {(!pendingActionDeleteIds.includes(accion.id) || userNivel === 1) && (
                                <button onClick={() => handleEliminarAccion(accion.id)}
                                  style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  title="Quitar"><Trash2 size={14} /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {groupedFuturas.length > 0 && (
            <div className="glass-panel card">
              <h2 className="card-title" style={{ margin: 0, marginBottom: '1.5rem' }}>Planificación por Fecha</h2>
              <div className="space-y-6">
                {groupedFuturas.map(({ date, items }) => {
                  const dateObj = new Date(date + 'T12:00:00Z')
                  return (
                    <div key={date} ref={el => { weeklyPdfRefs.current[date] = el }}
                      style={generatingPdfDate === date
                        ? { backgroundColor: 'white', color: 'black', padding: '2rem' }
                        : { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }
                      }>
                      {generatingPdfDate === date && (
                        <div style={{ marginBottom: '2rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
                          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1B365D' }}>Mi Ruta de Visitas</h1>
                          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{dateObj.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: generatingPdfDate === date ? 'none' : '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: generatingPdfDate === date ? '#1B365D' : 'var(--primary)', margin: 0 }}>
                          {dateObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </h3>
                        {generatingPdfDate !== date && (
                          <button onClick={() => handleDownloadWeeklyPDF(date)} disabled={generatingPdfDate !== null}
                            className="btn btn-secondary flex items-center justify-center" 
                            style={{ padding: '0.5rem', minWidth: '32px', minHeight: '32px', borderRadius: '8px' }}
                            title="Descargar PDF de Ruta"
                          >
                            <Download size={14} />
                          </button>
                        )}
                      </div>
                      <div className={generatingPdfDate === date ? '' : 'table-container'}>
                        <table className="table" style={generatingPdfDate === date ? { color: 'black' } : {}}>
                          <thead>
                            <tr style={generatingPdfDate === date ? { borderBottom: '2px solid #e5e7eb' } : {}}>
                              <th style={{ width: '90px' }}>Tipo</th>
                              <th>Empresa</th>
                              <th>Ubicación</th>
                              {generatingPdfDate !== date && <th style={{ textAlign: 'right' }}>Acciones</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {items.map(accion => {
                              const emp = accion.empresa
                              return (
                                <tr key={accion.id} style={{ borderBottom: generatingPdfDate === date ? '1px solid #f3f4f6' : '' }}>
                                  <td>{renderTipoBadgeStatic(accion.tipo)}</td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                      <Building2 size={16} style={{ color: 'var(--text-muted)' }} />
                                      <div>
                                        <div style={{ fontWeight: 500, color: generatingPdfDate === date ? 'black' : 'white' }}>{emp.nombre}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                          {emp.estado?.toUpperCase()}
                                          {pendingActionDeleteIds.includes(accion.id) && (
                                            <span className="text-warning ml-2 font-semibold">⚠️ Eliminación Pendiente</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ fontSize: '0.875rem' }}><MapPin size={12} style={{ display: 'inline', color: 'var(--text-muted)', marginRight: '4px' }} />{emp.direccion || '-'}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{emp.barrio} • {emp.zona}</div>
                                  </td>
                                  {generatingPdfDate !== date && (
                                    <td style={{ textAlign: 'right' }}>
                                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                                        <input type="date" title="Re-agendar" defaultValue={date}
                                          onChange={async e => { if (e.target.value && reagendarAccionAction) await reagendarAccionAction(accion.id, e.target.value) }}
                                          style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--text-muted)', backgroundColor: 'transparent', color: 'white', fontSize: '0.75rem', width: '24px', cursor: 'pointer' }}
                                        />
                                        {(!pendingActionDeleteIds.includes(accion.id) || userNivel === 1) && (
                                          <button onClick={() => handleEliminarAccion(accion.id)}
                                            style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            title="Quitar"><Trash2 size={14} /></button>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREADOR INTELIGENTE */}
      <div className="glass-panel card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapIcon style={{ color: 'var(--primary)' }} /> Creador Inteligente de Rutas
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            {selectedRoute.length > 0 && (
              <>
                <button onClick={() => setShowOnlyRoute(!showOnlyRoute)}
                  className={`btn ${showOnlyRoute ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.5rem 1rem' }}>
                  {showOnlyRoute ? 'Ver Sugerencias' : `Ver Selección (${selectedRoute.length})`}
                </button>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {vista === 'semana' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Para fecha:</span>
                      <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
                        style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid var(--text-muted)', backgroundColor: 'transparent', color: 'white', fontSize: '0.875rem' }} />
                    </div>
                  )}
                  <button onClick={handleCrearRuta} disabled={isSubmitting}
                    className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
                    {isSubmitting ? 'Programando...' : `Añadir (${selectedRoute.length}) a la Ruta`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        {!showOnlyRoute && (
          <div style={{ marginTop: '1.5rem' }}>
            <label className="form-label" style={{ marginBottom: '0.5rem' }}>Filtrar por Mini-Zona:</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setSelectedZonas([])}
                className={`btn-toggle ${selectedZonas.length === 0 ? 'active' : ''}`}
              >
                Todas
              </button>
              {zonas.map(z => (
                <button
                  key={z}
                  onClick={() => toggleZona(z)}
                  className={`btn-toggle ${selectedZonas.includes(z) ? 'active' : ''}`}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TABLA SUGERENCIAS */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '50px', textAlign: 'center' }}>{showOnlyRoute ? '#' : 'Sumar'}</th>
              <th>Empresa Sugerida</th>
              <th>Ubicación</th>
              <th>Contacto</th>
              <th>Motivo Sugerido</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSugerencias.map(s => {
              const idx = selectedRoute.indexOf(s.id)
              const isSel = idx !== -1
              return (
                <tr key={s.id} onClick={() => toggleEmpresa(s.id)}
                  style={{ cursor: 'pointer', backgroundColor: isSel ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent' }}>
                  <td style={{ textAlign: 'center' }}>
                    {isSel
                      ? <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.875rem', margin: '0 auto' }}>{idx + 1}</div>
                      : <div style={{ width: '24px', height: '24px', borderRadius: '4px', border: '2px solid var(--text-muted)', margin: '0 auto' }} />
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Building2 size={16} style={{ color: 'var(--text-muted)' }} />
                      <div>
                        <div style={{ fontWeight: 500 }}>{s.nombre}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.estado.toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.875rem' }}><MapPin size={12} style={{ display: 'inline', color: 'var(--text-muted)', marginRight: '4px' }} />{s.direccion || '-'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{s.barrio} • {s.zona}</div>
                  </td>
                  <td><div style={{ fontSize: '0.875rem' }}><Phone size={12} style={{ display: 'inline', color: 'var(--text-muted)', marginRight: '4px' }} />{s.telefono || '-'}</div></td>
                  <td>
                    <div style={{ fontSize: '0.75rem', fontWeight: 500, padding: '0.25rem 0.5rem', borderRadius: '4px', display: 'inline-block', backgroundColor: 'rgba(var(--warning-rgb), 0.1)', color: 'var(--warning)' }}>
                      {s.motivo}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={`/zonas/${zonaName}/empresas/${s.id}`} onClick={e => e.stopPropagation()}
                      className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                      Ver Ficha
                    </Link>
                  </td>
                </tr>
              )
            })}
            {filteredSugerencias.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  {sugerencias.length === 0 ? 'No hay empresas que cumplan los criterios para sugerir visitas hoy.' : 'No hay empresas en la selección o zonas actuales.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {userNivel === 1 && solicitudes.length > 0 && (
        <div className="glass-panel card mt-8" style={{ borderTop: '4px solid var(--warning)' }}>
          <h2 className="card-title" style={{ margin: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)' }}>
            <AlertCircle size={20} /> Solicitudes de Eliminación Pendientes (Administrador)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Los usuarios de Nivel 2 y 3 han solicitado eliminar los siguientes datos. Revisa la justificación y decide si aprobar o rechazar la solicitud.
          </p>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Elemento</th>
                  <th>Solicitado Por</th>
                  <th>Motivo / Justificación</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map(sol => (
                  <tr key={sol.id}>
                    <td>
                      <span className={`badge ${sol.tipo === 'EMPRESA' ? 'badge-danger' : 'badge-warning'}`}>
                        {sol.tipo}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, color: 'white' }}>{sol.nombreTarget} (ID: {sol.targetId})</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{sol.solicitadoPor}</td>
                    <td style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>"{sol.motivo}"</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleResolverSolicitud(sol.id, true)} className="btn btn-success text-xs px-3 py-1 flex items-center gap-1">
                          <ThumbsUp size={14} /> Aprobar y Eliminar
                        </button>
                        <button onClick={() => handleResolverSolicitud(sol.id, false)} className="btn btn-secondary text-xs px-3 py-1 flex items-center gap-1">
                          <ThumbsDown size={14} /> Rechazar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
