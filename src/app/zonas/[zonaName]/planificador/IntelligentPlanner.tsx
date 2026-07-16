'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Map as MapIcon, Printer, Navigation, Building2, Phone, MapPin, Trash2, Check, Link2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { CompleteActionButton } from '../empresas/[id]/ActionButtons'
import { formatDate } from '@/lib/date'

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

export default function IntelligentPlanner({
  sugerencias,
  zonas,
  crearRutaAction,
  accionesHoy = [],
  accionesFuturas = [],
  eliminarAccionAction,
  reagendarAccionAction,
  reordenarRutaAction,
  vista = 'hoy'
}: {
  sugerencias: EmpresaSugerida[]
  zonas: string[]
  crearRutaAction: (empresaIds: number[], targetDateStr?: string) => Promise<void>
  accionesHoy?: any[]
  accionesFuturas?: any[]
  eliminarAccionAction?: (id: number) => Promise<void>
  reagendarAccionAction?: (id: number, dateStr: string) => Promise<void>
  reordenarRutaAction?: (ids: number[]) => Promise<void>
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
    d.setDate(d.getDate() + 1) // default to tomorrow
    return d.toISOString().split('T')[0]
  })
  const pdfRef = useRef<HTMLDivElement>(null)
  const weeklyPdfRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [copied, setCopied] = useState(false)

  const handleCopyLink = () => {
    const link = `${window.location.origin}/visitas-hoy-caba`
    navigator.clipboard.writeText(link)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch((err) => {
        console.error('Error al copiar el enlace:', err)
      })
  }

  useEffect(() => {
    setLocalAccionesHoy(accionesHoy || [])
  }, [accionesHoy])

  const moveAccionIndex = (oldIndex: number, newIndex: number) => {
    if (newIndex < 0 || newIndex >= localAccionesHoy.length || oldIndex === newIndex) return
    const newArray = [...localAccionesHoy]
    const [removed] = newArray.splice(oldIndex, 1)
    newArray.splice(newIndex, 0, removed)
    setLocalAccionesHoy(newArray)
    if (reordenarRutaAction) {
      reordenarRutaAction(newArray.map(a => a.id))
    }
  }

  const toggleZona = (zona: string) => {
    setSelectedZonas(prev => 
      prev.includes(zona) ? prev.filter(z => z !== zona) : [...prev, zona]
    )
  }

  const toggleEmpresa = (id: number) => {
    setSelectedRoute(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id)
      } else {
        return [...prev, id]
      }
    })
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
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleEliminarAccion = async (accionId: number) => {
    if (eliminarAccionAction && confirm('¿Estás seguro de que deseas eliminar esta visita de la ruta de hoy?')) {
      await eliminarAccionAction(accionId)
    }
  }

  const handleDownloadPDF = async (elementRef: React.RefObject<HTMLDivElement | null>) => {
    if (!elementRef.current) return
    
    try {
      setIsGeneratingPDF(true)
      const element = elementRef.current
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Ruta_Del_Dia_${formatDate(new Date())}.pdf`)
    } catch (error) {
      console.error('Error generando PDF:', error)
      alert('Hubo un error al generar el PDF.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleDownloadWeeklyPDF = async (date: string) => {
    const element = weeklyPdfRefs.current[date]
    if (!element) return
    
    try {
      setGeneratingPdfDate(date)
      // Esperar a que React aplique los estilos de PDF (150ms)
      await new Promise((resolve) => setTimeout(resolve, 150))
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
      
      const dateObj = new Date(date + 'T12:00:00Z')
      const formattedDate = formatDate(dateObj)
      pdf.save(`Ruta_${formattedDate}.pdf`)
    } catch (error) {
      console.error('Error generando PDF semanal:', error)
      alert('Hubo un error al generar el PDF.')
    } finally {
      setGeneratingPdfDate(null)
    }
  }

  // Filtrar sugerencias excluyendo las que ya están en la ruta de hoy
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

  const openGoogleMaps = (e: React.MouseEvent, direccion: string, barrio: string) => {
    e.stopPropagation()
    const query = encodeURIComponent(`${direccion || ''}, ${barrio || ''}, CABA`)
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
  }

  // Group future actions by date
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
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, items]) => ({ date, items }))
  }, [accionesFuturas])

  return (
    <div className="space-y-8">
      {/* SECCIÓN 1: RUTAS PROGRAMADAS */}
      <div className="grid gap-6">
        
        {/* BLOQUE HOY */}
        {(localAccionesHoy.length > 0 || vista === 'hoy') && (
          <div className="glass-panel card" style={{ marginBottom: '2rem', borderTop: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 className="card-title" style={{ margin: 0 }}>Ruta Programada para Hoy</h2>
              <p className="card-subtitle">Tu recorrido actual. Puedes eliminar visitas si hubo cambios.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {/* Botón Copiar Link (sólo si es la zona CABA) */}
              {zonaName === 'CABA' && (
                <button
                  onClick={handleCopyLink}
                  className={`btn ${copied ? 'btn-success bg-green-500/20 text-green-400 border-green-500/30' : 'btn-secondary border-white/10 text-secondary hover:text-white'}`}
                  style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '38px', minHeight: '38px', borderRadius: '10px' }}
                  title={copied ? "¡Enlace Copiado!" : "Copiar Enlace de Ruta Móvil"}
                >
                  {copied ? <Check size={16} /> : <Link2 size={16} />}
                </button>
              )}
              
              {/* Botón Descargar (Cambiado a Icono) */}
              <button 
                onClick={() => handleDownloadPDF(pdfRef)} 
                disabled={isGeneratingPDF}
                className="btn btn-primary"
                style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '38px', minHeight: '38px', borderRadius: '10px' }}
                title="Descargar PDF de Ruta"
              >
                {isGeneratingPDF ? (
                  <div className="w-4.5 h-4.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Printer size={16} />
                )}
              </button>
            </div>
          </div>

          <div ref={pdfRef} style={isGeneratingPDF ? { backgroundColor: 'white', color: 'black', padding: '2rem' } : {}}>
            {isGeneratingPDF && (
              <div style={{ marginBottom: '2rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1B365D' }}>Mi Ruta del Día</h1>
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            )}
            
            <div className={isGeneratingPDF ? '' : 'table-container'}>
              <table className="table" style={isGeneratingPDF ? { color: 'black' } : {}}>
                <thead>
                  <tr style={isGeneratingPDF ? { borderBottom: '2px solid #e5e7eb' } : {}}>
                    <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                    {vista === 'semana' && <th>Fecha</th>}
                    <th>Empresa</th>
                    <th>Ubicación</th>
                    <th>Motivo de Visita</th>
                    {!isGeneratingPDF && <th style={{ textAlign: 'right' }}>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {localAccionesHoy.map((accion, index) => {
                    const emp = accion.empresa
                    return (
                      <tr key={accion.id} style={{ borderBottom: isGeneratingPDF ? '1px solid #f3f4f6' : '' }}>
                        <td style={{ textAlign: 'center', width: '60px' }}>
                          {isGeneratingPDF ? (
                            <div style={{ 
                              width: '28px', height: '28px', borderRadius: '50%', 
                              backgroundColor: '#1B365D', color: 'white', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 'bold', fontSize: '0.875rem', margin: '0 auto'
                            }}>
                              {index + 1}
                            </div>
                          ) : (
                            <input 
                              key={`${accion.id}-${index}`}
                              type="number"
                              defaultValue={index + 1}
                              min={1}
                              max={localAccionesHoy.length}
                              disabled={vista === 'semana'}
                              style={{ 
                                width: '48px', textAlign: 'center', padding: '0.25rem',
                                borderRadius: '4px', border: '1px solid var(--text-muted)',
                                backgroundColor: 'transparent', color: 'white',
                                opacity: vista === 'semana' ? 0.5 : 1
                              }}
                              onBlur={(e) => {
                                if (vista === 'semana') return
                                const newOrder = parseInt(e.target.value)
                                if (!isNaN(newOrder) && newOrder > 0 && newOrder <= localAccionesHoy.length) {
                                  moveAccionIndex(index, newOrder - 1)
                                } else {
                                  e.target.value = (index + 1).toString()
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur()
                                }
                              }}
                            />
                          )}
                        </td>
                        {vista === 'semana' && (
                          <td>
                            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--primary)' }}>
                              {accion.fechaVencimiento ? new Date(accion.fechaVencimiento).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }) : '-'}
                            </div>
                          </td>
                        )}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Building2 size={16} style={{ color: isGeneratingPDF ? '#4b5563' : 'var(--text-muted)' }} />
                            <div>
                              <div style={{ fontWeight: 500, color: isGeneratingPDF ? 'black' : 'white' }}>{emp.nombre}</div>
                              <div style={{ fontSize: '0.75rem', color: isGeneratingPDF ? '#6b7280' : 'var(--text-muted)' }}>
                                {emp.estado?.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.875rem' }}>
                            <MapPin size={12} style={{ display: 'inline', color: isGeneratingPDF ? '#9ca3af' : 'var(--text-muted)', marginRight: '4px' }} />
                            {emp.direccion || '-'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: isGeneratingPDF ? '#6b7280' : 'var(--text-muted)', marginTop: '0.25rem' }}>
                            {emp.barrio} • {emp.zona}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.875rem', color: isGeneratingPDF ? 'black' : 'white' }}>
                            {accion.descripcion}
                          </div>
                        </td>
                        {!isGeneratingPDF && (
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <CompleteActionButton accionId={accion.id} empresaId={emp.id} />
                              
                              <input 
                                type="date"
                                title="Re-agendar"
                                defaultValue={accion.fechaVencimiento ? new Date(accion.fechaVencimiento).toISOString().split('T')[0] : ''}
                                onChange={async (e) => {
                                  if (e.target.value && reagendarAccionAction) {
                                    await reagendarAccionAction(accion.id, e.target.value)
                                  }
                                }}
                                style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--text-muted)', backgroundColor: 'transparent', color: 'white', fontSize: '0.75rem', width: '24px', cursor: 'pointer' }}
                              />
                              
                              <button 
                                onClick={(e) => openGoogleMaps(e, emp.direccion, emp.barrio)}
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', borderColor: 'transparent' }}
                              >
                                <Navigation size={14} /> Navegar
                              </button>
                              <button 
                                onClick={() => handleEliminarAccion(accion.id)}
                                style={{ 
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                                  color: 'var(--error)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                title="Quitar de la ruta"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                  
                  {localAccionesHoy.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No hay visitas programadas para hoy.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* BLOQUE FUTURAS (Solo en vista semana) */}
        {vista === 'semana' && groupedFuturas.length > 0 && (
          <div className="glass-panel card">
            <h2 className="card-title" style={{ margin: 0, marginBottom: '1.5rem' }}>Planificación por Fecha</h2>
            
            <div className="space-y-6">
              {groupedFuturas.map(({ date, items }) => {
                const dateObj = new Date(date + 'T12:00:00Z') // prevent timezone shift on display
                return (
                  <div 
                    key={date} 
                    ref={el => { weeklyPdfRefs.current[date] = el }}
                    style={generatingPdfDate === date 
                      ? { backgroundColor: 'white', color: 'black', padding: '2rem' } 
                      : { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }
                    }
                  >
                    {generatingPdfDate === date && (
                      <div style={{ marginBottom: '2rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1B365D' }}>Mi Ruta de Visitas</h1>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                          {dateObj.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: generatingPdfDate === date ? 'none' : '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: generatingPdfDate === date ? '#1B365D' : 'var(--primary)', margin: 0 }}>
                        {dateObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </h3>
                      {generatingPdfDate !== date && (
                        <button
                          onClick={() => handleDownloadWeeklyPDF(date)}
                          disabled={generatingPdfDate !== null}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          <Printer size={14} style={{ marginRight: '0.25rem', display: 'inline' }} />
                          {generatingPdfDate === date ? 'Generando...' : 'Descargar PDF'}
                        </button>
                      )}
                    </div>
                    
                    <div className={generatingPdfDate === date ? '' : 'table-container'}>
                      <table className="table" style={generatingPdfDate === date ? { color: 'black' } : {}}>
                        <thead>
                          <tr style={generatingPdfDate === date ? { borderBottom: '2px solid #e5e7eb' } : {}}>
                            <th>Empresa</th>
                            <th>Ubicación</th>
                            <th>Motivo de Visita</th>
                            {generatingPdfDate !== date && <th style={{ textAlign: 'right' }}>Acciones</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((accion) => {
                            const emp = accion.empresa
                            return (
                              <tr key={accion.id} style={{ borderBottom: generatingPdfDate === date ? '1px solid #f3f4f6' : '' }}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Building2 size={16} style={{ color: generatingPdfDate === date ? '#4b5563' : 'var(--text-muted)' }} />
                                    <div>
                                      <div style={{ fontWeight: 500, color: generatingPdfDate === date ? 'black' : 'white' }}>{emp.nombre}</div>
                                      <div style={{ fontSize: '0.75rem', color: generatingPdfDate === date ? '#6b7280' : 'var(--text-muted)' }}>{emp.estado?.toUpperCase()}</div>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div style={{ fontSize: '0.875rem' }}>
                                    <MapPin size={12} style={{ display: 'inline', color: generatingPdfDate === date ? '#9ca3af' : 'var(--text-muted)', marginRight: '4px' }} />
                                    {emp.direccion || '-'}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: generatingPdfDate === date ? '#6b7280' : 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    {emp.barrio} • {emp.zona}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ fontSize: '0.875rem', color: generatingPdfDate === date ? 'black' : 'white' }}>{accion.descripcion}</div>
                                </td>
                                {generatingPdfDate !== date && (
                                  <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                                      
                                      <input 
                                        type="date"
                                        title="Re-agendar"
                                        defaultValue={date}
                                        onChange={async (e) => {
                                          if (e.target.value && reagendarAccionAction) {
                                            await reagendarAccionAction(accion.id, e.target.value)
                                          }
                                        }}
                                        style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--text-muted)', backgroundColor: 'transparent', color: 'white', fontSize: '0.75rem', width: '24px', cursor: 'pointer' }}
                                      />

                                      <button 
                                        onClick={() => handleEliminarAccion(accion.id)}
                                        style={{ 
                                          padding: '0.25rem 0.5rem',
                                          borderRadius: '4px',
                                          backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                                          color: 'var(--error)',
                                          border: '1px solid rgba(239, 68, 68, 0.3)',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center'
                                        }}
                                        title="Quitar de la ruta"
                                      >
                                        <Trash2 size={14} />
                                      </button>
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

      {/* SECCIÓN 2: CREADOR INTELIGENTE DE RUTAS */}
      <div className="glass-panel card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapIcon style={{ color: 'var(--primary)' }} /> Creador Inteligente de Rutas
          </h2>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            {selectedRoute.length > 0 && (
              <>
                <button 
                  onClick={() => setShowOnlyRoute(!showOnlyRoute)}
                  className={`btn ${showOnlyRoute ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.5rem 1rem' }}
                >
                  {showOnlyRoute ? 'Ver Sugerencias' : `Ver Selección (${selectedRoute.length})`}
                </button>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {vista === 'semana' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Para fecha:</span>
                      <input 
                        type="date"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid var(--text-muted)', backgroundColor: 'transparent', color: 'white', fontSize: '0.875rem' }}
                      />
                    </div>
                  )}
                  <button 
                    onClick={handleCrearRuta} 
                    disabled={isSubmitting}
                    className="btn btn-primary"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    {isSubmitting ? 'Programando...' : `Añadir (${selectedRoute.length}) a la Ruta`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {!showOnlyRoute && (
          <div style={{ marginTop: '1.5rem' }}>
            <label className="form-label" style={{ marginBottom: '0.5rem' }}>Filtrar Sugerencias por Zona:</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {zonas.map(z => (
                <button
                  key={z}
                  onClick={() => toggleZona(z)}
                  className={`badge ${selectedZonas.includes(z) ? 'badge-info' : 'badge-neutral'}`}
                  style={{ cursor: 'pointer', padding: '0.4rem 0.8rem' }}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

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
              const index = selectedRoute.indexOf(s.id)
              const isSelected = index !== -1
              const sequenceNum = index + 1

              return (
                <tr 
                  key={s.id} 
                  onClick={() => toggleEmpresa(s.id)}
                  style={{ 
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                  }}
                >
                  <td style={{ textAlign: 'center' }}>
                    {isSelected ? (
                      <div style={{ 
                        width: '28px', height: '28px', borderRadius: '50%', 
                        backgroundColor: 'var(--primary)', 
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', fontSize: '0.875rem', margin: '0 auto'
                      }}>
                        {sequenceNum}
                      </div>
                    ) : (
                      <div style={{ 
                        width: '24px', height: '24px', borderRadius: '4px',
                        border: '2px solid var(--text-muted)', margin: '0 auto'
                      }} />
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Building2 size={16} style={{ color: 'var(--text-muted)' }} />
                      <div>
                        <div style={{ fontWeight: 500 }}>{s.nombre}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {s.estado.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.875rem' }}>
                      <MapPin size={12} style={{ display: 'inline', color: 'var(--text-muted)', marginRight: '4px' }} />
                      {s.direccion || '-'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {s.barrio} • {s.zona}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.875rem' }}>
                      <Phone size={12} style={{ display: 'inline', color: 'var(--text-muted)', marginRight: '4px' }} />
                      {s.telefono || '-'}
                    </div>
                  </td>
                  <td>
                    <div style={{ 
                      fontSize: '0.75rem', fontWeight: 500, padding: '0.25rem 0.5rem', 
                      borderRadius: '4px', display: 'inline-block',
                      backgroundColor: 'rgba(var(--warning-rgb), 0.1)',
                      color: 'var(--warning)'
                    }}>
                      {s.motivo}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <Link 
                        href={`/zonas/${zonaName}/empresas/${s.id}`} 
                        onClick={e => e.stopPropagation()}
                        className="btn btn-secondary" 
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                      >
                        Ver Ficha
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredSugerencias.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  {sugerencias.length === 0 
                    ? "No hay empresas que cumplan los criterios para sugerir visitas hoy." 
                    : "No hay empresas en la selección o zonas actuales."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
