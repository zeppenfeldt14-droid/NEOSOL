'use client'

import { useState, useEffect } from 'react'
import { Camera, Plus, Search, Trash2, X, User, Download, Clock, Edit, LogIn, Activity, Check, Shield, Printer } from 'lucide-react'

interface Usuario {
  id: number
  nombre: string
  alias: string
  email: string
  nivel: number
  rol: string
  foto: string | null
  activo: boolean
  modulos: Record<string, boolean>
  limitesEstado: Record<string, number>
  loginCount: number
  connectionLogs: Array<{ date: string; ip: string; userAgent: string }>
  zona: string | null
  zonasHabilitadas: any
}

interface LogEntry {
  id: number
  user_id: number
  user_name: string
  user_alias: string
  action_type: string
  details: string
  created_at: string
}

export function UsuariosPageClient({ currentUser }: { currentUser: any }) {
  const [users, setUsers] = useState<Usuario[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Modals
  const [showUserModal, setShowUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Partial<Usuario> | null>(null)
  const [showLogsModal, setShowLogsModal] = useState<Usuario | 'GLOBAL' | null>(null)
  const [logTab, setLogTab] = useState<'conexiones' | 'gestion'>('conexiones')
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7))

  // New/Edit User Form States
  const defaultModules = {
    empresas: true,
    visitas: true,
    planificador: true,
    reportes: true,
    configuracion: false
  }
  const defaultLimits = {
    AUSENCIA_COMIDA: 60,
    AUSENCIA_BANO: 15,
    AUSENCIA_GESTION: 30,
    horasObjetivo: 8,
    metaVentas: 100000
  }

  const [zones, setZones] = useState<string[]>(['CABA', 'SUR', 'NORTE', 'OESTE'])
  const [formZona, setFormZona] = useState('CABA')
  const [formZonasHabilitadas, setFormZonasHabilitadas] = useState<string[]>([])

  const [formName, setFormName] = useState('')
  const [formAlias, setFormAlias] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formNivel, setFormNivel] = useState(3)
  const [formRol, setFormRol] = useState('Vendedor')
  const [formActivo, setFormActivo] = useState(true)
  const [formFoto, setFormFoto] = useState<string | null>(null)
  const [formModulos, setFormModulos] = useState<Record<string, boolean>>(defaultModules)
  const [formLimits, setFormLimits] = useState<Record<string, number>>(defaultLimits)

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/usuarios')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (e) {
      console.error('Error fetching users:', e)
    }
  }

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs')
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
      }
    } catch (e) {
      console.error('Error fetching logs:', e)
    }
  }

  const fetchZones = async () => {
    try {
      const res = await fetch('/api/zonas')
      if (res.ok) {
        const data = await res.json()
        setZones(data.map((z: any) => z.nombre))
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    setIsLoading(true)
    Promise.all([fetchUsers(), fetchLogs(), fetchZones()]).finally(() => setIsLoading(false))
  }, [])

  // Check if a user is online
  const getUserOnlineStatus = (user: Usuario) => {
    const userConnLogs = logs
      .filter(l => l.user_id === user.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    if (userConnLogs.length === 0) return { label: 'Desconectado', color: 'bg-gray-500', online: false }

    const lastLog = userConnLogs[0]
    const action = lastLog.action_type.toUpperCase()
    const logTime = new Date(lastLog.created_at).getTime()
    const diff = Date.now() - logTime
    const STALE_TIMEOUT = 12 * 60 * 60 * 1000

    if (action.includes('LOGOUT') || diff > STALE_TIMEOUT) {
      return { label: 'Desconectado', color: 'bg-gray-500', online: false }
    }

    return { label: 'En línea', color: 'bg-green-500', online: true }
  }

  // Open modal for creation
  const handleOpenCreate = () => {
    setSelectedUser(null)
    setFormName('')
    setFormAlias('')
    setFormEmail('')
    setFormPassword('')
    setFormNivel(3)
    setFormRol('Vendedor')
    setFormActivo(true)
    setFormFoto(null)
    setFormModulos(defaultModules)
    setFormLimits(defaultLimits)
    setFormZona('CABA')
    setFormZonasHabilitadas([])
    setShowUserModal(true)
  }

  // Open modal for edit
  const handleOpenEdit = (user: Usuario) => {
    setSelectedUser(user)
    setFormName(user.nombre)
    setFormAlias(user.alias)
    setFormEmail(user.email)
    setFormPassword('')
    setFormNivel(user.nivel)
    setFormRol(user.rol || 'Vendedor')
    setFormActivo(user.activo)
    setFormFoto(user.foto)
    setFormModulos({ ...defaultModules, ...(user.modulos as Record<string, boolean>) })
    setFormLimits({ ...defaultLimits, ...(user.limitesEstado as Record<string, number>) })
    setFormZona(user.zona || 'CABA')
    let enabled: string[] = []
    try {
      if (user.zonasHabilitadas) {
        enabled = typeof user.zonasHabilitadas === 'string'
          ? JSON.parse(user.zonasHabilitadas)
          : JSON.parse(JSON.stringify(user.zonasHabilitadas))
      }
    } catch (e) {}
    setFormZonasHabilitadas(enabled)
    setShowUserModal(true)
  }

  // Photo change handler
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormFoto(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Save user (Create/Update)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName || !formAlias || !formEmail) {
      alert('Por favor completa todos los campos obligatorios.')
      return
    }

    if (!selectedUser && !formPassword) {
      alert('La contraseña es obligatoria para nuevos perfiles.')
      return
    }

    try {
      const payload = {
        id: selectedUser?.id || null,
        nombre: formName,
        alias: formAlias,
        email: formEmail,
        password: formPassword || null,
        nivel: formNivel,
        rol: formRol,
        activo: formActivo,
        foto: formFoto,
        modulos: formModulos,
        limitesEstado: formLimits,
        zona: formZona,
        zonasHabilitadas: formZonasHabilitadas
      }

      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        alert(selectedUser ? 'Perfil actualizado' : 'Perfil creado con éxito')
        setShowUserModal(false)
        fetchUsers()
      } else {
        const err = await res.json()
        alert(`Error: ${err.error || 'No se pudo guardar el usuario.'}`)
      }
    } catch (e) {
      console.error(e)
      alert('Error de conexión al servidor.')
    }
  }

  // Delete User
  const handleDeleteUser = async (user: Usuario) => {
    if (!confirm(`¿Estás completamente seguro de que deseas eliminar permanentemente al usuario ${user.nombre} (@${user.alias})?`)) {
      return
    }

    try {
      const res = await fetch(`/api/usuarios/${user.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        alert('Usuario eliminado')
        fetchUsers()
      } else {
        const err = await res.json()
        alert(`Error: ${err.error}`)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Impersonate User
  const handleImpersonate = (user: Usuario) => {
    alert('Función de Entrar como Usuario en desarrollo. 🚧')
  }

  // Styles
  const levelColor = (level: number) => {
    if (level === 1) return 'bg-orange-500/20 text-orange-400'
    if (level === 2) return 'bg-blue-500/20 text-blue-400'
    return 'bg-green-500/20 text-green-400'
  }
  const levelBadge = (level: number) => {
    if (level === 1) return 'bg-orange-500 text-white'
    if (level === 2) return 'bg-blue-500 text-white'
    return 'bg-green-500 text-white'
  }
  const levelLabel = (level: number) => {
    if (level === 1) return 'N1 - Gerencia'
    if (level === 2) return 'N2 - Supervisión'
    return 'N3 - Ventas'
  }

  const getFilteredLogs = () => {
    if (!showLogsModal) return []
    return logs.filter(l => {
      if (showLogsModal !== 'GLOBAL' && l.user_id !== showLogsModal.id) return false
      const isConnection = ['LOGIN', 'LOGOUT', 'HEARTBEAT'].includes(l.action_type.toUpperCase())
      if (logTab === 'conexiones' && !isConnection) return false
      if (logTab === 'gestion' && isConnection) return false
      if (filterMonth) {
        const logDate = l.created_at.substring(0, 7)
        return logDate === filterMonth
      }
      return true
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  const handleExportCSV = () => {
    const entries = getFilteredLogs()
    if (!entries.length) return
    const headers = 'Fecha,Tipo,Usuario,Detalle\n'
    const rows = entries
      .map(e => `"${new Date(e.created_at).toLocaleString() || ''}","${e.action_type}","${e.user_alias}","${e.details.replace(/"/g, '""')}"`)
      .join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bitacora_${showLogsModal === 'GLOBAL' ? 'global' : (showLogsModal?.alias || 'usuario')}_${filterMonth || 'todo'}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const filteredUsers = users.filter(u =>
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.alias.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B132B]">
      {/* HEADER PRINCIPAL */}
      <div className="shrink-0 px-8 py-5 border-b border-white/5 bg-[#0B132B] sticky top-0 z-10">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-primary border border-white/10">
              <User size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">Usuarios</h1>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={16} />
              <input
                type="text"
                placeholder="Buscar por nombre o alias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-secondary/70"
              />
            </div>
            
            <button 
              onClick={() => { setShowLogsModal('GLOBAL'); fetchLogs(); }} 
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black/40 hover:bg-white/10 text-white border border-white/10 transition-all text-sm font-medium"
            >
              <Activity size={16} className="text-primary" /> 
              <span className="hidden sm:inline">Bitácora Global</span>
            </button>
            
            <button 
              onClick={handleOpenCreate} 
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary hover:bg-orange-600 text-white shadow-lg shadow-primary/20 transition-all text-sm font-bold"
            >
              <Plus size={16} /> 
              <span>Nuevo Perfil</span>
            </button>
          </div>
        </div>
      </div>

      {/* ÁREA DE GRILLA (ORDENADO UNO AL LADO DEL OTRO) */}
      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-3 border-white/10 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-50">
            <User size={48} className="text-secondary mb-4" />
            <h3 className="text-white font-medium">No se encontraron usuarios</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-20">
            {filteredUsers.map(u => {
              const status = getUserOnlineStatus(u)
              return (
                <div key={u.id} className="glass-panel card flex flex-col relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 border-white/5 hover:border-white/10" style={{ padding: '1.25rem' }}>
                  {/* Top colored indicator bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                    u.nivel === 1 ? 'bg-orange-500' : 
                    u.nivel === 2 ? 'bg-blue-500' : 
                    'bg-green-500'
                  }`} />
                  
                  {/* Top content: Avatar + Info */}
                  <div className="flex gap-3 items-center mb-3">
                    <div className="relative flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg overflow-hidden border border-white/10 ${
                        u.nivel === 1 ? 'bg-orange-500/20 text-orange-400' : 
                        u.nivel === 2 ? 'bg-blue-500/20 text-blue-400' : 
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {u.foto ? (
                          <img src={u.foto} className="w-full h-full object-cover" alt={u.nombre} />
                        ) : (
                          u.nombre.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0B132B] ${status.color}`}></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm truncate" title={u.nombre}>{u.nombre}</h4>
                      <p className="text-xs text-secondary font-medium truncate">@{u.alias}</p>
                      <p className="text-[10px] text-secondary/60 truncate">{u.email}</p>
                    </div>
                  </div>

                  {/* Badges row */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 truncate max-w-[120px]">
                      {u.rol || 'Vendedor'}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      u.nivel === 1 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 
                      u.nivel === 2 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                      'bg-green-500/10 text-green-400 border border-green-500/20'
                    }`}>
                      {levelLabel(u.nivel)}
                    </span>
                    {u.nivel === 3 ? (
                      <span className="text-[9px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                        📍 {u.zona || 'CABA'}
                      </span>
                    ) : (
                      (() => {
                        let enabled: string[] = []
                        try {
                          if (u.zonasHabilitadas) {
                            enabled = typeof u.zonasHabilitadas === 'string'
                              ? JSON.parse(u.zonasHabilitadas)
                              : JSON.parse(JSON.stringify(u.zonasHabilitadas))
                          }
                        } catch (e) {}
                        if (enabled && enabled.length > 0) {
                          return (
                            <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 animate-fade-in" title={enabled.join(', ')}>
                              📍 {enabled.join(', ')}
                            </span>
                          )
                        }
                        return null
                      })()
                    )}
                  </div>

                  {/* Stats Row (3 Columns like Margarita Viajes) */}
                  <div className="grid grid-cols-3 gap-2 bg-black/35 rounded-xl p-2.5 border border-white/5 mb-4 text-center">
                    <div>
                      <div className="text-[10px] font-bold text-secondary uppercase tracking-wider">Visitas</div>
                      <div className="text-primary font-black text-sm mt-0.5">{u.loginCount || 0}</div>
                    </div>
                    <div className="border-x border-white/5">
                      <div className="text-[10px] font-bold text-secondary uppercase tracking-wider">Hrs Obj</div>
                      <div className="text-blue-400 font-black text-sm mt-0.5">{Math.floor((u.loginCount || 0) * 1.5)}h</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-secondary uppercase tracking-wider">Estado</div>
                      <div className={`text-xs font-bold mt-1 ${u.activo ? 'text-green-400' : 'text-red-400'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-auto">
                    <button 
                      onClick={() => { setShowLogsModal(u); fetchLogs(); }} 
                      className="btn btn-secondary flex-1 text-xs px-2"
                    >
                      <Clock size={14} /> Bitácora
                    </button>
                    <button 
                      onClick={() => handleOpenEdit(u)} 
                      className="btn btn-secondary flex-1 text-xs px-2"
                    >
                      <Edit size={14} /> Editar
                    </button>
                    <button 
                      onClick={() => handleImpersonate(u)} 
                      className="btn btn-secondary text-xs px-3"
                      title="Entrar como usuario"
                    >
                      <LogIn size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* USER EDIT/CREATE MODAL - VISTA DIVIDIDA */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveUser} className="w-full max-w-6xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden animate-fade-in shadow-2xl rounded-3xl border border-white/10 bg-[#0B132B]">
            
            {/* Columna Izquierda: Perfil (Oscura) */}
            <div className="md:w-1/3 bg-[#0B132B] flex flex-col justify-between border-r border-white/10 relative p-8 overflow-y-auto min-h-0">
              
              <div className="absolute top-4 right-4 md:hidden">
                <button type="button" onClick={() => setShowUserModal(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white">
                  <X size={16} />
                </button>
              </div>

              <div>
                <h3 className="font-black text-xl text-white italic tracking-tight mb-8">
                  {selectedUser ? 'EDITAR PERFIL' : 'NUEVO PERFIL'}
                </h3>
                
                <div className="flex flex-col items-center text-center mt-6">
                  <div className="relative mb-4 group">
                    <div className="w-28 h-28 rounded-full bg-white/5 border-4 border-[#0B132B] outline outline-1 outline-white/20 flex items-center justify-center overflow-hidden shadow-xl">
                      {formFoto ? (
                        <img src={formFoto} className="w-full h-full object-cover" alt="Profile" />
                      ) : (
                        <User size={48} className="text-secondary/50" />
                      )}
                    </div>
                    <label htmlFor="user-photo-input" className="absolute bottom-0 right-0 w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-orange-600 transition-all shadow-lg border-2 border-[#0B132B]">
                      <Camera size={16} />
                    </label>
                    <input type="file" id="user-photo-input" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  </div>
                  
                  <h4 className="text-xl font-bold text-white leading-none">
                    {formName || 'Nombre de Usuario'}
                  </h4>
                  <p className="text-sm text-secondary mt-1 mb-4">
                    @{formAlias || 'alias'}
                  </p>
                  
                  <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${levelBadge(formNivel)} shadow-lg`}>
                    {levelLabel(formNivel)}
                  </div>
                </div>
              </div>

              {/* Botón Guardar y Switch Activo */}
              <div className="mt-12 space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <span className={`text-xs font-bold ${formActivo ? 'text-green-400' : 'text-secondary'}`}>
                    {formActivo ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={formActivo} onChange={(e) => setFormActivo(e.target.checked)} />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
              </div>
            </div>
            
            {/* Columna Derecha: Datos y Permisos (Panel Cristalino Oscuro) */}
            <div className="md:w-2/3 bg-white/[0.03] flex flex-col min-h-0">
              
              <div className="hidden md:flex justify-end p-4 shrink-0">
                <button type="button" onClick={() => setShowUserModal(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-secondary hover:text-white hover:bg-white/10 transition-all border border-white/5">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-6 custom-scrollbar">
                
                <div className="mb-8">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Acceso al Sistema</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="form-group">
                      <label className="form-label">Correo Electrónico *</label>
                      <input 
                        type="email" 
                        value={formEmail} 
                        onChange={(e) => setFormEmail(e.target.value)} 
                        placeholder="ejemplo@correo.com" 
                        className="form-input bg-[#0B132B]/50 border-white/10" 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Contraseña {selectedUser && <span className="text-secondary/50">(Vacío para no cambiar)</span>}
                      </label>
                      <input 
                        type="password" 
                        value={formPassword} 
                        onChange={(e) => setFormPassword(e.target.value)} 
                        placeholder="••••••••" 
                        className="form-input bg-[#0B132B]/50 border-white/10" 
                        required={!selectedUser} 
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-10">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Perfil y Nivel</h4>
                  <div className="bg-black/20 rounded-2xl p-5 border border-white/5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                      <div className="form-group">
                        <label className="form-label">Nombre Completo *</label>
                        <input 
                          type="text" 
                          value={formName} 
                          onChange={(e) => setFormName(e.target.value)} 
                          placeholder="Ej. Ernesto Lares" 
                          className="form-input bg-[#0B132B]/50 border-white/10" 
                          required 
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Alias (Login) *</label>
                        <input 
                          type="text" 
                          value={formAlias} 
                          onChange={(e) => setFormAlias(e.target.value)} 
                          placeholder="Ej. elarez" 
                          className="form-input bg-[#0B132B]/50 border-white/10" 
                          required 
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Rol Asignado *</label>
                        <input 
                          type="text" 
                          value={formRol} 
                          onChange={(e) => setFormRol(e.target.value)} 
                          placeholder="Gerente Operaciones" 
                          className="form-input bg-[#0B132B]/50 border-white/10" 
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Nivel de Acceso *</label>
                        <select 
                          value={formNivel} 
                          onChange={(e) => setFormNivel(Number(e.target.value))} 
                          className="form-input bg-[#0B132B]/50 border-white/10 cursor-pointer"
                        >
                          <option value={1} className="bg-[#0B132B]">Nivel 1 — Total (Gerencia)</option>
                          <option value={2} className="bg-[#0B132B]">Nivel 2 — Supervisión</option>
                          <option value={3} className="bg-[#0B132B]">Nivel 3 — Vendedor</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-10">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Configuración Operativa</h4>
                  <div className="bg-black/20 rounded-2xl p-5 border border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    <div className="form-group">
                      <label className="form-label">Horas Objetivo (al día)</label>
                      <input 
                        type="number" 
                        value={formLimits.horasObjetivo || 8} 
                        onChange={(e) => setFormLimits(prev => ({...prev, horasObjetivo: Number(e.target.value)}))} 
                        className="form-input bg-[#0B132B]/50 border-white/10" 
                        min="1" max="24"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Meta de Ventas Mensual ($)</label>
                      <input 
                        type="number" 
                        value={formLimits.metaVentas || 0} 
                        onChange={(e) => setFormLimits(prev => ({...prev, metaVentas: Number(e.target.value)}))} 
                        className="form-input bg-[#0B132B]/50 border-white/10" 
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Módulos Autorizados</h4>
                  <p className="text-xs text-secondary mb-4">Selecciona los módulos a los que el usuario tendrá acceso.</p>
                  
                  <div className="flex flex-wrap gap-2.5">
                    {Object.entries(formModulos).filter(([mod]) => mod !== 'alertas').map(([mod, active]) => (
                      <button
                        key={mod}
                        type="button"
                        onClick={() => setFormModulos(prev => ({ ...prev, [mod]: !active }))}
                        className={`btn-toggle ${active ? 'active' : ''}`}
                      >
                        {active && <Check size={12} strokeWidth={4} />}
                        {mod.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/5 pt-6 mt-6">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Zonas Autorizadas / Asignadas</h4>
                  
                  {formNivel === 3 ? (
                    <>
                      <p className="text-xs text-secondary mb-4">Selecciona la zona única asignada para este vendedor.</p>
                      <select
                        value={formZona}
                        onChange={(e) => setFormZona(e.target.value)}
                        className="form-input bg-[#0B132B]/50 border-white/10 cursor-pointer max-w-[200px]"
                      >
                        {zones.map(z => (
                          <option key={z} value={z} className="bg-[#0B132B]">{z}</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-secondary mb-4">Selecciona las zonas que el supervisor podrá gestionar.</p>
                      <div className="flex flex-wrap gap-2.5">
                        {zones.map(z => {
                          const active = formZonasHabilitadas.includes(z)
                          return (
                            <button
                              key={z}
                              type="button"
                              onClick={() => {
                                setFormZonasHabilitadas(prev => 
                                  active ? prev.filter(x => x !== z) : [...prev, z]
                                )
                              }}
                              className={`btn-toggle ${active ? 'active' : ''}`}
                            >
                              {active && <Check size={12} strokeWidth={4} />}
                              {z}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>

                {selectedUser && (
                  <div className="mt-12 pt-6 border-t border-white/10 flex justify-end">
                    <button 
                      type="button" 
                      onClick={() => handleDeleteUser(selectedUser as Usuario)} 
                      className="text-xs font-bold text-red-500 hover:text-red-400 underline decoration-dashed underline-offset-4 cursor-pointer"
                    >
                      Eliminar permanentemente este perfil
                    </button>
                  </div>
                )}

              </div>

              {/* Botón Guardar Inferior */}
              <div className="p-4 bg-black/20 border-t border-white/10 shrink-0 flex justify-end">
                <button 
                  type="submit"
                  className="btn btn-primary px-8"
                >
                  Guardar Cambios
                </button>
              </div>

            </div>
          </form>
        </div>
      )}

      {/* LOGS / BITACORA VIEW MODAL */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0">
          <div className="glass-panel card w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in shadow-2xl border-white/10 print:bg-white print:text-black print:max-h-none print:shadow-none print:border-none print:w-full print:h-full">
            
            {/* Header info */}
            <div className="p-6 bg-black/30 border-b border-white/10 flex items-center justify-between shrink-0 print:bg-white print:border-b-2 print:border-black print:pb-4 print:mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center border border-primary/30">
                  {showLogsModal === 'GLOBAL' ? <Activity size={24} /> : <Clock size={24} />}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary print:text-black">Bitácora de Auditoría</span>
                  <h3 className="font-bold text-xl text-white print:text-black mt-0.5">
                    {showLogsModal === 'GLOBAL' ? 'Actividad de Todos los Usuarios' : `@ ${showLogsModal.nombre} (@${showLogsModal.alias})`}
                  </h3>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const win = window.open('', '_blank')
                    if (!win) return
                    const html = `
                      <html><head><title>Bitácora de Actividad</title><style>
                        body { font-family: system-ui, sans-serif; padding: 20px; }
                        table { width: 100%; border-collapse: collapse; font-size: 12px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background: #f5f5f5; }
                      </style></head><body>
                        <h2>Bitácora de Auditoría: ${showLogsModal === 'GLOBAL' ? 'Global' : showLogsModal.nombre}</h2>
                        <table><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead>
                        <tbody>${(showLogsModal === 'GLOBAL' ? logs : logs.filter(l => l.user_id === showLogsModal.id)).map(l => `<tr><td>${new Date(l.created_at).toLocaleString()}</td><td>${l.user_name}</td><td>${l.action_type}</td><td>${l.details}</td></tr>`).join('')}</tbody></table>
                      </body></html>
                    `
                    win.document.write(html)
                    win.document.close()
                  }}
                  className="btn btn-secondary text-xs px-4"
                >
                  <Download size={14} /> Descargar PDF
                </button>
                <button onClick={handleExportCSV} className="btn btn-secondary text-xs px-4">
                  <Download size={14} /> Exportar CSV
                </button>
                <button onClick={() => setShowLogsModal(null)} className="btn-action ml-2 w-10 h-10">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Filter tab bar */}
            <div className="bg-black/40 border-b border-white/5 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
              <div className="flex gap-2 bg-black/30 p-1.5 rounded-xl border border-white/5 inline-flex print:hidden">
                <button onClick={() => setLogTab('conexiones')} className={`btn-toggle ${logTab === 'conexiones' ? 'active' : ''}`}>
                  Historial de Conexiones
                </button>
                <button onClick={() => setLogTab('gestion')} className={`btn-toggle ${logTab === 'gestion' ? 'active' : ''}`}>
                  Bitácora de Gestión
                </button>
              </div>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="form-input max-w-[180px] text-sm text-center bg-black/40 rounded-full"
              />
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#0B132B]/50 custom-scrollbar print:p-0 print:bg-white">
              {getFilteredLogs().length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50 py-20">
                  <Clock size={48} className="text-secondary mb-4" />
                  <div className="text-lg font-bold text-white print:text-black">No hay registros</div>
                  <p className="text-sm text-secondary print:text-black">No se encontró actividad para los filtros seleccionados.</p>
                </div>
              ) : (
                <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden print:border-none print:rounded-none">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-black/40 text-secondary font-black tracking-wider uppercase text-[10px] print:bg-white print:border-b-2 print:border-black print:text-black">
                        <th className="py-4 px-5">Fecha y Hora</th>
                        {showLogsModal === 'GLOBAL' && <th className="py-4 px-5">Usuario</th>}
                        <th className="py-4 px-5">Acción</th>
                        <th className="py-4 px-5">Detalles del Registro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredLogs().map(l => (
                        <tr key={l.id} className="border-t border-white/5 hover:bg-white/5 transition-all print:border-b print:border-black/15 print:hover:bg-transparent">
                          <td className="py-3.5 px-5 text-secondary font-medium print:text-black shrink-0 whitespace-nowrap">
                            {new Date(l.created_at).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                          {showLogsModal === 'GLOBAL' && (
                            <td className="py-3.5 px-5 font-bold text-white print:text-black whitespace-nowrap">
                              @{l.user_alias}
                            </td>
                          )}
                          <td className="py-3.5 px-5 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${l.action_type === 'LOGIN' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : l.action_type === 'LOGOUT' ? 'bg-gray-500/10 text-gray-400 border border-gray-500/20' : 'bg-primary/10 text-primary border border-primary/20'} print:text-black print:bg-transparent print:border-none print:px-0`}>
                              {l.action_type}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-[#e2e8f0] print:text-black">
                            {l.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
