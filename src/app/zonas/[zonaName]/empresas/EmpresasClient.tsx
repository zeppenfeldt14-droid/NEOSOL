'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Search, Plus, MapPin, Phone, Building2, Download } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type Empresa = {
  id: number
  nombre: string
  zona: string | null
  subZona: string | null
  rubro: string | null
  ocultarVendedor: boolean
  direccion: string | null
  barrio: string | null
  telefono: string | null
  estado: string
  cicloVentaDias: number | null
  creadoEn: Date
  visitas: any[]
}

export default function EmpresasClient({ empresas, zonas, rubros }: { empresas: Empresa[], zonas: string[], rubros: string[] }) {
  const params = useParams()
  const zonaName = params.zonaName as string
  const [searchQuery, setSearchQuery] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<'todos' | 'prospecto' | 'activo' | 'baja' | 'descartada'>('todos')
  const [zonaFilter, setZonaFilter] = useState<string>('todas')
  const [rubroFilter, setRubroFilter] = useState<string>('todos')

  const decodedZona = useMemo(() => {
    return decodeURIComponent(zonaName)
  }, [zonaName])

  const getRubroDisplayName = (name: string) => {
    const match = name.match(/^CATEGORIA\s+(\d+)$/i);
    if (match) {
      return `Categoría ${match[1]}`;
    }
    return name;
  };

  const RUBRO_LEGENDS: Record<string, { title: string, desc: string, icon: string }> = {
    'CATEGORIA 1': {
      title: 'Mayoristas de Golosinas, Galletitas y Kiosco',
      desc: 'Distribuidoras y mayoristas de golosinas, galletitas, alfajores, snacks, bebidas y candy bar.',
      icon: '🍬'
    },
    'CATEGORIA 2': {
      title: 'Mayoristas Gastronómicos (Canal HORECA)',
      desc: 'Abastecedores de alimentos, lácteos, fiambres, conservas y descartables para restaurantes, catering y hoteles.',
      icon: '🍽️'
    },
    'CATEGORIA 3': {
      title: 'Hipermayoristas y Consumo Masivo',
      desc: 'Grandes superficies y autoservicios mayoristas de consumo masivo general (alimentos secos, limpieza, perfumería).',
      icon: '🛒'
    },
    'CATEGORIA 4': {
      title: 'Especialistas en Lácteos y Fiambres',
      desc: 'Distribución y venta mayorista/minorista de quesos, fiambres, embutidos y productos de almacén lácteos.',
      icon: '🧀'
    },
    'CATEGORIA 5': {
      title: 'Especialidad, Dietéticas y Saludables',
      desc: 'Alimentos saludables secos/congelados, dietéticas, productos veganos, sin gluten (Sin TACC), Kosher e importados.',
      icon: '🌱'
    },
    'CATEGORIA 6': {
      title: 'Cadenas de Kioscos (Retail Minorista)',
      desc: 'Cadenas de kioscos de proximidad (24hs) o locales minoristas con sucursales.',
      icon: '🏪'
    },
    'CATEGORIA 7': {
      title: 'Logística y Plataformas de Entrega',
      desc: 'Centros de distribución B2B, logística de última milla, envíos Flex y plataformas de delivery.',
      icon: '🚚'
    },
    'CATEGORIA 8': {
      title: 'Cotillón y Artículos de Fiesta',
      desc: 'Venta mayorista y minorista de artículos de cotillón, repostería y organización de fiestas.',
      icon: '🎉'
    },
    'CATEGORIA 9': {
      title: 'Rubros No Compatibles (Descartados)',
      desc: 'Almacenes de maquinarias, perfumerías exclusivas y casas particulares fuera del perfil alimenticio.',
      icon: '❌'
    },
    'CATEGORIA 10': {
      title: 'Otras Distribuidoras y Mayoristas Generales',
      desc: 'Distribuidoras generales, multirrubro o secos a validar en el terreno.',
      icon: '📦'
    },
    'CATEGORIA 11': {
      title: 'Institucional / Salud',
      desc: 'Hospitales, clínicas, sanatorios e instituciones públicas/privadas de salud.',
      icon: '🏥'
    }
  }

  const handleExportPDF = () => {
    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(16)
    doc.text(`Directorio de Empresas - Zona: ${decodedZona}`, 14, 15)
    
    // Subtitle / Filters Info
    doc.setFontSize(10)
    doc.setTextColor(100)
    const filters = []
    if (searchQuery) filters.push(`Búsqueda: "${searchQuery}"`)
    if (estadoFilter !== 'todos') filters.push(`Estado: ${estadoFilter}`)
    if (zonaFilter !== 'todas') filters.push(`Mini-zona: ${zonaFilter}`)
    if (rubroFilter !== 'todos') filters.push(`Rubro: ${rubroFilter}`)
    doc.text(filters.length > 0 ? `Filtros: ${filters.join(' | ')}` : 'Todos los registros', 14, 22)
    
    // Define Headers and Data
    const headers = [['Categoría / Rubro', 'Empresa', 'Mini-zona', 'Ubicación', 'Contacto', 'Estado']]
    const rows = filteredEmpresas.map(emp => [
      emp.rubro ? getRubroDisplayName(emp.rubro) : '---',
      emp.nombre,
      emp.subZona || '---',
      `${emp.direccion || ''} ${emp.barrio ? `(${emp.barrio})` : ''}`.trim() || '---',
      emp.telefono || '---',
      emp.estado.toUpperCase()
    ])
    
    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 26,
      theme: 'striped',
      headStyles: { fillColor: [59, 89, 152] }, // Neosol Blue (#3b5998)
      styles: { fontSize: 8 }
    })
    
    doc.save(`Empresas_${decodedZona.replace(/\s+/g, '_')}.pdf`)
  }

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

  const handleAddRubro = async () => {
    const name = prompt('Nombre de la nueva categoría comercial / rubro (ej: DISTRIBUIDORAS, BEBIDAS):')
    if (!name || !name.trim()) return

    try {
      const res = await fetch('/api/rubros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: name.trim().toUpperCase() })
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

      const empRubroNormalizado = emp.rubro ? emp.rubro.trim().toUpperCase() : 'SIN RUBRO'
      const matchesRubro = rubroFilter === 'todos' || empRubroNormalizado === rubroFilter.toUpperCase()

      return matchesSearch && matchesEstado && matchesZona && matchesRubro
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
  }, [empresas, searchQuery, estadoFilter, zonaFilter, rubroFilter])

  return (
    <div className="animate-fade-in pb-12">
      <div className="page-header">
        <div>
          <h1 className="page-title">Directorio de Empresas</h1>
          <p className="page-subtitle">Gestiona todas las empresas, clientes, prospectos y descartadas.</p>
        </div>
        <div className="flex gap-2 items-center">
          <button 
            onClick={handleExportPDF}
            className="btn btn-secondary flex items-center justify-center"
            style={{ padding: '0.5rem', minWidth: '38px', minHeight: '38px', borderRadius: '10px' }}
            title="Descargar PDF de Empresas"
          >
            <Download size={18} />
          </button>
          <Link href={`/zonas/${zonaName}/empresas/nueva`} className="btn btn-primary">
            <Plus size={18} /> Nueva Empresa
          </Link>
        </div>
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
            <div className="flex gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
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
              className={`btn-toggle ${zonaFilter === 'todas' ? 'active' : ''}`}
            >
              Todas
            </button>
            {zonas.map(z => (
              <button
                key={z}
                onClick={() => setZonaFilter(z)}
                className={`btn-toggle ${zonaFilter === z ? 'active' : ''}`}
              >
                {z}
              </button>
            ))}
            <button
              onClick={handleAddSubZona}
              className="btn-toggle border-dashed hover:border-primary/50 hover:text-primary"
              title="Crear Nueva Categoría / Mini-Zona"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
          <label className="form-label" style={{ marginBottom: '0.5rem' }}>Rubros / Categorías Comerciales</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => setRubroFilter('todos')}
              className={`btn-toggle ${rubroFilter === 'todos' ? 'active' : ''}`}
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              Todos
            </button>
            {rubros.map(r => {
              const info = RUBRO_LEGENDS[r.toUpperCase()] || { icon: '🏷️', title: getRubroDisplayName(r) };
              return (
                <button
                  key={r}
                  onClick={() => setRubroFilter(r)}
                  className={`btn-toggle ${rubroFilter === r ? 'active' : ''}`}
                  style={{
                    fontSize: '1.2rem',
                    padding: '0.4rem',
                    minWidth: '38px',
                    minHeight: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '10px'
                  }}
                  title={`${getRubroDisplayName(r)}: ${info.title}`}
                >
                  {info.icon}
                </button>
              )
            })}
            <button
              onClick={handleAddRubro}
              className="btn-toggle border-dashed hover:border-primary/50 hover:text-primary"
              title="Crear Nuevo Rubro Comercial"
            >
              <Plus size={14} />
            </button>
          </div>

          {rubroFilter !== 'todos' && RUBRO_LEGENDS[rubroFilter.toUpperCase()] && (
            <div className="animate-fade-in" style={{
              marginTop: '1rem',
              padding: '1rem 1.25rem',
              backgroundColor: 'rgba(59, 89, 152, 0.08)',
              border: '1px solid rgba(59, 89, 152, 0.2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              boxShadow: '0 4px 20px -2px rgba(0,0,0,0.2)'
            }}>
              <span style={{ fontSize: '1.5rem', lineHeight: '1' }}>
                {RUBRO_LEGENDS[rubroFilter.toUpperCase()].icon}
              </span>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {getRubroDisplayName(rubroFilter)}: {RUBRO_LEGENDS[rubroFilter.toUpperCase()].title}
                </h4>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {RUBRO_LEGENDS[rubroFilter.toUpperCase()].desc}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:block table-container">
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
                    {empresa.subZona || 'SIN ASIGNAR'} • {getRubroDisplayName(empresa.rubro || 'SIN RUBRO')}
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
                    className="btn btn-secondary text-xs px-3" 
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

      {/* ── MOBILE VIEW (CARDS) ────────────────────────────────────────── */}
      <div className="md:hidden flex flex-col gap-3">
        {filteredEmpresas.map((empresa: Empresa) => (
          <Link
            key={empresa.id}
            href={`/zonas/${zonaName}/empresas/${empresa.id}`}
            className="block p-4 rounded-xl bg-black/20 border border-white/5 shadow-sm hover:border-white/10 transition-colors"
          >
            <div className="flex justify-between items-start gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-primary" />
                <h3 className="text-white font-bold text-sm leading-tight">{empresa.nombre}</h3>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase whitespace-nowrap ${
                empresa.estado === 'activo' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                empresa.estado === 'descartada' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                empresa.estado === 'baja' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              }`}>
                {empresa.estado}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-secondary uppercase font-bold">Ubicación</span>
                <span className="text-xs text-white/80">{empresa.barrio || '—'}</span>
                <span className="text-[10px] text-secondary">{empresa.subZona || 'SIN ASIGNAR'}</span>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-[9px] text-secondary uppercase font-bold">Rubro / Contacto</span>
                <span className="text-xs text-white/80 truncate">{getRubroDisplayName(empresa.rubro || 'SIN RUBRO')}</span>
                <span className="text-[10px] text-secondary flex items-center justify-end gap-1">
                  <Phone size={10} /> {empresa.telefono || '—'}
                </span>
              </div>
            </div>
          </Link>
        ))}
        {filteredEmpresas.length === 0 && (
          <div className="text-center p-8 bg-black/10 rounded-xl border border-white/5 text-secondary text-sm">
            No se encontraron empresas
          </div>
        )}
      </div>

      {/* Floating Action Button (Mobile) */}
      <Link 
        href={`/zonas/${zonaName}/empresas/nueva`}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-[0_4px_20px_rgba(59,130,246,0.5)] flex items-center justify-center z-50 active:scale-95 transition-transform"
      >
        <Plus size={24} />
      </Link>
    </div>
  )
}
