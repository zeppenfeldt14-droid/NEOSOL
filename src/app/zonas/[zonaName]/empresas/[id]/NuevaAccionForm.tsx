'use client'

import { useState } from 'react'
import { ThumbsUp } from 'lucide-react'

interface NuevaAccionFormProps {
  empresaId: number
  addAccionAction: (empresaId: number, formData: FormData) => Promise<void>
}

export function NuevaAccionForm({ empresaId, addAccionAction }: NuevaAccionFormProps) {
  const [options, setOptions] = useState([
    { value: 'llamada', label: '📞 Llamada' },
    { value: 'correo', label: '📧 Correo' },
    { value: 'visita', label: '🚗 Visita' },
    { value: 'whatsapp', label: '💬 WhatsApp' },
    { value: 'planificacion', label: '📅 Planificación' },
  ])
  const [selectedTipo, setSelectedTipo] = useState('llamada')
  const [descripcion, setDescripcion] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === 'agregar_nuevo') {
      const nuevoTipo = prompt('Escribe el nombre del nuevo tipo de tarea/acción:')
      if (nuevoTipo && nuevoTipo.trim()) {
        const key = nuevoTipo.trim().toLowerCase().replace(/\s+/g, '_')
        const label = nuevoTipo.trim()
        
        // Add if not already exists
        if (!options.some(opt => opt.value === key)) {
          setOptions(prev => [...prev, { value: key, label: `✨ ${label}` }])
        }
        setSelectedTipo(key)
      } else {
        setSelectedTipo('llamada')
      }
    } else {
      setSelectedTipo(val)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!descripcion.trim()) return

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('tipo', selectedTipo)
      formData.append('descripcion', descripcion)
      formData.append('fechaVencimiento', fechaVencimiento)
      
      await addAccionAction(empresaId, formData)
      
      setDescripcion('')
      setFechaVencimiento('')
    } catch (error) {
      console.error(error)
      alert('Error al agregar la tarea.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end mb-4 bg-black/20 p-3 rounded-lg">
      <div className="form-group flex-1 mb-0">
        <input 
          type="text" 
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          required 
          placeholder="Nueva tarea (ej. Enviar catálogo)" 
          className="form-input" 
          style={{ padding: '0.5rem', fontSize: '0.75rem' }} 
        />
      </div>
      <div className="form-group mb-0" style={{ width: '150px' }}>
        <select 
          value={selectedTipo}
          onChange={handleSelectChange}
          className="form-input" 
          style={{ padding: '0.5rem', fontSize: '0.75rem' }}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
          <option value="agregar_nuevo" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
            ➕ Agregar tipo...
          </option>
        </select>
      </div>
      <div className="form-group mb-0" style={{ width: '130px' }}>
        <input 
          type="date" 
          value={fechaVencimiento}
          onChange={e => setFechaVencimiento(e.target.value)}
          className="form-input" 
          style={{ padding: '0.5rem', fontSize: '0.75rem' }} 
        />
      </div>
      <button 
        type="submit" 
        disabled={isSubmitting}
        className="btn btn-primary flex items-center justify-center" 
        style={{ padding: '0.5rem', height: '36px', width: '36px' }}
      >
        {isSubmitting ? '...' : <ThumbsUp size={16} />}
      </button>
    </form>
  )
}
