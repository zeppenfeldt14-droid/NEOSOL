'use client'

import { useRef, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export default function FichaPDFClient({ empresa }: { empresa: any }) {
  const reportRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const blueBg = '#3b5998'
  const textColor = '#000000'

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

      {/* A4 Sheet */}
      <div style={{ backgroundColor: 'white', color: textColor, margin: '0 auto', width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box', position: 'relative', fontSize: '11px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} ref={reportRef}>
        
        {/* Document Title Header */}
        <div style={{ backgroundColor: blueBg, color: 'white', fontWeight: 'bold', padding: '4px 8px', display: 'flex', justifyContent: 'space-between', border: `1px solid ${blueBg}` }}>
          <span>Ficha Alta de cliente/Información General - NEOSOL</span>
        </div>

        {/* Date and ID */}
        <div style={{ display: 'flex', border: `1px solid ${blueBg}`, borderTop: 'none', marginBottom: '16px' }}>
          <div style={{ width: '50%', padding: '4px', borderRight: `1px solid ${blueBg}`, display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '100px', fontSize: '10px' }}>Fecha de alta:</span>
            <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{new Date(empresa.creadoEn).toLocaleDateString('es-AR')}</span>
          </div>
          <div style={{ width: '50%', padding: '4px', display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '130px', fontSize: '10px', paddingLeft: '8px' }}>CODIGO INTERNO Nº:</span>
            <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{empresa.id.toString().padStart(6, '0')}</span>
          </div>
        </div>

        {/* DATOS DEL CLIENTE */}
        <div style={{ backgroundColor: blueBg, color: 'white', fontWeight: 'bold', padding: '4px 8px', fontSize: '10px', border: `1px solid ${blueBg}` }}>
          DATOS DEL CLIENTE
        </div>
        <div style={{ border: `1px solid ${blueBg}`, borderTop: 'none', display: 'flex', flexDirection: 'column', marginBottom: '16px' }}>
          
          <div style={{ display: 'flex', borderBottom: `1px solid ${blueBg}`, padding: '4px', alignItems: 'center' }}>
            <span style={{ width: '180px', fontSize: '10px' }}>RAZÓN SOCIAL (Institución):</span>
            <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{empresa.nombre}</span>
          </div>
          
          <div style={{ display: 'flex', borderBottom: `1px solid ${blueBg}` }}>
            <div style={{ width: '50%', padding: '4px', display: 'flex', alignItems: 'center', borderRight: `1px solid ${blueBg}` }}>
              <span style={{ width: '140px', fontSize: '10px' }}>Dirección Fiscal / Legal:</span>
              <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{empresa.direccionFiscal || '---'}</span>
            </div>
            <div style={{ width: '50%', padding: '4px', display: 'flex', alignItems: 'center' }}>
              <span style={{ width: '90px', fontSize: '10px', paddingLeft: '8px' }}>Transporte:</span>
              <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{empresa.transporte || '---'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', borderBottom: `1px solid ${blueBg}` }}>
            <div style={{ width: '50%', padding: '4px', display: 'flex', alignItems: 'center', borderRight: `1px solid ${blueBg}` }}>
              <span style={{ width: '100px', fontSize: '10px' }}>Localidad: CABA</span>
              <span style={{ fontWeight: 'bold', textTransform: 'uppercase', paddingLeft: '8px' }}>{empresa.barrio || '---'}</span>
            </div>
            <div style={{ width: '50%', padding: '4px', display: 'flex', alignItems: 'center' }}>
              <span style={{ width: '60px', fontSize: '10px', paddingLeft: '8px' }}>Partido:</span>
              <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{empresa.partido || '---'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', borderBottom: `1px solid ${blueBg}`, padding: '4px', alignItems: 'center' }}>
            <span style={{ width: '180px', fontSize: '10px' }}>Dirección de Entrega:</span>
            <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{empresa.direccion || '---'}</span>
          </div>
          
          <div style={{ display: 'flex', padding: '4px', alignItems: 'center' }}>
            <span style={{ width: '140px', fontSize: '10px' }}>e-mail empresa:</span>
            <span style={{ fontWeight: 'bold' }}>{empresa.email || '---'}</span>
          </div>
        </div>

        {/* DATOS IMPOSITIVOS */}
        <div style={{ backgroundColor: blueBg, color: 'white', fontWeight: 'bold', padding: '4px 8px', fontSize: '10px', border: `1px solid ${blueBg}` }}>
          DATOS IMPOSITIVOS
        </div>
        <div style={{ border: `1px solid ${blueBg}`, borderTop: 'none', display: 'flex', flexDirection: 'column', marginBottom: '16px' }}>
          
          <div style={{ display: 'flex', padding: '4px', alignItems: 'center', borderBottom: `1px solid ${blueBg}` }}>
            <div style={{ width: '50%', display: 'flex', alignItems: 'center', borderRight: `1px solid ${blueBg}`, paddingRight: '8px' }}>
              <span style={{ width: '100px', fontSize: '10px' }}>CUIT Nº:</span>
              <span style={{ fontWeight: 'bold' }}>{empresa.cuit || '---'}</span>
            </div>
            <div style={{ width: '50%', display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>
              <span style={{ width: '100px', fontSize: '10px' }}>DNI:</span>
              <span style={{ fontWeight: 'bold' }}>---</span>
            </div>
          </div>

          <div style={{ display: 'flex', padding: '4px', alignItems: 'center' }}>
            <div style={{ width: '50%', display: 'flex', alignItems: 'center', borderRight: `1px solid ${blueBg}`, paddingRight: '8px' }}>
              <span style={{ width: '100px', fontSize: '10px' }}>ACTIVIDAD:</span>
              <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{empresa.actividad || '---'}</span>
            </div>
            <div style={{ width: '50%', display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>
              <span style={{ width: '140px', fontSize: '10px' }}>Productos de interés:</span>
              <span style={{ fontWeight: 'bold' }}>{empresa.productosInteres || '---'}</span>
            </div>
          </div>
        </div>

        {/* DATOS BANCARIOS */}
        <div style={{ backgroundColor: blueBg, color: 'white', fontWeight: 'bold', padding: '4px 8px', fontSize: '10px', border: `1px solid ${blueBg}` }}>
          DATOS BANCARIOS
        </div>
        <div style={{ border: `1px solid ${blueBg}`, borderTop: 'none', padding: '4px', marginBottom: '16px', minHeight: '40px', display: 'flex', alignItems: 'flex-start' }}>
          <span style={{ width: '180px', fontSize: '10px' }}>Tipo y Nº de Cuenta / Notas:</span>
          <span style={{ fontWeight: 'bold', whiteSpace: 'pre-wrap' }}>{empresa.notas || '---'}</span>
        </div>

        {/* CONTACTO COMERCIAL */}
        <div style={{ backgroundColor: blueBg, color: 'white', fontWeight: 'bold', padding: '4px 8px', fontSize: '10px', border: `1px solid ${blueBg}` }}>
          CONTACTO COMERCIAL
        </div>
        <div style={{ border: `1px solid ${blueBg}`, borderTop: 'none', display: 'flex', flexDirection: 'column', marginBottom: '16px' }}>
          
          <div style={{ display: 'flex', padding: '4px', alignItems: 'center', borderBottom: `1px solid ${blueBg}` }}>
            <span style={{ width: '200px', fontSize: '10px' }}>Nombre y Apellido (Responsable):</span>
            <span style={{ fontWeight: 'bold' }}>{empresa.responsable || '---'}</span>
          </div>

          <div style={{ display: 'flex', padding: '4px', alignItems: 'center', borderBottom: `1px solid ${blueBg}` }}>
            <div style={{ width: '50%', display: 'flex', alignItems: 'center', borderRight: `1px solid ${blueBg}`, paddingRight: '8px' }}>
              <span style={{ width: '60px', fontSize: '10px' }}>TEL.:</span>
              <span style={{ fontWeight: 'bold' }}>{empresa.telefono || '---'}</span>
            </div>
            <div style={{ width: '50%', display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>
              <span style={{ width: '60px', fontSize: '10px' }}>Celular:</span>
              <span style={{ fontWeight: 'bold' }}>{empresa.telefono || '---'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', padding: '4px', alignItems: 'center', borderBottom: `1px solid ${blueBg}` }}>
            <span style={{ width: '140px', fontSize: '10px' }}>correo electrónico:</span>
            <span style={{ fontWeight: 'bold' }}>{empresa.email || '---'}</span>
          </div>

          <div style={{ display: 'flex', padding: '4px', alignItems: 'center' }}>
            <span style={{ width: '180px', fontSize: '10px' }}>VENDEDOR ASIGNADO:</span>
            <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{empresa.vendedorAsignado || '---'}</span>
            <span style={{ width: '80px', fontSize: '10px', marginLeft: '16px', textAlign: 'right', paddingRight: '8px' }}>Sucursal:</span>
            <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{empresa.zona || '---'}</span>
          </div>
        </div>

        {/* CONTACTO DE COBRANZAS */}
        <div style={{ backgroundColor: blueBg, color: 'white', fontWeight: 'bold', padding: '4px 8px', fontSize: '10px', border: `1px solid ${blueBg}` }}>
          CONTACTO DE COBRANZAS
        </div>
        <div style={{ border: `1px solid ${blueBg}`, borderTop: 'none', display: 'flex', flexDirection: 'column', marginBottom: '60px' }}>
          
          <div style={{ display: 'flex', padding: '4px', alignItems: 'center', borderBottom: `1px solid ${blueBg}` }}>
            <div style={{ width: '50%', display: 'flex', alignItems: 'center', borderRight: `1px solid ${blueBg}`, paddingRight: '8px' }}>
              <span style={{ width: '180px', fontSize: '10px' }}>CONTACTO DE COBRANZAS:</span>
              <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{empresa.contactoCobranzas || '---'}</span>
            </div>
            <div style={{ width: '50%', display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>
              <span style={{ width: '100px', fontSize: '10px' }}>Días de pago:</span>
              <span style={{ fontWeight: 'bold' }}>{empresa.diasPago || '---'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', padding: '4px', alignItems: 'center' }}>
            <span style={{ width: '140px', fontSize: '10px' }}>correo electrónico:</span>
            <span style={{ fontWeight: 'bold' }}>---</span>
          </div>
        </div>

        {/* Firma */}
        <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '10px', marginTop: '40px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '180px', borderTop: '1px solid black', marginBottom: '4px', margin: '0 auto' }}></div>
            <span>Firma Cliente</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '180px', borderTop: '1px solid black', marginBottom: '4px', margin: '0 auto' }}></div>
            <span>Firma Vendedor / Aclaración</span>
          </div>
        </div>

      </div>
    </div>
  )
}
