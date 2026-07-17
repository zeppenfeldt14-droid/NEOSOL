'use client'

import { useRef, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export function parseDatosBancarios(notas: string | null) {
  const result = {
    institucion: '---',
    sucursal: '---',
    cuenta: '---'
  }
  
  if (!notas) return result
  
  const instMatch = notas.match(/instituci[oó]n:[ ]*(.*?)(?=[ ]*sucursal:|$)/i)
  const sucMatch = notas.match(/sucursal:[ ]*(.*?)(?=[ ]*tipo y n[oº] de cuenta:|[ ]*cuenta:|$)/i)
  const cuentaMatch = notas.match(/(?:tipo y n[oº] de cuenta:|cuenta:)[ ]*(.*)/i)
  
  if (instMatch) {
    result.institucion = instMatch[1].trim()
  }
  if (sucMatch) {
    result.sucursal = sucMatch[1].trim()
  }
  if (cuentaMatch) {
    result.cuenta = cuentaMatch[1].trim()
  } else if (!instMatch && !sucMatch) {
    result.cuenta = notas.trim()
  }
  
  return result
}

export function FichaAltaSheet({ empresa, reportRef }: { empresa: any, reportRef: any }) {
  const blueBg = '#3b5998'
  const textColor = '#000000'
  const banco = parseDatosBancarios(empresa.notas)

  return (
    <div style={{
      backgroundColor: 'white',
      color: textColor,
      margin: '0 auto',
      width: '210mm',
      height: '297mm',
      padding: '12mm 15mm',
      boxSizing: 'border-box',
      position: 'relative',
      fontSize: '11px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }} ref={reportRef}>
      
      <div>
        {/* Document Title Header */}
        <div style={{
          backgroundColor: blueBg,
          color: 'white',
          fontWeight: 'bold',
          padding: '6px',
          textAlign: 'center',
          fontSize: '12px',
          textTransform: 'uppercase',
          border: `1px solid ${blueBg}`,
          letterSpacing: '0.5px'
        }}>
          Ficha Alta de cliente/Información General - NEOSOL
        </div>

        {/* Top metadata table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${blueBg}`, borderTop: 'none', marginBottom: '10px' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', padding: '5px', borderRight: `1px solid ${blueBg}` }}>
                <span style={{ fontSize: '8px', color: '#4b5563', marginRight: '6px' }}>Fecha de alta:</span>
                <strong style={{ fontSize: '11px' }}>{new Date(empresa.creadoEn).toLocaleDateString('es-AR')}</strong>
              </td>
              <td style={{ width: '50%', padding: '5px' }}>
                <span style={{ fontSize: '8px', color: '#4b5563', marginRight: '6px', paddingLeft: '4px' }}>CODIGO INTERNO Nº:</span>
                <strong style={{ fontSize: '11px' }}>{empresa.id.toString().padStart(6, '0')}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        {/* DATOS DEL CLIENTE */}
        <div style={{ backgroundColor: blueBg, color: 'white', fontWeight: 'bold', padding: '3px 8px', fontSize: '9px', border: `1px solid ${blueBg}`, borderBottom: 'none' }}>
          DATOS DEL CLIENTE
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${blueBg}`, marginBottom: '10px' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', padding: '4px 6px', borderRight: `1px solid ${blueBg}`, borderBottom: `1px solid ${blueBg}` }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>RAZON SOCIAL (Institución):</span>
                <strong style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>{empresa.nombre}</strong>
              </td>
              <td style={{ width: '50%', padding: '4px 6px', borderBottom: `1px solid ${blueBg}` }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>NOMBRE DE FANTASIA:</span>
                <strong style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>{empresa.nombre}</strong>
              </td>
            </tr>
            <tr>
              <td style={{ width: '50%', padding: '4px 6px', borderRight: `1px solid ${blueBg}`, borderBottom: `1px solid ${blueBg}` }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>Dirección Fiscal / Legal:</span>
                <strong style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>{empresa.direccionFiscal || '---'}</strong>
              </td>
              <td style={{ width: '50%', padding: '4px 6px', borderBottom: `1px solid ${blueBg}` }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>Transporte:</span>
                <strong style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>{empresa.transporte || '---'}</strong>
              </td>
            </tr>
            <tr>
              <td style={{ width: '50%', padding: '4px 6px', borderRight: `1px solid ${blueBg}`, borderBottom: `1px solid ${blueBg}` }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>Dirección de Entrega:</span>
                <strong style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>{empresa.direccion || '---'}</strong>
              </td>
              <td style={{ width: '50%', padding: '4px 6px', borderBottom: `1px solid ${blueBg}` }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>Partido:</span>
                <strong style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>{empresa.partido || '---'}</strong>
              </td>
            </tr>
            <tr>
              <td style={{ width: '50%', padding: '4px 6px', borderRight: `1px solid ${blueBg}`, borderBottom: `1px solid ${blueBg}` }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>Localidad:</span>
                <strong style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>{empresa.barrio || '---'}</strong>
              </td>
              <td style={{ width: '50%', padding: '4px 6px', borderBottom: `1px solid ${blueBg}` }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>Tel.:</span>
                <strong style={{ fontSize: '9.5px' }}>{empresa.telefono || '---'}</strong>
              </td>
            </tr>
            <tr>
              <td style={{ width: '50%', padding: '4px 6px', borderRight: `1px solid ${blueBg}` }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>e-mail empresa:</span>
                <strong style={{ fontSize: '9.5px' }}>{empresa.email || '---'}</strong>
              </td>
              <td style={{ width: '50%', padding: '4px 6px' }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>Celular:</span>
                <strong style={{ fontSize: '9.5px' }}>{empresa.telefono || '---'}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        {/* DATOS IMPOSITIVOS */}
        <div style={{ backgroundColor: blueBg, color: 'white', fontWeight: 'bold', padding: '3px 8px', fontSize: '9px', border: `1px solid ${blueBg}`, borderBottom: 'none' }}>
          DATOS IMPOSITIVOS
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${blueBg}`, marginBottom: '10px' }}>
          <tbody>
            <tr>
              <td style={{ width: '33.3%', padding: '4px 6px', borderRight: `1px solid ${blueBg}`, borderBottom: `1px solid ${blueBg}` }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>CUIT Nº:</span>
                <strong style={{ fontSize: '9.5px' }}>{empresa.cuit || '---'}</strong>
              </td>
              <td style={{ width: '33.3%', padding: '4px 6px', borderRight: `1px solid ${blueBg}`, borderBottom: `1px solid ${blueBg}` }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>ING. BRUTOS Nº:</span>
                <strong style={{ fontSize: '9.5px' }}>{empresa.cuit || '---'}</strong>
              </td>
              <td style={{ width: '33.4%', padding: '4px 6px', borderBottom: `1px solid ${blueBg}` }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>DNI:</span>
                <strong style={{ fontSize: '9.5px' }}>---</strong>
              </td>
            </tr>
            <tr>
              <td colSpan={3} style={{ padding: '4px 6px' }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>ACTIVIDAD:</span>
                <strong style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>{empresa.actividad || '---'}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        {/* DATOS BANCARIOS */}
        <div style={{ backgroundColor: blueBg, color: 'white', fontWeight: 'bold', padding: '3px 8px', fontSize: '9px', border: `1px solid ${blueBg}`, borderBottom: 'none' }}>
          DATOS BANCARIOS
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${blueBg}`, marginBottom: '10px' }}>
          <tbody>
            <tr>
              <td style={{ width: '33.3%', padding: '4px 6px', borderRight: `1px solid ${blueBg}` }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>Institución:</span>
                <strong style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>{banco.institucion}</strong>
              </td>
              <td style={{ width: '33.3%', padding: '4px 6px', borderRight: `1px solid ${blueBg}` }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>Sucursal:</span>
                <strong style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>{banco.sucursal}</strong>
              </td>
              <td style={{ width: '33.4%', padding: '4px 6px' }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>Tipo y Nº de Cuenta:</span>
                <strong style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>{banco.cuenta}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        {/* CONTACTO COMERCIAL */}
        <div style={{ backgroundColor: blueBg, color: 'white', fontWeight: 'bold', padding: '3px 8px', fontSize: '9px', border: `1px solid ${blueBg}`, borderBottom: 'none' }}>
          CONTACTO COMERCIAL
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${blueBg}`, marginBottom: '10px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 6px', borderBottom: `1px solid ${blueBg}` }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>Nombre y Apellido (Responsable):</span>
                <strong style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>{empresa.responsable || '---'}</strong>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '0', borderBottom: `1px solid ${blueBg}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', padding: '4px 6px', borderRight: `1px solid ${blueBg}` }}>
                        <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>TEL.:</span>
                        <strong style={{ fontSize: '9.5px' }}>{empresa.telefono || '---'}</strong>
                      </td>
                      <td style={{ width: '50%', padding: '4px 6px' }}>
                        <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>Celular:</span>
                        <strong style={{ fontSize: '9.5px' }}>{empresa.telefono || '---'}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '4px 6px', borderBottom: `1px solid ${blueBg}` }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>correo electrónico:</span>
                <strong style={{ fontSize: '9.5px' }}>{empresa.email || '---'}</strong>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '4px 6px' }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>Productos de interés:</span>
                <strong style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>{empresa.productosInteres || '---'}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        {/* CONTACTO DE COBRANZAS */}
        <div style={{ backgroundColor: blueBg, color: 'white', fontWeight: 'bold', padding: '3px 8px', fontSize: '9px', border: `1px solid ${blueBg}`, borderBottom: 'none' }}>
          CONTACTO DE COBRANZAS
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${blueBg}`, marginBottom: '10px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 6px', borderBottom: `1px solid ${blueBg}` }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>Nombre y Apellido (Responsable Cobranzas):</span>
                <strong style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>{empresa.contactoCobranzas || '---'}</strong>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '0', borderBottom: `1px solid ${blueBg}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', padding: '4px 6px', borderRight: `1px solid ${blueBg}` }}>
                        <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>TEL.:</span>
                        <strong style={{ fontSize: '9.5px' }}>{empresa.telefono || '---'}</strong>
                      </td>
                      <td style={{ width: '50%', padding: '4px 6px' }}>
                        <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>Celular:</span>
                        <strong style={{ fontSize: '9.5px' }}>{empresa.telefono || '---'}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '4px 6px', borderBottom: `1px solid ${blueBg}` }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>correo electrónico:</span>
                <strong style={{ fontSize: '9.5px' }}>---</strong>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', padding: '4px 6px', borderRight: `1px solid ${blueBg}` }}>
                        <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>COBRADOR:</span>
                        <strong style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>---</strong>
                      </td>
                      <td style={{ width: '50%', padding: '4px 6px' }}>
                        <span style={{ fontSize: '7.5px', color: '#4b5563', display: 'block', marginBottom: '1px' }}>dias de pago:</span>
                        <strong style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>{empresa.diasPago || '---'}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer info: Vendedor Asignado y Firmas */}
      <div>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${blueBg}`, marginBottom: '25px' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', padding: '5px 8px', borderRight: `1px solid ${blueBg}` }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', marginRight: '6px' }}>VENDEDOR ASIGNADO:</span>
                <strong style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>{empresa.vendedorAsignado || '---'}</strong>
              </td>
              <td style={{ width: '50%', padding: '5px 8px' }}>
                <span style={{ fontSize: '7.5px', color: '#4b5563', marginRight: '6px', paddingLeft: '4px' }}>Sucursal:</span>
                <strong style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>{empresa.zona || '---'}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Firmas */}
        <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '8.5px', marginTop: '25px', padding: '0 10px' }}>
          <div style={{ textAlign: 'center', width: '220px' }}>
            <div style={{ borderTop: '1px solid black', marginBottom: '4px' }}></div>
            <strong style={{ textTransform: 'uppercase', fontSize: '8px', color: '#374151' }}>Firma Cliente</strong>
          </div>
          <div style={{ textAlign: 'center', width: '220px' }}>
            <div style={{ borderTop: '1px solid black', marginBottom: '4px' }}></div>
            <strong style={{ textTransform: 'uppercase', fontSize: '8px', color: '#374151' }}>Firma Vendedor / Aclaración</strong>
          </div>
        </div>
      </div>

    </div>
  )
}

export default function FichaPDFClient({ empresa }: { empresa: any }) {
  const reportRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownload = async () => {
    if (!reportRef.current) return
    setIsGenerating(true)

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
      pdf.save(`Ficha_Alta_${empresa.nombre.replace(/\s+/g, '_')}.pdf`)
    } catch (err) {
      console.error(err)
      alert("Error al generar el PDF")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', paddingBottom: '3rem', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Header controls */}
      <div style={{ backgroundColor: '#1e293b', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', color: 'white' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Vista Previa PDF (Ficha de Alta Oficial)</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Haz clic en el botón para generar y descargar el documento PDF.</p>
        </div>
        <button 
          onClick={handleDownload}
          disabled={isGenerating}
          style={{ 
            backgroundColor: isGenerating ? '#94a3b8' : '#3b82f6', 
            color: 'white', 
            border: 'none', 
            padding: '0.5rem 1rem', 
            borderRadius: '0.375rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            cursor: isGenerating ? 'not-allowed' : 'pointer', 
            fontWeight: 'bold' 
          }}
        >
          {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          {isGenerating ? 'Generando...' : 'Descargar PDF'}
        </button>
      </div>

      <FichaAltaSheet empresa={empresa} reportRef={reportRef} />
    </div>
  )
}
