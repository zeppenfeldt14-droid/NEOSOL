'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Search, Plus, MapPin, Phone, Building2, Download, MessageCircle, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type Empresa = {
  id: number
  nombre: string
  zona: string | null
  subZona: string | null
  rubro: string | null
  vendedorAsignado: string | null
  ocultarVendedor: boolean
  direccion: string | null
  barrio: string | null
  telefono: string | null
  telefono2: string | null
  estado: string
  cicloVentaDias: number | null
  creadoEn: Date
  visitas: any[]
}

type Vendedor = {
  id: number
  nombre: string
  alias: string
  zona: string | null
}

type SolicitudReasignacion = {
  id: number
  empresaId: number
  empresaNombre: string
  solicitadoPor: string
  zonaOrigen: string | null
  zonaDestino: string
  vendedorDestino: string
  estado: string
  creadoEn: string
}

export default function EmpresasGlobalClient({ 
  empresas, 
  zonasBase, 
  subZonas, 
  rubros,
  vendedores,
  userNivel
}: { 
  empresas: Empresa[], 
  zonasBase: string[],
  subZonas: string[], 
  rubros: string[],
  vendedores: Vendedor[],
  userNivel: number
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<'todos' | 'prospecto' | 'activo' | 'baja' | 'descartada'>('todos')
  const [zonaFilter, setZonaFilter] = useState<string>('todas')
  const [vendedorFilter, setVendedorFilter] = useState<string>('todos')
  const [rubroFilter, setRubroFilter] = useState<string>('todos')

  const [solicitudes, setSolicitudes] = useState<SolicitudReasignacion[]>([])
  
  useEffect(() => {
    if (userNivel === 1) {
      fetch('/api/reasignaciones')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setSolicitudes(data)
        })
        .catch(console.error)
    }
  }, [userNivel])

  const handleAprobarSolicitud = async (id: number, aprobar: boolean) => {
    if (!confirm(`¿Estás seguro de que deseas ${aprobar ? 'aprobar' : 'rechazar'} esta reasignación?`)) return
    try {
      const res = await fetch('/api/reasignaciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado: aprobar ? 'aprobada' : 'rechazada' })
      })
      if (res.ok) {
        alert('Solicitud procesada con éxito.')
        setSolicitudes(s => s.filter(x => x.id !== id))
        if (aprobar) {
          window.location.reload()
        }
      } else {
        const error = await res.json()
        alert(error.error || 'Error al procesar solicitud')
      }
    } catch (e) {
      console.error(e)
      alert('Error de conexión')
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

      const empZona = emp.zona ? emp.zona.trim().toUpperCase() : 'SIN ASIGNAR'
      const matchesZona = zonaFilter === 'todas' || empZona === zonaFilter.toUpperCase()

      let matchesVendedor = true
      if (vendedorFilter === 'sin_vendedor') {
        matchesVendedor = !emp.vendedorAsignado
      } else if (vendedorFilter !== 'todos') {
        matchesVendedor = emp.vendedorAsignado === vendedorFilter
      }

      const empRubro = emp.rubro ? emp.rubro.trim().toUpperCase() : 'SIN RUBRO'
      const matchesRubro = rubroFilter === 'todos' || empRubro === rubroFilter.toUpperCase()

      return matchesSearch && matchesEstado && matchesZona && matchesVendedor && matchesRubro
    })
    
    // Order: Activos -> Prospectos -> Bajas -> Descartadas
    const estadoOrder: Record<string, number> = {
      'activo': 1,
      'prospecto': 2,
      'baja': 3,
      'descartada': 4
    }

    return result.sort((a, b) => {
      const orderA = estadoOrder[a.estado] || 99
      const orderB = estadoOrder[b.estado] || 99
      if (orderA !== orderB) return orderA - orderB
      return a.nombre.localeCompare(b.nombre)
    })
  }, [empresas, searchQuery, estadoFilter, zonaFilter, vendedorFilter, rubroFilter])

  // Alertas Globales
  const empresasSinZona = useMemo(() => empresas.filter(e => !e.zona || e.zona.trim() === ''), [empresas])
  const empresasSinVendedor = useMemo(() => empresas.filter(e => !e.vendedorAsignado || e.vendedorAsignado.trim() === ''), [empresas])

  return (
    <div className="animate-fade-in pb-12">
      <div className="page-header">
        <div>
          <h1 className="page-title">Directorio Global de Empresas</h1>
          <p className="page-subtitle">Visualización unificada de todas las zonas y vendedores.</p>
        </div>
      </div>

      {userNivel === 1 && solicitudes.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
          <h3 className="text-orange-400 font-bold mb-3 flex items-center gap-2">
            <AlertTriangle size={18} /> Solicitudes de Reasignación de Nivel 2
          </h3>
          <div className="flex flex-col gap-2">
            {solicitudes.map(s => (
              <div key={s.id} className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-white/5">
                <div className="text-sm">
                  El supervisor <span className="font-bold text-primary">{s.solicitadoPor}</span> solicita asignar la empresa <span className="font-bold text-white">{s.empresaNombre}</span> (actual: {s.zonaOrigen || 'Sin Zona'}) a la zona <span className="font-bold text-green-400">{s.zonaDestino}</span> con el vendedor <span className="font-bold text-green-400">{s.vendedorDestino}</span>.
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAprobarSolicitud(s.id, true)} className="p-1.5 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white rounded-md transition-colors" title="Aprobar"><CheckCircle size={18} /></button>
                  <button onClick={() => handleAprobarSolicitud(s.id, false)} className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-md transition-colors" title="Rechazar"><XCircle size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(empresasSinZona.length > 0 || empresasSinVendedor.length > 0) && (
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          {empresasSinZona.length > 0 && (
            <div 
              className="flex-1 p-4 rounded-xl bg-red-500/10 border border-red-500/30 cursor-pointer hover:bg-red-500/20 transition-colors"
              onClick={() => { setZonaFilter('SIN ASIGNAR'); setVendedorFilter('todos'); }}
            >
              <div className="flex items-center gap-3 text-red-400 mb-1">
                <AlertTriangle size={20} />
                <h3 className="font-bold">Empresas sin Zona</h3>
              </div>
              <p className="text-sm text-red-300/80 ml-8">Hay {empresasSinZona.length} empresas que no pertenecen a ninguna zona principal.</p>
            </div>
          )}
          {empresasSinVendedor.length > 0 && (
            <div 
              className="flex-1 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 cursor-pointer hover:bg-yellow-500/20 transition-colors"
              onClick={() => { setVendedorFilter('sin_vendedor'); setZonaFilter('todas'); }}
            >
              <div className="flex items-center gap-3 text-yellow-400 mb-1">
                <AlertTriangle size={20} />
                <h3 className="font-bold">Empresas sin Vendedor</h3>
              </div>
              <p className="text-sm text-yellow-300/80 ml-8">Hay {empresasSinVendedor.length} empresas que no tienen vendedor asignado.</p>
            </div>
          )}
        </div>
      )}

      <div className="glass-panel card mb-8">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="form-group flex-1 min-w-[200px] mb-0">
            <label className="form-label">Buscar Empresa</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-2.5 text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nombre, dirección..."
                className="form-input pl-10"
              />
            </div>
          </div>

          <div className="form-group mb-0">
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
                  className={`btn ${estadoFilter === tab.id ? 'btn-primary' : 'btn-secondary'} px-4 py-2 text-sm`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="form-label mb-2 block">Zona Principal</label>
            <select 
              value={zonaFilter} 
              onChange={e => setZonaFilter(e.target.value)}
              className="form-input"
            >
              <option value="todas">Todas las zonas</option>
              <option value="SIN ASIGNAR">Sin Zona Asignada</option>
              {zonasBase.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label mb-2 block">Vendedor Asignado</label>
            <select 
              value={vendedorFilter} 
              onChange={e => setVendedorFilter(e.target.value)}
              className="form-input"
            >
              <option value="todos">Todos los vendedores</option>
              <option value="sin_vendedor">Sin Vendedor Asignado</option>
              {vendedores.map(v => (
                <option key={v.alias} value={v.alias}>{v.nombre} ({v.zona || 'Sin Zona'})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="hidden md:block table-container">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Zona / Ubicación</th>
              <th>Contacto</th>
              <th>Vendedor Asig.</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmpresas.map(emp => (
              <tr key={emp.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-secondary" />
                    <div>
                      <div className="font-medium text-sm text-white">{emp.nombre}</div>
                      <div className="text-[10px] text-secondary">Añadido {new Date(emp.creadoEn).toLocaleDateString()}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="text-xs text-white">{emp.zona || 'SIN ZONA'}</div>
                  <div className="text-[10px] text-secondary mt-1">{emp.barrio || 'Sin barrio'} • {emp.subZona || 'Sin Mini-zona'}</div>
                </td>
                <td>
                  <div className="text-xs flex flex-col gap-1">
                    {emp.telefono ? (
                      <span className="flex items-center gap-1.5"><Phone size={12} className="text-blue-400"/> {emp.telefono}</span>
                    ) : '-'}
                  </div>
                </td>
                <td>
                  {emp.vendedorAsignado ? (
                    <span className="text-xs font-bold text-primary px-2 py-1 bg-primary/10 rounded-md border border-primary/20">{emp.vendedorAsignado}</span>
                  ) : (
                    <span className="text-[10px] font-black uppercase text-yellow-500 px-2 py-1 bg-yellow-500/10 rounded-md border border-yellow-500/20">Sin asignar</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${
                    emp.estado === 'activo' ? 'badge-success' : 
                    emp.estado === 'descartada' ? 'badge-danger' :
                    emp.estado === 'baja' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    'badge-warning'
                  } text-[10px] px-2 py-0.5`}>
                    {emp.estado.toUpperCase()}
                  </span>
                </td>
                <td>
                  <Link 
                    href={`/zonas/${emp.zona || 'CABA'}/empresas/${emp.id}?origen=global`} 
                    className="btn btn-secondary text-[11px] px-3 py-1.5"
                  >
                    Ver Ficha
                  </Link>
                </td>
              </tr>
            ))}
            {filteredEmpresas.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center p-8 text-secondary">No hay resultados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Mobile view omitted for brevity but uses same principles */}
      <div className="md:hidden flex flex-col gap-3">
        {filteredEmpresas.map(emp => (
          <Link
            key={emp.id}
            href={`/zonas/${emp.zona || 'CABA'}/empresas/${emp.id}?origen=global`}
            className="block p-4 rounded-xl bg-black/20 border border-white/5"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-white font-bold text-sm leading-tight">{emp.nombre}</h3>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase whitespace-nowrap ${emp.estado === 'activo' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                {emp.estado}
              </span>
            </div>
            <div className="text-[10px] text-secondary mt-1">
              Zona: {emp.zona || 'SIN ZONA'} | Vendedor: <span className={emp.vendedorAsignado ? "text-primary font-bold" : "text-yellow-500 font-bold"}>{emp.vendedorAsignado || 'SIN ASIGNAR'}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
