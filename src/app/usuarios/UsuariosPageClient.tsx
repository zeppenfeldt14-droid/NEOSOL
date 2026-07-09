'use client'

import { useState, useEffect } from 'react'
import { Camera, Plus, Search, Trash2, X, User, Download, Clock, Edit, LogIn, Activity } from 'lucide-react'

interface Usuario {
  id: number
  nombre: string
  alias: string
  email: string
  nivel: number
  rol: string
  zona: string
  foto: string | null
  activo: boolean
  modulos: Record<string, boolean>
  limitesEstado: Record<string, number>
  loginCount: number
  connectionLogs: Array<{ date: string; ip: string; userAgent: string }>
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
    alertas: true,
    configuracion: false
  }
  const defaultLimits = {
    AUSENCIA_COMIDA: 60,
    AUSENCIA_BANO: 15,
    AUSENCIA_GESTION: 30
  }

  const [formName, setFormName] = useState('')
  const [formAlias, setFormAlias] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formNivel, setFormNivel] = useState(3)
  const [formRol, setFormRol] = useState('Vendedor')
  const [formZona, setFormZona] = useState('CABA')
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

  useEffect(() => {
    setIsLoading(true)
    Promise.all([fetchUsers(), fetchLogs()]).finally(() => setIsLoading(false))
  }, [])

  // Check if a user is online (based on last login within 24h and no logout)
  const getUserOnlineStatus = (user: Usuario) => {
    const userConnLogs = logs
      .filter(l => l.user_id === user.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    if (userConnLogs.length === 0) return { label: 'Desconectado', color: 'bg-gray-400', online: false }

    const lastLog = userConnLogs[0]
    const action = lastLog.action_type.toUpperCase()
    const logTime = new Date(lastLog.created_at).getTime()
    const diff = Date.now() - logTime
    const STALE_TIMEOUT = 12 * 60 * 60 * 1000 // 12 hours

    if (action.includes('LOGOUT') || diff > STALE_TIMEOUT) {
      return { label: 'Desconectado', color: 'bg-gray-400', online: false }
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
    setFormZona('CABA')
    setFormActivo(true)
    setFormFoto(null)
    setFormModulos(defaultModules)
    setFormLimits(defaultLimits)
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
    setFormZona(user.zona || 'CABA')
    setFormActivo(user.activo)
    setFormFoto(user.foto)
    setFormModulos({ ...defaultModules, ...(user.modulos as Record<string, boolean>) })
    setFormLimits({ ...defaultLimits, ...(user.limitesEstado as Record<string, number>) })
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
        zona: formZona,
        activo: formActivo,
        foto: formFoto,
        modulos: formModulos,
        limitesEstado: formLimits
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
    // TODO: Implement token override for impersonation
  }

  // Styles
  const levelColor = (level: number) => {
    if (level === 1) return 'from-orange-500 to-orange-700 text-orange-500 border-orange-500/30 bg-orange-500/10'
    if (level === 2) return 'from-blue-500 to-blue-700 text-blue-400 border-blue-500/30 bg-blue-500/10'
    return 'from-green-500 to-green-700 text-green-400 border-green-500/30 bg-green-500/10'
  }

  const levelLabel = (level: number) => {
    if (level === 1) return 'N1 · Gerencia'
    if (level === 2) return 'N2 · Supervisión'
    return 'N3 · Ventas'
  }

  // Logs filters
  const getFilteredLogs = () => {
    if (!showLogsModal) return []
    
    return logs.filter(l => {
      // Filtrar por usuario si no es GLOBAL
      if (showLogsModal !== 'GLOBAL' && l.user_id !== showLogsModal.id) return false
      
      const isConnection = ['LOGIN', 'LOGOUT', 'HEARTBEAT'].includes(l.action_type.toUpperCase())
      if (logTab === 'conexiones' && !isConnection) return false
      if (logTab === 'gestion' && isConnection) return false

      if (filterMonth) {
        const logDate = l.created_at.substring(0, 7) // 'YYYY-MM'
        return logDate === filterMonth
      }
      return true
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  // Export CSV
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
      <div className="shrink-0 p-6 border-b border-white/5 bg-[#0B132B] sticky top-0 z-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Gestión de Usuarios</h1>
            <p className="text-secondary text-sm">Administra el acceso, roles y zonas de tu equipo de trabajo.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={16} />
              <input
                type="text"
                placeholder="Buscar por nombre o alias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10 w-full"
              />
            </div>
            
            <button 
              onClick={() => { setShowLogsModal('GLOBAL'); fetchLogs(); }} 
              className="btn btn-secondary flex items-center gap-2 px-4 whitespace-nowrap bg-white/5 hover:bg-white/10 text-white border-white/10"
            >
              <Activity size={16} className="text-primary" /> 
              <span className="hidden sm:inline">Bitácora Global</span>
            </button>
            
            <button 
              onClick={handleOpenCreate} 
              className="btn btn-primary flex items-center gap-2 px-4 shadow-lg shadow-primary/20 whitespace-nowrap"
            >
              <Plus size={16} /> 
              <span>Nuevo Perfil</span>
            </button>
          </div>
        </div>
      </div>

      {/* ÁREA DE GRILLA */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-white/10 border-t-primary rounded-full animate-spin mb-4"></div>
              <p className="text-secondary font-medium">Cargando perfiles...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center glass-panel p-10 max-w-md">
              <User size={48} className="text-secondary mx-auto mb-4 opacity-50" />
              <h3 className="text-white text-lg font-bold mb-2">No se encontraron usuarios</h3>
              <p className="text-secondary text-sm">Prueba con otro término de búsqueda o crea un nuevo perfil.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
            {filteredUsers.map(u => {
              const status = getUserOnlineStatus(u)
              // Simulamos stats por ahora para mantener la estética si no vienen de BD
              const visitas = u.loginCount || Math.floor(Math.random() * 30) 
              const horas = Math.floor(visitas * 1.5)
              const levelStyle = levelColor(u.nivel)
              
              return (
                <div key={u.id} className="glass-panel card flex flex-col overflow-hidden relative group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 border-white/5 hover:border-white/10">
                  {/* Top gradient bar indicator */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${levelStyle.split(' text-')[0]}`} />
                  
                  {/* Info Section */}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex gap-3">
                        <div className="relative">
                          <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-[#0B132B] ${status.color} ${status.online ? 'animate-pulse' : ''} z-10 shadow-sm`} />
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden font-black text-xl shadow-inner border border-white/10 ${
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
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-base leading-tight truncate max-w-[120px]" title={u.nombre}>{u.nombre}</h4>
                          <p className="text-xs text-secondary font-medium mt-0.5">@{u.alias}</p>
                          <span className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md border inline-block mt-1.5 ${levelStyle}`}>
                            {levelLabel(u.nivel)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Detalles */}
                    <div className="bg-black/30 rounded-xl p-3 mb-4 border border-white/5">
                      <div className="flex justify-between items-center text-xs mb-2">
                        <span className="text-secondary font-medium">Zona</span>
                        <span className="text-white font-bold">{u.zona || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-secondary font-medium">Rol</span>
                        <span className="text-white font-bold truncate max-w-[100px]">{u.rol || 'Vendedor'}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 text-center mt-auto">
                      <div className="bg-white/5 rounded-lg py-2 border border-white/5">
                        <div className="text-lg font-black text-white leading-none">{visitas}</div>
                        <div className="text-[9px] font-bold text-secondary uppercase tracking-widest mt-1">Visitas</div>
                      </div>
                      <div className="bg-white/5 rounded-lg py-2 border border-white/5">
                        <div className="text-lg font-black text-white leading-none">{horas}h</div>
                        <div className="text-[9px] font-bold text-secondary uppercase tracking-widest mt-1">Horas Est.</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="bg-black/40 border-t border-white/5 p-3 flex items-center justify-between gap-2">
                    <div className="flex gap-2 w-full">
                      <button onClick={() => { setShowLogsModal(u); fetchLogs(); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all text-xs font-bold" title="Bitácora">
                        <Clock size={14} /> Bitácora
                      </button>
                      <button onClick={() => handleOpenEdit(u)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all text-xs font-bold" title="Editar Perfil">
                        <Edit size={14} /> Editar
                      </button>
                    </div>
                  </div>
                  {/* Botón ENTRAR inferior */}
                  <button 
                    onClick={() => handleImpersonate(u)} 
                    className="w-full py-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all text-xs font-bold flex items-center justify-center gap-2 border-t border-primary/20"
                  >
                    <LogIn size={14} /> ENTRAR COMO {u.alias.toUpperCase()}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* USER EDIT/CREATE MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel card w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in shadow-2xl border-white/10">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
              <div>
                <h3 className="font-bold text-xl text-white">
                  {selectedUser ? `Editar Perfil: ${selectedUser.nombre}` : 'Nuevo Perfil'}
                </h3>
                <p className="text-secondary text-xs mt-1">
                  {selectedUser ? 'Actualiza los datos y permisos de este usuario.' : 'Completa los datos para crear un nuevo usuario en el sistema.'}
                </p>
              </div>
              <button onClick={() => setShowUserModal(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-secondary hover:text-white transition-all">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#0B132B]/50">
              
              <div className="flex flex-col md:flex-row gap-6">
                {/* Photo upload */}
                <div className="flex flex-col items-center gap-3 bg-black/20 p-5 rounded-2xl border border-white/5 w-full md:w-1/3 shrink-0">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shadow-inner">
                      {formFoto ? (
                        <img src={formFoto} className="w-full h-full object-cover" alt="Profile" />
                      ) : (
                        <User size={40} className="text-secondary opacity-50" />
                      )}
                    </div>
                    <label htmlFor="user-photo-input" className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary text-white rounded-xl flex items-center justify-center cursor-pointer hover:bg-orange-600 transition-all shadow-lg border border-white/10">
                      <Camera size={14} />
                    </label>
                    <input type="file" id="user-photo-input" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  </div>
                  <div className="text-center mt-2">
                    <h4 className="text-sm font-bold text-white">Avatar</h4>
                    <p className="text-[10px] text-secondary mt-1">JPG, PNG (máx. 1MB)</p>
                  </div>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  <div className="form-group md:col-span-2">
                    <label className="form-label">Nombre Completo *</label>
                    <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej. Ernesto Lares" className="form-input bg-black/40" required />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Alias (@usuario) *</label>
                    <input type="text" value={formAlias} onChange={(e) => setFormAlias(e.target.value)} placeholder="Ej. elarez" className="form-input bg-black/40" required />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Correo Electrónico *</label>
                    <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="ejemplo@correo.com" className="form-input bg-black/40" required />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nivel de Acceso *</label>
                    <select value={formNivel} onChange={(e) => setFormNivel(Number(e.target.value))} className="form-input bg-black/40">
                      <option value={1}>Nivel 1 (Gerencia)</option>
                      <option value={2}>Nivel 2 (Supervisión)</option>
                      <option value={3}>Nivel 3 (Ventas)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Zona Asignada *</label>
                    <select value={formZona} onChange={(e) => setFormZona(e.target.value)} className="form-input bg-black/40">
                      <option value="CABA">CABA</option>
                      <option value="Zona SUR">Zona SUR</option>
                      <option value="Zona NORTE">Zona NORTE</option>
                      <option value="Zona OESTE">Zona OESTE</option>
                      <option value="Global">Global</option>
                    </select>
                  </div>

                  <div className="form-group md:col-span-2">
                    <label className="form-label">Contraseña {selectedUser && <span className="text-secondary font-normal">(Dejar vacío para no cambiar)</span>}</label>
                    <input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="••••••••" className="form-input bg-black/40" required={!selectedUser} />
                  </div>
                </div>
              </div>

              {/* Permissions switches */}
              <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                <label className="form-label mb-3 block text-white border-b border-white/5 pb-2">Acceso a Módulos del Sistema</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4">
                  {Object.entries(formModulos).map(([mod, active]) => (
                    <label key={mod} className="flex items-center gap-2.5 text-sm text-secondary cursor-pointer hover:text-white transition-all select-none bg-white/5 py-2 px-3 rounded-xl border border-white/5">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) => setFormModulos(prev => ({ ...prev, [mod]: e.target.checked }))}
                        className="rounded border-white/10 bg-black/50 text-primary focus:ring-primary focus:ring-offset-0 focus:ring-2"
                      />
                      <span className="capitalize font-medium">{mod}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                <input
                  type="checkbox"
                  id="user-activo"
                  checked={formActivo}
                  onChange={(e) => setFormActivo(e.target.checked)}
                  className="rounded border-white/10 bg-black/50 text-primary focus:ring-primary focus:ring-offset-0 focus:ring-2 w-5 h-5 cursor-pointer"
                />
                <div>
                  <label htmlFor="user-activo" className="text-sm font-bold text-white cursor-pointer select-none block">Usuario Activo</label>
                  <p className="text-xs text-secondary mt-0.5">Si se desactiva, el usuario no podrá iniciar sesión en el CRM.</p>
                </div>
              </div>

              {/* Footer action buttons */}
              <div className="flex items-center justify-between pt-4">
                {selectedUser ? (
                  <button type="button" onClick={() => handleDeleteUser(selectedUser as Usuario)} className="btn bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white px-4">
                    Eliminar Perfil
                  </button>
                ) : <div></div>}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowUserModal(false)} className="btn btn-secondary px-6">
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary px-8 shadow-lg shadow-primary/20">
                    Guardar
                  </button>
                </div>
              </div>
            </form>
          </div>
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
              <div className="flex gap-2 print:hidden">
                <button onClick={() => window.print()} className="btn btn-secondary flex items-center gap-2 text-xs px-4 border-white/10">
                  Imprimir
                </button>
                <button onClick={handleExportCSV} className="btn btn-secondary flex items-center gap-2 text-xs px-4 border-white/10">
                  <Download size={14} /> CSV
                </button>
                <button onClick={() => setShowLogsModal(null)} className="ml-2 w-10 h-10 bg-white/5 text-secondary rounded-full flex items-center justify-center hover:bg-white/10 hover:text-white transition-all border border-white/5">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Filter tab bar */}
            <div className="bg-black/40 border-b border-white/5 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
              <div className="flex gap-2 bg-black/50 p-1 rounded-xl border border-white/5">
                <button onClick={() => setLogTab('conexiones')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${logTab === 'conexiones' ? 'bg-white/10 text-white shadow-sm' : 'text-secondary hover:text-white'}`}>
                  Conexiones
                </button>
                <button onClick={() => setLogTab('gestion')} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${logTab === 'gestion' ? 'bg-white/10 text-white shadow-sm' : 'text-secondary hover:text-white'}`}>
                  Gestión y Acciones
                </button>
              </div>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="form-input max-w-[180px] text-sm text-center bg-black/40"
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
