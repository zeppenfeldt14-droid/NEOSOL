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
  }, [])

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
    </div>
  )
}
