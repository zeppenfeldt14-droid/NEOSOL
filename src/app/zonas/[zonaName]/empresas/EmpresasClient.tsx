'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Search, Plus, MapPin, Phone, Building2 } from 'lucide-react'

type Empresa = {
  id: number
  nombre: string
  zona: string | null
  subZona: string | null
  ocultarVendedor: boolean
  direccion: string | null
  barrio: string | null
  telefono: string | null
  estado: string
  cicloVentaDias: number | null
  creadoEn: Date
  visitas: any[]
}

export default function EmpresasClient({ empresas, zonas }: { empresas: Empresa[], zonas: string[] }) {
  const params = useParams()
  const zonaName = params.zonaName as string
  const [searchQuery, setSearchQuery] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<'todos' | 'prospecto' | 'activo' | 'baja' | 'descartada'>('todos')
  const [zonaFilter, setZonaFilter] = useState<string>('todas')

  const decodedZona = useMemo(() => {
    return decodeURIComponent(zonaName)
  }, [zonaName])

  const handleAddSubZona = async () => {
    const name = prompt('Nombre de la nueva mini-zona / categoría (ej: CABA 4, OESTE 3):')
    if (!name || !name.trim()) return

    try {
      const res = await fetch('/api/subzonas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zona: decodedZona, nombre: name.trim().toUpperCase() })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al crear')
      }
      window.location.reload()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const filteredEmpresas = useMemo(() => {
    const result = empresas.filter(emp => {
      const q = searchQuery.toLowerCase()
      const matchesSearch = q === '' || 
        emp.nombre.toLowerCase().includes(q) || 
        (emp.barrio || '').toLowerCase().includes(q) || 
        (emp.direccion || '').toLowerCase().includes(q)

      const matchesEstado = estadoFilter === 'todos' || emp.estado === estadoFilter

      const empSubZonaNormalizada = emp.subZona ? emp.subZona.trim().toUpperCase() : 'SIN ASIGNAR'
      const matchesZona = zonaFilter === 'todas' || empSubZonaNormalizada === zonaFilter.toUpperCase()

      return matchesSearch && matchesEstado && matchesZona
    })
    
    // Ordenar: Activos -> Prospectos -> Bajas -> Descartadas
    const estadoOrder: Record<string, number> = {
      'activo': 1,
      'prospecto': 2,
      'baja': 3,
      'descartada': 4
    }

    return result.sort((a: Empresa, b: Empresa) => {
      const orderA = estadoOrder[a.estado] || 99
      const orderB = estadoOrder[b.estado] || 99
      
      if (orderA !== orderB) {
        return orderA - orderB
      }
      return a.nombre.localeCompare(b.nombre)
    })
  }, [empresas, searchQuery, estadoFilter, zonaFilter])

  return (
    <div className="animate-fade-in pb-12">
      <div className="page-header">
        <div>
          <h1 className="page-title">Directorio de Empresas</h1>
          <p className="page-subtitle">Gestiona todas las empresas, clientes, prospectos y descartadas.</p>
        </div>
        <Link href={`/zonas/${zonaName}/empresas/nueva`} className="btn btn-primary">
          <Plus size={18} /> Nueva Empresa
        </Link>
      </div>

      {/* Controles de Filtros Unificados (Estilo Dashboard / CSS Original) */}
      <div className="glass-panel card" style={{ marginBottom: '2rem' }}>
        <div className="flex gap-4 items-end flex-wrap">
          <div className="form-group" style={{ marginBottom: 0, flex: '1 1 300px' }}>
            <label className="form-label">Buscar Empresa</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--text-muted)' }}>
                <Search size={18} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nombre, dirección, barrio..."
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Estado</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                { id: 'todos', label: 'Todas' },
                { id: 'prospecto', label: 'Prospectos' },
                { id: 'activo', label: 'Clientes' },
                { id: 'baja', label: 'Bajas' },
                { id: 'descartada', label: 'Descartadas' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setEstadoFilter(tab.id as any)}
                  className={`btn ${estadoFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <label className="form-label" style={{ marginBottom: '0.5rem' }}>Mini-Zonas / Categorías</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => setZonaFilter('todas')}
              className={`badge ${zonaFilter === 'todas' ? 'badge-info' : 'badge-neutral'}`}
              style={{ cursor: 'pointer', padding: '0.4rem 0.8rem' }}
            >
              Todas
            </button>
            {zonas.map(z => (
              <button
                key={z}
                onClick={() => setZonaFilter(z)}
                className={`badge ${zonaFilter === z ? 'badge-info' : 'badge-neutral'}`}
                style={{ cursor: 'pointer', padding: '0.4rem 0.8rem' }}
              >
                {z}
              </button>
            ))}
            <button
              onClick={handleAddSubZona}
              className="badge badge-neutral hover:bg-primary/20 hover:text-primary transition-all flex items-center justify-center"
              style={{ cursor: 'pointer', padding: '0.4rem 0.8rem', border: '1px dashed rgba(255,255,255,0.2)' }}
              title="Crear Nueva Categoría / Mini-Zona"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Ubicación</th>
              <th>Contacto</th>
              <th>Estado</th>
              <th>Última Visita</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmpresas.map((empresa: Empresa) => (
              <tr key={empresa.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building2 size={14} style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{empresa.nombre}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Añadido {empresa.creadoEn.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '0.8rem' }}>
                    {empresa.barrio || '-'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {empresa.subZona || 'SIN ASIGNAR'}
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Phone size={12} style={{ color: 'var(--text-muted)' }} /> {empresa.telefono || '-'}
                  </div>
                </td>
                <td>
                  <span className={`badge ${
                    empresa.estado === 'activo' ? 'badge-success' : 
                    empresa.estado === 'descartada' ? 'badge-danger' :
                    empresa.estado === 'baja' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    'badge-warning'
                  }`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                    {empresa.estado.toUpperCase()}
                  </span>
                </td>
                <td>
                  <div style={{ fontSize: '0.8rem' }}>
                    {empresa.visitas.length > 0 ? (
                      new Date(empresa.visitas[0].fecha).toLocaleDateString()
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Nunca</span>
                    )}
                  </div>
                </td>
                <td>
                  <Link 
                    href={`/zonas/${zonaName}/empresas/${empresa.id}`} 
                    className="btn btn-secondary" 
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    Ver Ficha
                  </Link>
                </td>
              </tr>
            ))}
            {filteredEmpresas.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No se encontraron empresas con los filtros actuales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
