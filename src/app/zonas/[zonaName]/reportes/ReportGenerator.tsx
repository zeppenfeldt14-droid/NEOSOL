'use client'

import { useRef, useState, useEffect } from 'react'
import { Download, Mail, Check, Loader2, FileText, Eye, History, FilePlus } from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export default function ReportGenerator({ data, defaultEmail }: { data: any, defaultEmail: string }) {
  const reportRef = useRef<HTMLDivElement>(null)
  const [email, setEmail] = useState(defaultEmail)
  const [status, setStatus] = useState<'idle' | 'generating' | 'sending' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'generador' | 'historial'>('generador')
  const [historial, setHistorial] = useState<any[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [previewFile, setPreviewFile] = useState<string | null>(null)

  useEffect(() => {
    if (activeTab === 'historial' && historial.length === 0) {
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
  }, [activeTab])

  const generatePDF = async () => {
    if (!reportRef.current) return null

    try {
      const canvas = await html2canvas(reportRef.current, {
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
    const pdf = await generatePDF()
    if (pdf) {
      pdf.save(`Reporte_Visitas_${data.fecha.replace(/\//g, '-')}.pdf`)
      setStatus('idle')
    } else {
      setStatus('error')
      setErrorMessage('Error al generar el PDF')
    }
  }

  const handleSendEmail = async () => {
    setStatus('sending')
    setErrorMessage('')
    
    const pdf = await generatePDF()
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
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('generador')} 
          className={`btn ${activeTab === 'generador' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
        >
          <FilePlus size={16} /> Generar Reporte de Hoy
        </button>
        <button 
          onClick={() => setActiveTab('historial')} 
          className={`btn ${activeTab === 'historial' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
        >
          <History size={16} /> Historial de Reportes
        </button>
      </div>

      {activeTab === 'generador' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
          
          {/* Controles del Reporte */}
      <div className="glass-panel card" style={{ gridColumn: 'span 1' }}>
        <h3 className="card-title">Acciones del Reporte</h3>
        <p className="card-subtitle mb-4">Exporta o envía este reporte a gerencia.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button 
            onClick={handleDownload} 
            disabled={status !== 'idle' && status !== 'success' && status !== 'error'}
            className="btn btn-secondary w-full justify-start"
          >
            {status === 'generating' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Descargar PDF
          </button>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '0.5rem', paddingTop: '1rem' }}>
            <label className="form-label">Enviar por Correo a:</label>
            <input 
              type="email" 
              className="form-input mb-2" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button 
              onClick={handleSendEmail} 
              disabled={status !== 'idle' && status !== 'success' && status !== 'error'}
              className="btn btn-primary w-full justify-start"
            >
              {status === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              Enviar Correo con PDF
            </button>
          </div>

          {status === 'success' && (
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', borderRadius: '0.375rem', fontSize: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Check size={16} /> ¡Correo enviado exitosamente!
            </div>
          )}
          
          {status === 'error' && (
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '0.375rem', fontSize: '0.875rem' }}>
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      {/* Vista Previa del Reporte */}
      <div className="glass-panel" style={{ gridColumn: 'span 3', padding: '1rem', overflowX: 'auto', backgroundColor: '#f8fafc' }}>
        <h3 className="card-title" style={{ marginBottom: '1rem', color: '#1e293b' }}>Vista Previa del Documento</h3>
        
        {/* PDF Container - A4 Portrait (Inline Styles ONLY) */}
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
          ref={reportRef}
        >
          {/* Header - Navy Blue */}
          <div style={{ backgroundColor: '#1e3a5f', color: 'white', padding: '32px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '-0.5px' }}>Reporte de Visitas de Terreno</h1>
            <div style={{ color: '#a5c0e1', fontSize: '14px', fontWeight: '500', display: 'flex', gap: '8px' }}>
              <span style={{ color: '#e2e8f0' }}>Fecha:</span> {data.fecha} | 
              <span style={{ color: '#e2e8f0' }}>Para:</span> Gerencia Comercial | 
              <span style={{ color: '#e2e8f0' }}>Vendedor:</span> Ernesto Lares
            </div>
          </div>

          {/* Content Area */}
          <div style={{ padding: '32px', paddingBottom: '64px' }}>
            
            {/* Executive Summary */}
            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9', padding: '24px', marginBottom: '32px', borderLeft: '4px solid #1e3a5f' }}>
              <h2 style={{ color: '#1e3a5f', fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Resumen Ejecutivo</h2>
              <p style={{ color: '#334155', lineHeight: '1.6', fontSize: '15px' }}>
                Se presenta el informe de ruta del día {data.fecha}. Se relevaron un total de <strong>{data.visitas.length} puntos de venta/distribución</strong>. 
                A continuación se detalla el resultado de cada visita y las próximas acciones a tomar.
              </p>
            </div>

            {/* Visit Details */}
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ color: '#1e3a5f', fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Detalle de mi Recorrido</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {data.visitas.length === 0 ? (
                   <p style={{ color: '#64748b', fontStyle: 'italic' }}>No se registraron visitas.</p>
                ) : data.visitas.map((v: any, index: number) => {
                  
                  let pillBg = '#e2e8f0'
                  let pillText = '#1e293b'
                  
                  if (v.resultado === 'contacto_positivo' || v.resultado === 'venta_cerrada') {
                    pillBg = '#10b981'
                    pillText = 'white'
                  } else if (v.resultado === 'sin_contacto') {
                    pillBg = '#94a3b8'
                    pillText = 'white'
                  } else if (v.resultado === 'interes_futuro') {
                    pillBg = '#f59e0b'
                    pillText = 'white'
                  }

                  return (
                    <div key={v.id} style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <h3 style={{ fontWeight: 'bold', fontSize: '16px', color: '#0f172a' }}>{index + 1}. {v.empresaNombre}</h3>
                          <span style={{ backgroundColor: pillBg, color: pillText, padding: '4px 12px', borderRadius: '9999px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {v.resultado.replace('_', ' ')}
                          </span>
                        </div>
                        <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>{v.barrio}</span>
                      </div>
                      
                      <div style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', display: 'flex', gap: '16px' }}>
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
                    {data.pendientes.slice(0, 10).map((p: any) => (
                      <li key={p.id} style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', display: 'flex', gap: '12px' }}>
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

      </div>
    </div>
    )}

    {activeTab === 'historial' && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        {/* Lista de Reportes */}
        <div className="glass-panel card" style={{ gridColumn: 'span 1', maxHeight: '80vh', overflowY: 'auto' }}>
          <h3 className="card-title">Reportes Anteriores</h3>
          <p className="card-subtitle mb-4">Selecciona un reporte para visualizarlo o descargarlo.</p>
          
          {loadingHistorial ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {historial.map((report) => (
                <div 
                  key={report.filename}
                  onClick={() => setPreviewFile(report.filename)}
                  style={{ 
                    padding: '0.75rem', 
                    borderRadius: '0.5rem', 
                    border: '1px solid #e2e8f0', 
                    cursor: 'pointer',
                    backgroundColor: previewFile === report.filename ? '#eff6ff' : 'white',
                    borderColor: previewFile === report.filename ? '#3b82f6' : '#e2e8f0',
                    transition: 'all 0.2s'
                  }}
                  className="hover:border-blue-300 hover:shadow-sm"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ backgroundColor: report.isImage ? '#fdf4ff' : '#fee2e2', padding: '0.5rem', borderRadius: '0.375rem', color: report.isImage ? '#d946ef' : '#ef4444' }}>
                      <FileText size={20} />
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <p style={{ fontWeight: '600', fontSize: '13px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{report.filename}</p>
                      <p style={{ fontSize: '11px', color: '#64748b' }}>{new Date(report.date).toLocaleDateString('es-AR')}</p>
                    </div>
                    <div>
                      <a 
                        href={`/api/reportes/download?file=${encodeURIComponent(report.filename)}`} 
                        download
                        onClick={(e) => e.stopPropagation()}
                        style={{ padding: '0.5rem', display: 'block', color: '#3b82f6', borderRadius: '9999px' }}
                        className="hover:bg-blue-50"
                      >
                        <Download size={16} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
              {historial.length === 0 && !loadingHistorial && (
                <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '2rem 0' }}>No se encontraron reportes históricos.</p>
              )}
            </div>
          )}
        </div>

        {/* Vista Previa */}
        <div className="glass-panel" style={{ gridColumn: 'span 2', padding: '1rem', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="card-title" style={{ color: '#1e293b', margin: 0 }}>Vista Previa</h3>
            {previewFile && (
              <a 
                href={`/api/reportes/download?file=${encodeURIComponent(previewFile)}`} 
                download
                className="btn btn-primary"
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem 1rem' }}
              >
                <Download size={16} /> Descargar {previewFile}
              </a>
            )}
          </div>
          
          <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden', minHeight: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {previewFile ? (
              <iframe 
                src={`/api/reportes/download?file=${encodeURIComponent(previewFile)}`} 
                style={{ width: '100%', height: '100%', border: 'none', minHeight: '600px' }}
                title="Vista Previa de Reporte"
              />
            ) : (
              <div style={{ color: '#94a3b8', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <Eye size={48} style={{ opacity: 0.5 }} />
                <p>Selecciona un reporte de la lista para ver su vista previa.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
  )
}
