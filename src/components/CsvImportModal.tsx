'use client'

import React, { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { Upload, X, AlertTriangle, CheckCircle2 } from 'lucide-react'

type Props = {
  zonaName: string
  onClose: () => void
  onImportComplete: () => void
}

export default function CsvImportModal({ zonaName, onClose, onImportComplete }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [data, setData] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  
  const [selectedZona, setSelectedZona] = useState(zonaName)
  const [selectedVendedor, setSelectedVendedor] = useState('')
  const [zonasList, setZonasList] = useState<string[]>([])
  const [vendedoresList, setVendedoresList] = useState<{id: number, alias: string}[]>([])

  const [fieldMapping, setFieldMapping] = useState<{ [key: string]: string }>({
    nombre: '',
    telefono: '',
    direccion: ''
  })
  
  const [importResult, setImportResult] = useState<{ success: number, ignored: number } | null>(null)

  // Fetch Zonas
  useEffect(() => {
    fetch('/api/zonas')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setZonasList(data.map((z: any) => z.nombre || z))
        }
      })
      .catch(err => console.error(err))
  }, [])

  // Fetch Vendedores when selectedZona changes
  useEffect(() => {
    if (!selectedZona) {
      setVendedoresList([])
      setSelectedVendedor('')
      return
    }
    fetch(`/api/usuarios/vendedores?zona=${encodeURIComponent(selectedZona)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setVendedoresList(data)
          // Default to the first seller if any, or empty
          if (data.length > 0) {
            setSelectedVendedor(data[0].alias)
          } else {
            setSelectedVendedor('')
          }
        }
      })
      .catch(err => console.error(err))
  }, [selectedZona])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const fields = results.meta.fields
          if (fields) {
            setHeaders(fields)
            
            // Auto-mapping attempts
            const newMapping = { ...fieldMapping }
            const f = fields.map(h => h.toLowerCase())
            
            const matchHeader = (keywords: string[]) => {
              const matched = f.find(h => keywords.some(k => h.includes(k)))
              return matched ? fields[f.indexOf(matched)] : ''
            }
            
            newMapping.nombre = matchHeader(['name', 'nombre', 'title', 'empresa'])
            newMapping.telefono = matchHeader(['phone', 'tel', 'cel'])
            newMapping.direccion = matchHeader(['address', 'dirección', 'direccion', 'ubicacion', 'street'])
            
            setFieldMapping(newMapping)
          }
          setData(results.data)
        }
      })
    }
  }

  const handleImport = async () => {
    if (!fieldMapping.nombre) {
      alert('La columna "Nombre" es obligatoria.')
      return
    }
    if (!selectedZona) {
      alert('Debes seleccionar una Zona.')
      return
    }

    setIsProcessing(true)
    try {
      const payload = data.map(row => ({
        nombre: row[fieldMapping.nombre] || '',
        telefono: fieldMapping.telefono ? row[fieldMapping.telefono] : '',
        direccion: fieldMapping.direccion ? row[fieldMapping.direccion] : '',
        zona: selectedZona,
        vendedorAsignado: selectedVendedor || null
      })).filter(item => item.nombre.trim() !== '')

      const res = await fetch('/api/empresas/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresas: payload })
      })

      const resultData = await res.json()
      if (!res.ok) throw new Error(resultData.error || 'Error al importar')
      
      setImportResult({ success: resultData.success, ignored: resultData.ignored })
      onImportComplete()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e2330] rounded-xl shadow-2xl w-full max-w-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/20">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            <Upload size={18} className="text-primary" />
            Importar Prospectos
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {!importResult ? (
            <>
              {/* Selectores de Zona y Vendedor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="form-group mb-0">
                  <label className="text-sm text-gray-300">Zona de Destino</label>
                  <select 
                    className="form-input bg-[#1a1f2b] text-sm mt-1"
                    value={selectedZona}
                    onChange={e => setSelectedZona(e.target.value)}
                  >
                    <option value="">Seleccionar zona...</option>
                    {zonasList.length > 0 ? (
                      zonasList.map(z => <option key={z} value={z}>{z}</option>)
                    ) : (
                      <option value={zonaName}>{zonaName}</option>
                    )}
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label className="text-sm text-gray-300">Vendedor Asignado</label>
                  <select 
                    className="form-input bg-[#1a1f2b] text-sm mt-1"
                    value={selectedVendedor}
                    onChange={e => setSelectedVendedor(e.target.value)}
                  >
                    <option value="">(Sin asignar)</option>
                    {vendedoresList.map(v => <option key={v.alias} value={v.alias}>{v.alias}</option>)}
                  </select>
                </div>
              </div>

              {/* File Selection */}
              <div className="mb-6">
                <label className="form-label text-sm text-gray-300">Archivo Excel (CSV)</label>
                <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-primary/50 transition-colors bg-black/20 relative">
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {file ? (
                    <div className="flex flex-col items-center gap-2 text-primary">
                      <CheckCircle2 size={32} />
                      <span className="font-medium text-white">{file.name}</span>
                      <span className="text-xs text-gray-400">{data.length} filas detectadas</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Upload size={32} />
                      <span className="font-medium">Haz clic o arrastra un archivo CSV aquí</span>
                      <span className="text-xs text-gray-500">Separado por comas</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Column Mapping */}
              {headers.length > 0 && (
                <div className="bg-black/20 rounded-lg p-4 border border-white/5 animate-fade-in">
                  <h3 className="font-medium text-sm text-gray-300 mb-4 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-yellow-500" />
                    Mapeo de Columnas
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nombre */}
                    <div className="form-group mb-0">
                      <label className="text-xs text-gray-400">Nombre de la Empresa *</label>
                      <select 
                        className="form-input bg-[#1a1f2b] text-sm mt-1"
                        value={fieldMapping.nombre}
                        onChange={e => setFieldMapping({...fieldMapping, nombre: e.target.value})}
                      >
                        <option value="">Seleccionar columna...</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Teléfono */}
                    <div className="form-group mb-0">
                      <label className="text-xs text-gray-400">Teléfono</label>
                      <select 
                        className="form-input bg-[#1a1f2b] text-sm mt-1"
                        value={fieldMapping.telefono}
                        onChange={e => setFieldMapping({...fieldMapping, telefono: e.target.value})}
                      >
                        <option value="">(No importar)</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Dirección */}
                    <div className="form-group mb-0">
                      <label className="text-xs text-gray-400">Dirección</label>
                      <select 
                        className="form-input bg-[#1a1f2b] text-sm mt-1"
                        value={fieldMapping.direccion}
                        onChange={e => setFieldMapping({...fieldMapping, direccion: e.target.value})}
                      >
                        <option value="">(No importar)</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mt-4">
                    * El sistema ignorará automáticamente aquellas empresas cuyo nombre o teléfono ya existan en la base de datos para no crear duplicados.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 text-green-500 mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">¡Importación Exitosa!</h3>
              <div className="flex justify-center gap-6 mt-6">
                <div className="bg-black/20 p-4 rounded-lg border border-white/5 min-w-[120px]">
                  <div className="text-3xl font-bold text-primary">{importResult.success}</div>
                  <div className="text-xs text-gray-400 mt-1">Nuevos Prospectos</div>
                </div>
                <div className="bg-black/20 p-4 rounded-lg border border-white/5 min-w-[120px]">
                  <div className="text-3xl font-bold text-yellow-500">{importResult.ignored}</div>
                  <div className="text-xs text-gray-400 mt-1">Duplicados Omitidos</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end gap-3">
          {importResult ? (
            <button onClick={onClose} className="btn btn-primary">
              Cerrar
            </button>
          ) : (
            <>
              <button onClick={onClose} className="btn btn-secondary">
                Cancelar
              </button>
              <button 
                onClick={handleImport}
                disabled={!file || !fieldMapping.nombre || !selectedZona || isProcessing}
                className="btn btn-primary"
              >
                {isProcessing ? 'Procesando...' : 'Iniciar Importación'}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
