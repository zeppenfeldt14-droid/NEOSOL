'use client'

import { useState } from 'react'

export function NuevoContactoForm({ empresaId, addVisitaAction }: { empresaId: number, addVisitaAction: any }) {
  const [options, setOptions] = useState([
    { value: 'visita', label: '🚗 Visita Presencial' },
    { value: 'correo', label: '📧 Correo Electrónico' },
    { value: 'whatsapp', label: '💬 WhatsApp' },
  ])
  const [selectedTipo, setSelectedTipo] = useState('visita')

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === 'agregar_nuevo') {
      const nuevoTipo = prompt('Escribe el nombre del nuevo tipo de contacto:')
      if (nuevoTipo && nuevoTipo.trim()) {
        const key = nuevoTipo.trim().toLowerCase().replace(/\s+/g, '_')
        const label = nuevoTipo.trim()
        
        if (!options.some(opt => opt.value === key)) {
          setOptions(prev => [...prev, { value: key, label: `✨ ${label}` }])
        }
        setSelectedTipo(key)
      } else {
        setSelectedTipo('visita')
      }
    } else {
      setSelectedTipo(val)
    }
  }

  return (
    <form action={addVisitaAction} className="grid grid-cols-2 gap-4">
      <div className="form-group">
        <label className="form-label">Fecha</label>
        <input type="date" name="fecha" required defaultValue={new Date().toISOString().split('T')[0]} className="form-input" />
      </div>
      <div className="form-group">
        <label className="form-label">Tipo de Contacto</label>
        {/* Hidden input to pass the selected type value to the server action */}
        <input type="hidden" name="tipo" value={selectedTipo} />
        <select value={selectedTipo} onChange={handleSelectChange} className="form-input">
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
          <option value="agregar_nuevo" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
            ➕ Agregar tipo...
          </option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Resultado</label>
        <select name="resultado" required className="form-input">
          <option value="muestra_dejada">Muestra Dejada</option>
          <option value="venta">Cierre de Venta ✅</option>
          <option value="negativo">Rechazo ❌</option>
          <option value="neutro">En Evaluación 🔄</option>
          <option value="contacto_obtenido">Contacto Obtenido 📋</option>
          <option value="sin_respuesta">Sin Respuesta 📵</option>
          <option value="reprogramado">Reprogramado 📅</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Persona de Contacto</label>
        <input type="text" name="contacto" placeholder="Nombre (ej. Alberto)" className="form-input" />
      </div>
      <div className="form-group">
        <label className="form-label">Cargo</label>
        <input type="text" name="cargo" placeholder="Encargado de compras, etc." className="form-input" />
      </div>
      <div className="form-group" style={{ gridColumn: 'span 2' }}>
        <label className="form-label">Notas / Observaciones</label>
        <textarea name="notas" rows={3} placeholder="Detalles de la visita..." className="form-input" spellCheck="true" lang="es-AR" autoCorrect="on"></textarea>
      </div>
      <div className="form-group" style={{ gridColumn: 'span 2' }}>
        <label className="form-label">Próxima Acción Recomendada</label>
        <input type="text" name="proximaAccion" placeholder="Ej. Enviar lista de precios por correo" className="form-input" spellCheck="true" lang="es-AR" autoCorrect="on" />
      </div>
      <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn-primary">Registrar Visita</button>
      </div>
    </form>
  )
}
