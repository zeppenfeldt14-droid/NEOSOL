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
  }, [])

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
    </div>
  )
}
