'use client'

import { useRef, useState, useEffect } from 'react'
import { Download, Mail, Check, Loader2, FileText, Eye, History, FilePlus, AlertCircle } from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

// Componente secundario reutilizable para renderizar el reporte con dimensiones A4
function ReportContent({ data, containerRef }: { data: any, containerRef?: React.RefObject<HTMLDivElement | null> }) {
  if (!data) return null
  return (
    <div 
      style={{ 
        backgroundColor: '#F8F9FA', 
        color: '#333333', 
        margin: '0 auto', 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', 
        position: 'relative', 
        width: '210mm', 
        minHeight: '297mm', 
        fontFamily: 'Arial, Helvetica, sans-serif' 
      }} 
      ref={containerRef}
    >
      {/* Header - Navy Blue */}
      <div style={{ backgroundColor: '#1e3a5f', color: 'white', padding: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '-0.5px' }}>Reporte de Visitas de Terreno</h1>
        <div style={{ color: '#a5c0e1', fontSize: '14px', fontWeight: '500', display: 'flex', gap: '8px' }}>
          <span style={{ color: '#e2e8f0' }}>Fecha:</span> {data.fecha} | 
          <span style={{ color: '#e2e8f0' }}>Para:</span> Gerencia Comercial | 
          <span style={{ color: '#e2e8f0' }}>Vendedor:</span> {data.vendedorAlias || 'Ernesto Lares'}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ padding: '32px', paddingBottom: '64px' }}>
        
        {/* Executive Summary */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9', padding: '24px', marginBottom: '32px', borderLeft: '4px solid #1e3a5f' }}>
          <h2 style={{ color: '#1e3a5f', fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Resumen Ejecutivo</h2>
          <p style={{ color: '#334155', lineHeight: '1.6', fontSize: '15px' }}>
            Se presenta el informe de ruta del día {data.fecha}. Se relevaron un total de <strong>{data.visitas?.length || 0} puntos de venta/distribución</strong>. 
            A continuación se detalla el resultado de cada visita y las próximas acciones a tomar.
          </p>
        </div>

        {/* Visit Details */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ color: '#1e3a5f', fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Detalle de mi Recorrido</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {!data.visitas || data.visitas.length === 0 ? (
               <p style={{ color: '#64748b', fontStyle: 'italic' }}>No se registraron visitas.</p>
            ) : data.visitas.map((v: any, index: number) => {
              
              let pillBg = '#e2e8f0'
              let pillText = '#1e293b'
              
              if (v.resultado === 'contacto_positivo' || v.resultado === 'venta_cerrada' || v.resultado === 'venta' || v.resultado === 'visita_realizada') {
                pillBg = '#10b981'
                pillText = 'white'
              } else if (v.resultado === 'sin_contacto') {
                pillBg = '#94a3b8'
                pillText = 'white'
              } else if (v.resultado === 'interes_futuro' || v.resultado === 'reprogramado') {
                pillBg = '#f59e0b'
                pillText = 'white'
              }

              return (
                <div key={v.id || index} style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h3 style={{ fontWeight: 'bold', fontSize: '16px', color: '#0f172a' }}>{index + 1}. {v.empresaNombre}</h3>
                      <span style={{ backgroundColor: pillBg, color: pillText, padding: '4px 12px', borderRadius: '9999px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {v.resultado.replace('_', ' ')}
                      </span>
                    </div>
                    <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500', marginLeft: 'auto' }}>{v.barrio}</span>
                  </div>
                  
                  <div style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', display: 'flex', gap: '16px', marginTop: '6px' }}>
                    <span><strong>Dirección:</strong> {v.direccion || '-'}</span>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <span><strong>Contacto:</strong> {v.contacto || '-'}</span>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', borderRadius: '4px', padding: '16px', fontSize: '14px', color: '#334155', lineHeight: '1.6', border: '1px solid #e2e8f0' }}>
                    <strong>Resultado:</strong> {v.notas || 'Sin notas.'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pending Tasks */}
        {data.pendientes && data.pendientes.length > 0 && (
          <div>
            <h2 style={{ color: '#1e3a5f', fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Mis Tareas Pendientes / Próximas Acciones</h2>
            
            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9', padding: '24px' }}>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {data.pendientes.slice(0, 10).map((p: any, idx: number) => (
                  <li key={p.id || idx} style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', display: 'flex', gap: '12px' }}>
                    <span style={{ color: '#1e3a5f', marginTop: '2px' }}>•</span>
                    <div>
                      <strong>{p.empresaNombre}:</strong> {p.descripcion} <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '8px' }}>(Vence: {p.vencimiento})</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

      </div>

      <div style={{ position: 'absolute', bottom: '24px', width: '100%', textAlign: 'center', color: '#94a3b8', fontSize: '11px' }}>
        Generado automáticamente por Sistema de Visitas CRM Neosol
      </div>
    </div>
  )
}

export default function ReportGenerator({ data, defaultEmail }: { data: any, defaultEmail: string }) {
  const reportRef = useRef<HTMLDivElement>(null)
  const previewReportRef = useRef<HTMLDivElement>(null)
  const [email, setEmail] = useState(defaultEmail)
  const [status, setStatus] = useState<'idle' | 'generating' | 'sending' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'generador' | 'historial'>('generador')
  const [historial, setHistorial] = useState<any[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [previewFile, setPreviewFile] = useState<string | null>(null)
  const [selectedReportData, setSelectedReportData] = useState<any>(null)

  // Cargar historial de la base de datos
  const fetchHistorial = () => {
    setLoadingHistorial(true)
    fetch('/api/reportes/historial')
      .then(res => res.json())
      .then(data => {
        setHistorial(data.reportes || [])
        setLoadingHistorial(false)
      })
      .catch(err => {
        console.error(err)
        setLoadingHistorial(false)
      })
  }

  useEffect(() => {
    if (activeTab === 'historial') {
      fetchHistorial()
    }
  }, [activeTab])

  // Guarda la estructura del reporte en la base de datos
  const handleGuardarReporte = async () => {
    try {
      const res = await fetch('/api/reportes/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: data.fecha,
          zona: data.zona || 'CABA',
          vendedorAlias: data.vendedorAlias || 'Ernesto Lares',
          datosJSON: data
        })
      })
      if (!res.ok) {
        console.error('Error al persistir reporte en base de datos')
      }
    } catch (e) {
      console.error('Error de red al guardar reporte:', e)
    }
  }

  const generatePDF = async (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return null

    try {
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        useCORS: true,
        logging: false
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      return pdf
    } catch (err) {
      console.error(err)
      return null
    }
  }

  const handleDownload = async () => {
    setStatus('generating')
    // Guardar en la base de datos de manera proactiva al descargar
    await handleGuardarReporte()
    
    const pdf = await generatePDF(reportRef)
    if (pdf) {
      pdf.save(`Reporte_Visitas_${data.fecha.replace(/\//g, '-')}.pdf`)
      setStatus('idle')
    } else {
      setStatus('error')
      setErrorMessage('Error al generar el PDF')
    }
  }

  const handleDownloadHistorical = async () => {
    if (!selectedReportData) return
    setStatus('generating')
    const pdf = await generatePDF(previewReportRef)
    if (pdf) {
      pdf.save(`Reporte_Visitas_${selectedReportData.fecha.replace(/\//g, '-')}.pdf`)
      setStatus('idle')
    } else {
      setStatus('error')
      setErrorMessage('Error al generar el PDF del historial')
    }
  }

  const handleSendEmail = async () => {
    setStatus('sending')
    setErrorMessage('')
    
    // Guardar en la base de datos al enviar el reporte
    await handleGuardarReporte()

    const pdf = await generatePDF(reportRef)
    if (!pdf) {
      setStatus('error')
      setErrorMessage('Error al generar el PDF para el correo')
      return
    }

    const pdfBase64 = pdf.output('datauristring')

    try {
      const res = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          emailTo: email,
          dateStr: data.fecha
        })
      })

      if (res.ok) {
        setStatus('success')
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        const errorData = await res.json()
        setStatus('error')
        setErrorMessage(errorData.error || 'Error enviando el correo')
      }
    } catch (err) {
      setStatus('error')
      setErrorMessage('Error de conexión al enviar el correo')
    }
  }

  return (
    <div className="w-full">
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => {
            setActiveTab('generador')
            setSelectedReportData(null)
            setPreviewFile(null)
          }} 
          className={`btn ${activeTab === 'generador' ? 'btn-primary' : 'btn-secondary border-white/5 text-secondary hover:text-white'}`}
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderRadius: '10px' }}
        >
          <FilePlus size={16} /> Generar Reporte de Hoy
        </button>
        <button 
          onClick={() => setActiveTab('historial')} 
          className={`btn ${activeTab === 'historial' ? 'btn-primary' : 'btn-secondary border-white/5 text-secondary hover:text-white'}`}
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderRadius: '10px' }}
        >
          <History size={16} /> Historial de Reportes
        </button>
      </div>

      {/* Tab Generador */}
      {activeTab === 'generador' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Controles */}
          <div className="glass-panel card" style={{ padding: '1.5rem' }}>
            <h3 className="card-title" style={{ fontSize: '1rem', fontWeight: 'bold' }}>Acciones del Reporte</h3>
            <p className="card-subtitle mb-4">Exporta o envía este reporte estructurado.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button 
                onClick={handleDownload} 
                disabled={status !== 'idle' && status !== 'success' && status !== 'error'}
                className="btn btn-secondary w-full justify-start border-white/5 text-secondary hover:text-white"
                style={{ padding: '0.75rem 1rem', borderRadius: '10px' }}
              >
                {status === 'generating' ? <Loader2 size={16} className="animate-spin mr-2" /> : <Download size={16} style={{ marginRight: '0.5rem' }} />}
                Descargar PDF
              </button>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '0.5rem', paddingTop: '1rem' }}>
                <label className="form-label mb-1.5 block text-xs uppercase tracking-wider text-secondary/75">Enviar por Correo a:</label>
                <input 
                  type="email" 
                  className="form-input mb-3 bg-[#111625] border-white/10" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px' }}
                />
                <button 
                  onClick={handleSendEmail} 
                  disabled={status !== 'idle' && status !== 'success' && status !== 'error'}
                  className="btn btn-primary w-full justify-start"
                  style={{ padding: '0.75rem 1rem', borderRadius: '10px' }}
                >
                  {status === 'sending' ? <Loader2 size={16} className="animate-spin mr-2" /> : <Mail size={16} style={{ marginRight: '0.5rem' }} />}
                  Enviar Correo con PDF
                </button>
              </div>

              {status === 'success' && (
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', borderRadius: '10px', fontSize: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Check size={16} /> ¡Correo enviado y reporte guardado!
                </div>
              )}
              
              {status === 'error' && (
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '10px', fontSize: '0.875rem' }}>
                  {errorMessage}
                </div>
              )}
            </div>
          </div>

          {/* Vista Previa Novedosa y Escalable */}
          <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 className="card-title text-white mb-4">Vista Previa del Documento</h3>
            <div style={{ overflowX: 'auto', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center', marginBottom: '-40mm' }}>
                <ReportContent data={data} containerRef={reportRef} />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Tab Historial */}
      {activeTab === 'historial' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Lista de Reportes de la DB */}
          <div className="glass-panel card" style={{ padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 className="card-title" style={{ fontSize: '1rem', fontWeight: 'bold' }}>Reportes Anteriores</h3>
            <p className="card-subtitle mb-4">Cargados en tiempo real desde la base de datos.</p>
            
            {loadingHistorial ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {historial.map((report) => (
                  <div 
                    key={report.id}
                    onClick={() => {
                      setPreviewFile(report.filename)
                      setSelectedReportData(report.datosJSON)
                    }}
                    style={{ 
                      padding: '0.75rem', 
                      borderRadius: '10px', 
                      border: '1px solid rgba(255,255,255,0.05)', 
                      cursor: 'pointer',
                      backgroundColor: previewFile === report.filename ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
                      borderColor: previewFile === report.filename ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      transition: 'all 0.2s'
                    }}
                    className="hover:border-primary/50 hover:shadow-sm"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ backgroundColor: 'rgba(59,130,246,0.1)', padding: '0.5rem', borderRadius: '8px', color: 'var(--primary)' }}>
                        <FileText size={20} />
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <p style={{ fontWeight: '600', fontSize: '13px', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{report.fecha}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Zona: {report.zona} • @{report.vendedorAlias}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {historial.length === 0 && !loadingHistorial && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center', padding: '2rem 0' }}>No se encontraron reportes históricos.</p>
                )}
              </div>
            )}
          </div>

          {/* Vista Previa del Reporte Histórico */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
              <h3 className="card-title text-white" style={{ margin: 0 }}>Visualización del Historial</h3>
              {selectedReportData && (
                <button 
                  onClick={handleDownloadHistorical}
                  disabled={status === 'generating'}
                  className="btn btn-primary"
                  style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem 1rem', borderRadius: '10px' }}
                >
                  {status === 'generating' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} 
                  Descargar PDF al Vuelo
                </button>
              )}
            </div>
            
            <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', minHeight: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
              {selectedReportData ? (
                <div style={{ overflowX: 'auto', width: '100%', display: 'flex', justifyContent: 'center', padding: '1.5rem 0' }}>
                  <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center', marginBottom: '-40mm' }}>
                    <ReportContent data={selectedReportData} containerRef={previewReportRef} />
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <Eye size={42} style={{ opacity: 0.3 }} />
                  <p className="text-xs font-semibold">Selecciona un reporte del historial para renderizar la vista previa HTML al vuelo.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  )
}
