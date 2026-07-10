'use client'

import { useState, useEffect } from 'react'
import { Upload, Link2, Trash2, Save, Image as ImageIcon } from 'lucide-react'
import { saveLogo, deleteLogo } from './actions'

type Props = {
  currentLogo: string | null
}

export function ConfigPageClient({ currentLogo }: Props) {
  const [userNivel, setUserNivel] = useState<number | null>(null)
  
  const [logoUrl, setLogoUrl] = useState<string>(currentLogo || '')
  const [isSaving, setIsSaving] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // Tariffs state
  const [listasTarifas, setListasTarifas] = useState<any[]>([])
  const [newTarifaName, setNewTarifaName] = useState('')
  const [newTarifaVigencia, setNewTarifaVigencia] = useState('')
  const [csvFileMin, setCsvFileMin] = useState<File | null>(null)
  const [csvFileMax, setCsvFileMax] = useState<File | null>(null)
  const [aumentoPorcentaje, setAumentoPorcentaje] = useState<{ [key: number]: string }>({})
  const [isLoadingTarifas, setIsLoadingTarifas] = useState(false)

  // Promotions state
  const [promociones, setPromociones] = useState<any[]>([])
  const [newPromoNombre, setNewPromoNombre] = useState('')
  const [newPromoDesc, setNewPromoDesc] = useState('')
  const [newPromoMin, setNewPromoMin] = useState('')
  const [newPromoBonus, setNewPromoBonus] = useState('')
  const [newPromoDesde, setNewPromoDesde] = useState('')
  const [newPromoHasta, setNewPromoHasta] = useState('')
  const [isLoadingPromos, setIsLoadingPromos] = useState(false)

  // Zones management state
  const [zonas, setZonas] = useState<{ id: number; nombre: string }[]>([])
  const [newZonaName, setNewZonaName] = useState('')
  const [editingZonaId, setEditingZonaId] = useState<number | null>(null)
  const [editingZonaName, setEditingZonaName] = useState('')
  const [isLoadingZonas, setIsLoadingZonas] = useState(false)

  // Fetch current user level on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setUserNivel(data.user.nivel)
        }
      })
      .catch(e => console.error('Error fetching auth me:', e))
    
    fetchZonas()
    fetchTarifas()
    fetchPromociones()
  }, [])

  const fetchTarifas = async () => {
    setIsLoadingTarifas(true)
    try {
      const res = await fetch('/api/configuracion/tarifas')
      const data = await res.json()
      if (Array.isArray(data)) setListasTarifas(data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingTarifas(false)
    }
  }

  const fetchPromociones = async () => {
    setIsLoadingPromos(true)
    try {
      const res = await fetch('/api/configuracion/promociones')
      const data = await res.json()
      if (Array.isArray(data)) setPromociones(data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingPromos(false)
    }
  }

  const handleUploadTarifas = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTarifaName.trim() || !newTarifaVigencia || !csvFileMin || !csvFileMax) {
      alert('Por favor completa todos los campos de la tarifa e ingresa ambos archivos CSV.')
      return
    }
    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('nombre', newTarifaName.trim())
      formData.append('vigenteDesde', newTarifaVigencia)
      formData.append('fileMin', csvFileMin)
      formData.append('fileMax', csvFileMax)

      const res = await fetch('/api/configuracion/tarifas', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al subir tarifas')
      
      alert('Tarifario importado y creado exitosamente.')
      setNewTarifaName('')
      setNewTarifaVigencia('')
      setCsvFileMin(null)
      setCsvFileMax(null)
      // reset file inputs
      const inputMin = document.getElementById('csv-min') as HTMLInputElement
      const inputMax = document.getElementById('csv-max') as HTMLInputElement
      if (inputMin) inputMin.value = ''
      if (inputMax) inputMax.value = ''

      fetchTarifas()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleApplyAumento = async (listaId: number) => {
    const pct = parseFloat(aumentoPorcentaje[listaId] || '')
    if (isNaN(pct)) {
      alert('Por favor ingresa un porcentaje de aumento válido.')
      return
    }
    if (!confirm(`¿Estás seguro de que deseas aplicar un aumento global del ${pct}% sobre esta lista de precios?`)) {
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch('/api/configuracion/tarifas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'aumento_global', listaId, porcentaje: pct })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al aplicar aumento')
      alert(`Aumento del ${pct}% aplicado correctamente.`)
      setAumentoPorcentaje(prev => ({ ...prev, [listaId]: '' }))
      fetchTarifas()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActivaTarifa = async (listaId: number) => {
    try {
      const res = await fetch('/api/configuracion/tarifas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_activa', listaId })
      })
      if (!res.ok) throw new Error('Error al cambiar estado')
      fetchTarifas()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDeleteTarifa = async (listaId: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la lista '${nombre}'?`)) return
    try {
      const res = await fetch(`/api/configuracion/tarifas?id=${listaId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Error al eliminar')
      alert('Lista eliminada.')
      fetchTarifas()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPromoNombre.trim() || !newPromoMin || !newPromoBonus) {
      alert('Por favor completa los campos requeridos de la promoción.')
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch('/api/configuracion/promociones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: newPromoNombre.trim(),
          descripcion: newPromoDesc.trim() || null,
          compraMinima: parseInt(newPromoMin),
          bonificacion: parseInt(newPromoBonus),
          vigenciaDesdeStr: newPromoDesde || null,
          vigenciaHastaStr: newPromoHasta || null
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear promo')
      alert('Promoción creada correctamente.')
      setNewPromoNombre('')
      setNewPromoDesc('')
      setNewPromoMin('')
      setNewPromoBonus('')
      setNewPromoDesde('')
      setNewPromoHasta('')
      fetchPromociones()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdatePromoDate = async (id: number, desdeStr: string, hastaStr: string) => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/configuracion/promociones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          vigenciaDesdeStr: desdeStr || null,
          vigenciaHastaStr: hastaStr || null
        })
      })
      if (!res.ok) throw new Error('Error al guardar fecha')
      alert('Vigencia de la promoción guardada.')
      fetchPromociones()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActivaPromo = async (id: number) => {
    try {
      const res = await fetch('/api/configuracion/promociones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'toggle_activa' })
      })
      if (!res.ok) throw new Error('Error al cambiar estado')
      fetchPromociones()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDeletePromo = async (id: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la promoción '${nombre}'?`)) return
    try {
      const res = await fetch(`/api/configuracion/promociones?id=${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Error al eliminar')
      alert('Promoción eliminada.')
      fetchPromociones()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const fetchZonas = async () => {
    setIsLoadingZonas(true)
    try {
      const res = await fetch('/api/zonas')
      const data = await res.json()
      if (Array.isArray(data)) {
        setZonas(data)
      }
    } catch (e) {
      console.error('Error fetching zones:', e)
    } finally {
      setIsLoadingZonas(false)
    }
  }

  const handleCreateZona = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newZonaName.trim()) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/zonas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: newZonaName.trim().toUpperCase() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear zona')
      setNewZonaName('')
      alert('Zona creada correctamente.')
      fetchZonas()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateZona = async (id: number) => {
    if (!editingZonaName.trim()) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/zonas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, nombre: editingZonaName.trim().toUpperCase() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al modificar zona')
      setEditingZonaId(null)
      alert('Zona modificada correctamente.')
      fetchZonas()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteZona = async (id: number, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la zona '${name}'? Esto también borrará todas las sub-zonas asociadas.`)) {
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch(`/api/zonas?id=${id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al eliminar zona')
      alert('Zona eliminada correctamente.')
      fetchZonas()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle file select and convert to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setLogoUrl(base64)
      }
      reader.readAsDataURL(file)
    }
  }

  // Save changes
  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (logoUrl.trim() === '') {
        await deleteLogo()
      } else {
        await saveLogo(logoUrl)
      }
      alert('Configuración guardada correctamente.')
    } catch (error) {
      console.error(error)
      alert('Error al guardar la configuración.')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete logo
  const handleDelete = async () => {
    if (confirm('¿Estás seguro de que deseas eliminar el logo?')) {
      setIsSaving(true)
      try {
        await deleteLogo()
        setLogoUrl('')
        alert('Logo eliminado correctamente.')
      } catch (error) {
        console.error(error)
        alert('Error al eliminar el logo.')
      } finally {
        setIsSaving(false)
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid md:grid-cols-3 gap-6 animate-fade-in">
        <div className="glass-panel card md:col-span-2">
          <h3 className="card-title text-primary border-b pb-3" style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
            Personalización Visual
          </h3>

          <div className="flex flex-col gap-6">
            {/* Opción 1: Subida Directa */}
            <div className="form-group mb-0">
              <label className="form-label flex items-center gap-2">
                <Upload size={16} className="text-primary" /> Subir Imagen de Logo (sin fondo)
              </label>
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${dragActive ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/20'}`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragActive(false)
                  const file = e.dataTransfer.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onloadend = () => setLogoUrl(reader.result as string)
                    reader.readAsDataURL(file)
                  }
                }}
                onClick={() => document.getElementById('logo-file-input')?.click()}
                style={{ position: 'relative', minHeight: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
              >
                <input 
                  id="logo-file-input" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
                <Upload size={24} className="text-secondary mb-2" />
                <p style={{ fontSize: '0.875rem', fontWeight: 500 }} className="text-primary">Arrastra tu logo aquí o haz clic para buscar</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Soporta PNG, SVG, JPG, WEBP (recomendado sin fondo)</p>
              </div>
            </div>

            <div className="flex items-center text-center text-secondary gap-3" style={{ fontSize: '0.875rem' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }}></div>
              O
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }}></div>
            </div>

            {/* Opción 2: URL de Imagen */}
            <div className="form-group mb-0">
              <label className="form-label flex items-center gap-2">
                <Link2 size={16} className="text-primary" /> Enlace / URL de la Imagen
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="https://ejemplo.com/mi-logo.png" 
                value={logoUrl.startsWith('data:') ? '' : logoUrl} 
                onChange={(e) => setLogoUrl(e.target.value)} 
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Puedes usar un link directo a la imagen o un enlace de Google Drive limpio.
              </p>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/10" style={{ borderTop: '1px solid var(--border-light)' }}>
              {logoUrl && (
                <button onClick={handleDelete} className="btn btn-danger" disabled={isSaving}>
                  <Trash2 size={16} /> Eliminar Logo
                </button>
              )}
              <button onClick={handleSave} className="btn btn-primary" disabled={isSaving}>
                <Save size={16} /> {isSaving ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </div>
        </div>

        {/* Panel de Vista Previa */}
        <div className="glass-panel card flex flex-col justify-between" style={{ minHeight: '300px' }}>
          <div>
            <h3 className="card-title text-primary border-b pb-3" style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
              Vista Previa
            </h3>
            <p className="card-subtitle mb-4">Así es como se lucirá en la barra lateral del sistema.</p>
          </div>

          <div className="flex-1 flex items-center justify-center bg-black/30 rounded-lg border border-white/5 p-6" style={{ minHeight: '120px' }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo Preview" style={{ maxHeight: '70px', maxWidth: '100%', objectFit: 'contain' }} />
            ) : (
              <div className="text-center text-secondary flex flex-col items-center gap-2 opacity-50">
                <ImageIcon size={32} />
                <span style={{ fontSize: '0.875rem' }}>Logo por defecto (NEOSOL)</span>
              </div>
            )}
          </div>

          <div className="text-secondary text-center mt-4" style={{ fontSize: '0.75rem' }}>
            La imagen se adaptará automáticamente a la barra lateral izquierda.
          </div>
        </div>
      </div>

      {/* Dynamic Zones Management (Nivel 1 only) */}
      {userNivel === 1 && (
        <div className="grid md:grid-cols-3 gap-6 animate-fade-in mt-6">
          <div className="glass-panel card md:col-span-2">
            <h3 className="card-title text-primary border-b pb-3" style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
              Gestión de Zonas Principales
            </h3>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                {isLoadingZonas ? (
                  <p className="text-secondary text-sm">Cargando zonas...</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {zonas.map(z => (
                      <div key={z.id} className="flex justify-between items-center p-3 rounded-lg border border-white/5 bg-black/10">
                        {editingZonaId === z.id ? (
                          <div className="flex gap-2 flex-1 mr-4">
                            <input 
                              type="text" 
                              className="form-input !py-1" 
                              value={editingZonaName} 
                              onChange={(e) => setEditingZonaName(e.target.value)} 
                            />
                            <button onClick={() => handleUpdateZona(z.id)} className="btn btn-primary !py-1 text-xs">
                              Guardar
                            </button>
                            <button onClick={() => setEditingZonaId(null)} className="btn btn-secondary !py-1 text-xs">
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-white font-semibold text-sm">{z.nombre}</span>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => { setEditingZonaId(z.id); setEditingZonaName(z.nombre); }} 
                                className="btn btn-secondary !py-1 !px-2 text-xs"
                              >
                                Editar
                              </button>
                              <button 
                                onClick={() => handleDeleteZona(z.id, z.nombre)} 
                                className="btn btn-outline border-error text-error hover:bg-error hover:text-white !py-1 !px-2 text-xs"
                              >
                                Borrar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {zonas.length === 0 && (
                      <p className="text-secondary text-sm">No hay zonas principales configuradas.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="glass-panel card flex flex-col justify-between" style={{ minHeight: '200px' }}>
            <div>
              <h3 className="card-title text-primary border-b pb-3" style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
                Nueva Zona Principal
              </h3>
              <form onSubmit={handleCreateZona} className="flex flex-col gap-4">
                <div className="form-group mb-0">
                  <label className="form-label">Nombre de la Zona</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ej. TUCUMAN" 
                    value={newZonaName} 
                    onChange={(e) => setNewZonaName(e.target.value)} 
                  />
                </div>
                <button type="submit" className="btn btn-primary w-full" disabled={isSaving}>
                  Crear Zona
                </button>
              </form>
            </div>
            <div className="text-secondary text-center mt-4" style={{ fontSize: '0.75rem' }}>
              Al crear una nueva zona principal, aparecerá de forma inmediata en el menú de navegación y en los formularios de alta/edición.
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Tariffs and Pricing Lists */}
      {userNivel === 1 && (
        <div className="grid md:grid-cols-3 gap-6 animate-fade-in mt-6">
          <div className="glass-panel card md:col-span-2">
            <h3 className="card-title text-primary border-b pb-3" style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
              Listas de Tarifas y Precios por Volumen
            </h3>

            <div className="flex flex-col gap-4">
              {isLoadingTarifas ? (
                <p className="text-secondary text-sm">Cargando tarifas...</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {listasTarifas.map(l => {
                    const actDate = new Date(l.vigenteDesde).toLocaleDateString('es-AR')
                    return (
                      <div key={l.id} className="p-4 rounded-lg border border-white/5 bg-black/10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-sm">{l.nombre}</span>
                            <span className={`badge ${l.activa ? 'badge-success' : 'badge-neutral'}`}>
                              {l.activa ? 'Vigente' : 'Inactiva'}
                            </span>
                          </div>
                          <div className="text-secondary text-xs mt-1">
                            Vigente desde: {actDate} · {l.precios?.length || 0} productos
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
                          {/* Aumento Global */}
                          <div className="flex items-center gap-1.5 bg-black/30 p-1.5 rounded-lg border border-white/5">
                            <input 
                              type="number" 
                              className="form-input !py-1 !px-2 text-xs w-16 text-center" 
                              placeholder="+ %"
                              value={aumentoPorcentaje[l.id] || ''}
                              onChange={(e) => setAumentoPorcentaje(prev => ({ ...prev, [l.id]: e.target.value }))}
                            />
                            <button 
                              onClick={() => handleApplyAumento(l.id)} 
                              className="btn btn-secondary !py-1 !px-2 text-xs"
                              title="Aplicar Aumento Porcentual Masivo"
                            >
                              Aplicar
                            </button>
                          </div>

                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleToggleActivaTarifa(l.id)} 
                              className="btn btn-secondary !py-1.5 !px-2.5 text-xs"
                            >
                              {l.activa ? 'Desactivar' : 'Activar'}
                            </button>
                            <button 
                              onClick={() => handleDeleteTarifa(l.id, l.nombre)} 
                              className="btn btn-outline border-error text-error hover:bg-error hover:text-white !py-1.5 !px-2.5 text-xs"
                            >
                              Borrar
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {listasTarifas.length === 0 && (
                    <p className="text-secondary text-sm">No hay listas de tarifas importadas.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel card flex flex-col justify-between" style={{ minHeight: '300px' }}>
            <div>
              <h3 className="card-title text-primary border-b pb-3" style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
                Importar Tarifario Agosto (CSV)
              </h3>
              <form onSubmit={handleUploadTarifas} className="flex flex-col gap-4">
                <div className="form-group mb-0">
                  <label className="form-label">Nombre del Tarifario</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ej. Tarifario Agosto 2026" 
                    value={newTarifaName} 
                    onChange={(e) => setNewTarifaName(e.target.value)} 
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">Vigente Desde</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={newTarifaVigencia} 
                    onChange={(e) => setNewTarifaVigencia(e.target.value)} 
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">CSV Tarifa Menor Volumen (&lt; 300 cajas)</label>
                  <input 
                    id="csv-min"
                    type="file" 
                    accept=".csv"
                    className="form-input !py-1 text-xs"
                    onChange={(e) => setCsvFileMin(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">CSV Tarifa Mayor Volumen (&gt;= 300 cajas)</label>
                  <input 
                    id="csv-max"
                    type="file" 
                    accept=".csv"
                    className="form-input !py-1 text-xs"
                    onChange={(e) => setCsvFileMax(e.target.files?.[0] || null)}
                  />
                </div>
                <button type="submit" className="btn btn-primary w-full" disabled={isSaving}>
                  Importar Tarifario
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Promotions */}
      {userNivel === 1 && (
        <div className="grid md:grid-cols-3 gap-6 animate-fade-in mt-6">
          <div className="glass-panel card md:col-span-2">
            <h3 className="card-title text-primary border-b pb-3" style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
              Gestión de Promociones Mensuales
            </h3>

            <div className="flex flex-col gap-4">
              {isLoadingPromos ? (
                <p className="text-secondary text-sm">Cargando promociones...</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {promociones.map(p => {
                    const desdeVal = p.vigenciaDesde ? new Date(p.vigenciaDesde).toISOString().split('T')[0] : ''
                    const hastaVal = p.vigenciaHasta ? new Date(p.vigenciaHasta).toISOString().split('T')[0] : ''
                    return (
                      <div key={p.id} className="p-4 rounded-lg border border-white/5 bg-black/10 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-bold text-sm">{p.nombre}</span>
                              <span className={`badge ${p.activa ? 'badge-success' : 'badge-neutral'}`}>
                                {p.activa ? 'Activa' : 'Inactiva'}
                              </span>
                            </div>
                            {p.descripcion && <p className="text-secondary text-xs mt-0.5">{p.descripcion}</p>}
                            <p className="text-primary font-semibold text-xs mt-1">
                              Compra Mínima: {p.compraMinima} cajas ➔ Bonificación: {p.bonificacion} cajas de regalo
                            </p>
                          </div>
                          
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleToggleActivaPromo(p.id)} 
                              className="btn btn-secondary !py-1 !px-2 text-xs"
                            >
                              {p.activa ? 'Desactivar' : 'Activar'}
                            </button>
                            <button 
                              onClick={() => handleDeletePromo(p.id, p.nombre)} 
                              className="btn btn-outline border-error text-error hover:bg-error hover:text-white !py-1 !px-2 text-xs"
                            >
                              Borrar
                            </button>
                          </div>
                        </div>

                        {/* Extend Validity Form */}
                        <div className="flex items-center gap-3 bg-black/30 p-2.5 rounded-lg border border-white/5 flex-wrap">
                          <span className="text-secondary text-[11px] font-bold">Vigencia:</span>
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="date" 
                              className="form-input !py-1 text-xs w-28 text-center" 
                              defaultValue={desdeVal}
                              id={`promo-desde-${p.id}`}
                            />
                            <span className="text-white/20 text-xs">a</span>
                            <input 
                              type="date" 
                              className="form-input !py-1 text-xs w-28 text-center" 
                              defaultValue={hastaVal}
                              id={`promo-hasta-${p.id}`}
                            />
                          </div>
                          <button 
                            onClick={() => {
                              const dVal = (document.getElementById(`promo-desde-${p.id}`) as HTMLInputElement).value
                              const hVal = (document.getElementById(`promo-hasta-${p.id}`) as HTMLInputElement).value
                              handleUpdatePromoDate(p.id, dVal, hVal)
                            }}
                            className="btn btn-primary !py-1 !px-3 text-xs"
                          >
                            Guardar Vigencia
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {promociones.length === 0 && (
                    <p className="text-secondary text-sm">No hay promociones registradas en el sistema.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel card flex flex-col justify-between" style={{ minHeight: '300px' }}>
            <div>
              <h3 className="card-title text-primary border-b pb-3" style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
                Nueva Promoción Mensual
              </h3>
              <form onSubmit={handleCreatePromo} className="flex flex-col gap-3">
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Nombre de la Promo *</label>
                  <input 
                    type="text" 
                    className="form-input text-xs" 
                    placeholder="Ej. Promo 10x1 Belgrano" 
                    value={newPromoNombre} 
                    onChange={(e) => setNewPromoNombre(e.target.value)} 
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Descripción</label>
                  <input 
                    type="text" 
                    className="form-input text-xs" 
                    placeholder="Ej. 1 caja de regalo por cada 10 compradas" 
                    value={newPromoDesc} 
                    onChange={(e) => setNewPromoDesc(e.target.value)} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="form-group mb-0">
                    <label className="form-label text-[10px]">Compra Mín. (Cajas)</label>
                    <input 
                      type="number" 
                      className="form-input text-xs" 
                      placeholder="10" 
                      value={newPromoMin} 
                      onChange={(e) => setNewPromoMin(e.target.value)} 
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label text-[10px]">Bonif. (Cajas de Regalo)</label>
                    <input 
                      type="number" 
                      className="form-input text-xs" 
                      placeholder="1" 
                      value={newPromoBonus} 
                      onChange={(e) => setNewPromoBonus(e.target.value)} 
                    />
                  </div>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">Vigencia Desde</label>
                  <input 
                    type="date" 
                    className="form-input text-xs !py-1" 
                    value={newPromoDesde} 
                    onChange={(e) => setNewPromoDesde(e.target.value)} 
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-[10px]">Vigencia Hasta</label>
                  <input 
                    type="date" 
                    className="form-input text-xs !py-1" 
                    value={newPromoHasta} 
                    onChange={(e) => setNewPromoHasta(e.target.value)} 
                  />
                </div>
                <button type="submit" className="btn btn-primary w-full mt-2" disabled={isSaving}>
                  Crear Promoción
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
