'use client'

import { useState, useEffect } from 'react'
import { Eye, FileText, Upload, Save, Check } from 'lucide-react'

interface HistorialComprasClientProps {
  empresaId: number
  userNivel: number
}

export function HistorialComprasClient({ empresaId, userNivel }: HistorialComprasClientProps) {
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  
  // States for uploading/saving
  const [isSaving, setIsSaving] = useState(false)
  const [uploadData, setUploadData] = useState<{ [facturaId: number]: { base64: string, mimeType: string } }>({})

  const fetchHistorial = async () => {
    try {
      const res = await fetch(`/api/pedidos/historial/${empresaId}`)
      if (res.ok) {
        const data = await res.json()
        setPedidos(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistorial()
  }, [empresaId])

  const handleFileChange = (facturaId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setUploadData(prev => ({
          ...prev,
          [facturaId]: { base64, mimeType: file.type }
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveFactura = async (facturaId: number) => {
    const data = uploadData[facturaId]
    if (!data) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/facturas/${facturaId}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!res.ok) throw new Error('Error al subir factura')
      
      alert('Factura guardada correctamente.')
      setUploadData(prev => {
        const newData = { ...prev }
        delete newData[facturaId]
        return newData
      })
      fetchHistorial()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return <div className="text-secondary text-sm mt-4 p-4 text-center">Cargando historial...</div>
  }

  if (pedidos.length === 0) {
    return <div className="text-secondary text-sm mt-4 p-4 text-center border border-white/10 rounded-lg">No hay historial de compras aprobado.</div>
  }

  return (
    <div className="flex flex-col gap-3 mt-4">
      {pedidos.map(pedido => {
        const isExpanded = expandedId === pedido.id
        const fechaVenta = new Date(pedido.creadoEn).toLocaleDateString('es-AR')
        
        return (
          <div key={pedido.id} className="border border-white/10 bg-black/20 rounded-lg overflow-hidden">
            {/* Header Row */}
            <div 
              className="flex justify-between items-center p-3 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : pedido.id)}
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-primary">{fechaVenta}</span>
                <span className="text-sm font-mono text-secondary">{pedido.numeroPedido}</span>
                <span className="badge badge-success">Aprobado</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-white text-sm">
                  {pedido.totalGeneral?.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                </span>
                <button className="btn btn-secondary !p-1.5 rounded-md">
                  <Eye size={16} />
                </button>
              </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="p-4 border-t border-white/10 bg-black/40 flex flex-col gap-4">
                {/* Sale Information */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-secondary text-xs mb-1">Fecha Entrega Acordada</div>
                    <div className="font-semibold text-white">{pedido.fechaEntrega || 'No definida'}</div>
                  </div>
                  <div>
                    <div className="text-secondary text-xs mb-1">Pago Factura A</div>
                    <div className="font-semibold text-white">{pedido.metodoPagoA || 'No definido'}</div>
                  </div>
                  <div>
                    <div className="text-secondary text-xs mb-1">Pago Factura B / Remito</div>
                    <div className="font-semibold text-white">{pedido.metodoPagoB || 'No definido'}</div>
                  </div>
                  <div>
                    <div className="text-secondary text-xs mb-1">Condición</div>
                    <div className="font-semibold text-white">{pedido.condicionPago || 'Efectivo'}</div>
                  </div>
                </div>

                {/* Invoices List */}
                <div className="mt-2">
                  <h4 className="text-sm font-bold text-primary mb-3 border-b border-white/10 pb-2 flex items-center gap-2">
                    <FileText size={16} /> Facturas de la Venta
                  </h4>
                  
                  {pedido.facturas?.length > 0 ? (
                    <div className="grid gap-3">
                      {pedido.facturas.map((factura: any) => (
                        <div key={factura.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                          <div className="flex flex-col">
                            <span className="font-bold text-white text-sm flex items-center gap-2">
                              {factura.numeroFactura} 
                              <span className="badge badge-neutral bg-primary/20 text-primary border-0">{factura.tipo}</span>
                            </span>
                            <span className="text-xs text-secondary mt-1">
                              Total: {factura.total?.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Ver/Descargar Archivo si existe */}
                            {factura.archivoBase64 && (
                              <a 
                                href={factura.archivoBase64} 
                                download={`Factura_${factura.numeroFactura}`}
                                className="btn btn-secondary !py-1 !px-3 text-xs flex items-center gap-1 bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                              >
                                <Check size={14} /> Ver / Descargar PDF
                              </a>
                            )}

                            {/* Subir Archivo (Solo Nivel 1 y 2) */}
                            {userNivel < 3 && (
                              <div className="flex items-center gap-2">
                                <label className="btn btn-outline border-primary/30 text-primary hover:bg-primary/20 !py-1 !px-3 text-xs cursor-pointer flex items-center gap-1">
                                  <Upload size={14} /> Seleccionar PDF
                                  <input 
                                    type="file" 
                                    accept=".pdf,image/*" 
                                    className="hidden" 
                                    onChange={(e) => handleFileChange(factura.id, e)}
                                  />
                                </label>
                                
                                {uploadData[factura.id] && (
                                  <button 
                                    onClick={() => handleSaveFactura(factura.id)}
                                    disabled={isSaving}
                                    className="btn btn-primary !py-1 !px-3 text-xs flex items-center gap-1"
                                  >
                                    <Save size={14} /> {isSaving ? 'Guardando...' : 'Guardar'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-secondary">No hay facturas generadas para este pedido.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
