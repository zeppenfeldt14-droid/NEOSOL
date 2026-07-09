'use client'

import { useState, useEffect } from 'react'
import { Camera, Plus, Search, ShieldCheck, Trash2, X, User, Eye, Download, Clock, CheckCircle, Lock, Edit } from 'lucide-react'

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

export function GestionUsuarios() {
  const [users, setUsers] = useState<Usuario[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Modals
  const [showUserModal, setShowUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Partial<Usuario> | null>(null)
  const [showLogsModal, setShowLogsModal] = useState<Usuario | null>(null)
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

    if (action === 'LOGIN') {
      return { label: 'En línea', color: 'bg-green-500', online: true }
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
    setFormRol(user.rol)
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
        setShowUserModal(false)
        fetchUsers()
      } else {
        const err = await res.json()
        alert(`Error: ${err.error || 'No se pudo guardar el usuario.'}`)
      }
    } catch (e) {
      console.error(e)
      alert('Error de conexión.')
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
        fetchUsers()
      } else {
        const err = await res.json()
        alert(`Error: ${err.error}`)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Styles
  const levelColor = (level: number) => {
    if (level === 1) return 'from-orange-500 to-orange-700'
    if (level === 2) return 'from-blue-500 to-blue-700'
    return 'from-teal-500 to-teal-700'
  }

  const levelLabel = (level: number) => {
    if (level === 1) return 'N1 · Gerencia'
    if (level === 2) return 'N2 · Supervisión'
    return 'N3 · Ventas'
  }

  // Logs filters
  const getFilteredLogs = () => {
    if (!showLogsModal) return []
    
    // Scoped logs
    return logs.filter(l => {
      if (l.user_id !== showLogsModal.id) return false
      
      const isConnection = ['LOGIN', 'LOGOUT', 'HEARTBEAT'].includes(l.action_type.toUpperCase())
      if (logTab === 'conexiones' && !isConnection) return false
      if (logTab === 'gestion' && isConnection) return false

      if (filterMonth) {
        const logDate = l.created_at.substring(0, 7) // 'YYYY-MM'
        return logDate === filterMonth
      }
      return true
    })
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
    link.download = `bitacora_${showLogsModal?.alias || 'usuario'}_${filterMonth || 'todo'}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Print Report
  const handlePrint = () => {
    window.print()
  }

  const filteredUsers = users.filter(u =>
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.alias.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Header section with search and add button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre o alias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-10"
          />
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary flex items-center gap-2">
          <Plus size={16} /> Crear Vendedor/Perfil
        </button>
      </div>

      {/* Grid of User cards */}
      {isLoading ? (
        <div className="text-center py-10 text-secondary">Cargando perfiles...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-10 text-secondary">No se encontraron usuarios registrados.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map(u => {
            const status = getUserOnlineStatus(u)
            return (
              <div key={u.id} className="glass-panel card flex flex-col justify-between overflow-hidden relative group transition-all duration-300 hover:-translate-y-1 hover:border-white/20">
                {/* Level top gradient bar */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${levelColor(u.nivel)}`} />
                
                <div className="p-5 flex flex-col gap-4 flex-1">
                  {/* Photo & Identity */}
                  <div className="flex items-center gap-4 mt-1">
                    <div className="relative">
                      {/* Connection status indicator */}
                      <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#0B132B] ${status.color} ${status.online ? 'animate-pulse' : ''}`} />
                      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                        {u.foto ? (
                          <img src={u.foto} className="w-full h-full object-cover" alt={u.nombre} />
                        ) : (
                          <span className="text-xl font-bold text-secondary uppercase">{u.nombre.charAt(0)}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-white leading-tight">{u.nombre}</h4>
                      <p className="text-xs text-secondary font-medium mt-0.5">@{u.alias}</p>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/5 border border-white/10 inline-block mt-1 text-primary">
                        {levelLabel(u.nivel)}
                      </span>
                    </div>
                  </div>

                  <hr className="border-white/5" />

                  {/* Modules Permissions list */}
                  <div>
                    <span className="text-[10px] font-black uppercase text-secondary tracking-widest block mb-2">Permisos de Módulos</span>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs text-secondary">
                      {Object.entries(u.modulos as Record<string, boolean>).map(([mod, active]) => (
                        <div key={mod} className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="capitalize">{mod}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer action buttons */}
                <div className="bg-black/20 border-t border-white/5 p-4 flex items-center justify-between gap-3">
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenEdit(u)} className="p-2 rounded-xl bg-white/5 border border-white/10 text-secondary hover:text-white hover:bg-white/10 transition-all" title="Editar Perfil">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => { setShowLogsModal(u); fetchLogs(); }} className="p-2 rounded-xl bg-white/5 border border-white/10 text-secondary hover:text-white hover:bg-white/10 transition-all" title="Ver Bitácora">
                      <Clock size={14} />
                    </button>
                  </div>
                  <button onClick={() => handleDeleteUser(u)} className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:text-white hover:bg-red-500 transition-all" title="Eliminar Perfil">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* USER EDIT/CREATE MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel card w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-lg text-white">
                {selectedUser ? `Editar Usuario: ${selectedUser.nombre}` : 'Nuevo Vendedor / Perfil'}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="text-secondary hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {/* Photo upload section */}
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                    {formFoto ? (
                      <img src={formFoto} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                      <User size={28} className="text-secondary" />
                    )}
                  </div>
                  <label htmlFor="user-photo-input" className="absolute -bottom-1 -right-1 p-1 bg-primary text-white rounded-lg cursor-pointer hover:bg-orange-600 transition-all shadow-md">
                    <Camera size={12} />
                  </label>
                  <input type="file" id="user-photo-input" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Fotografía de perfil</h4>
                  <p className="text-xs text-secondary mt-0.5">Soporta JPG, PNG y WEBP (máx. 1MB)</p>
                </div>
              </div>

              {/* Form fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group col-span-2">
                  <label className="form-label">Nombre Completo *</label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej. Ernesto Lares" className="form-input" required />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Alias (@usuario) *</label>
                  <input type="text" value={formAlias} onChange={(e) => setFormAlias(e.target.value)} placeholder="Ej. elarez" className="form-input" required />
                </div>

                <div className="form-group">
                  <label className="form-label">Correo Electrónico *</label>
                  <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="ejemplo@correo.com" className="form-input" required />
                </div>

                <div className="form-group">
                  <label className="form-label">Contraseña {selectedUser && '(Vacío para no cambiar)'} *</label>
                  <input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="••••••••" className="form-input" required={!selectedUser} />
                </div>

                <div className="form-group">
                  <label className="form-label">Nivel de Acceso *</label>
                  <select value={formNivel} onChange={(e) => setFormNivel(Number(e.target.value))} className="form-input">
                    <option value={1}>Nivel 1 (Gerencia/Admin)</option>
                    <option value={2}>Nivel 2 (Supervisión)</option>
                    <option value={3}>Nivel 3 (Ventas/Vendedor)</option>
                  </select>
                </div>

                <div className="form-group col-span-2">
                  <label className="form-label">Rol Descriptivo</label>
                  <input type="text" value={formRol} onChange={(e) => setFormRol(e.target.value)} placeholder="Ej. Vendedor Zona CABA" className="form-input" />
                </div>
              </div>

              {/* Permissions switches */}
              <div>
                <label className="form-label mb-2 block">Acceso a Módulos del Sistema</label>
                <div className="grid grid-cols-2 gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                  {Object.entries(formModulos).map(([mod, active]) => (
                    <label key={mod} className="flex items-center gap-2 text-sm text-secondary cursor-pointer hover:text-white transition-all select-none">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) => setFormModulos(prev => ({ ...prev, [mod]: e.target.checked }))}
                        className="rounded border-white/10 bg-white/5 text-primary focus:ring-primary focus:ring-offset-0 focus:ring-2"
                      />
                      <span className="capitalize">{mod}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="user-activo"
                  checked={formActivo}
                  onChange={(e) => setFormActivo(e.target.checked)}
                  className="rounded border-white/10 bg-white/5 text-primary focus:ring-primary focus:ring-offset-0 focus:ring-2"
                />
                <label htmlFor="user-activo" className="text-sm font-bold text-white cursor-pointer select-none">Usuario Activo (Permite el ingreso)</label>
              </div>

              {/* Footer action buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setShowUserModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOGS / BITACORA VIEW MODAL */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0">
          <div className="glass-panel card w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in print:bg-white print:text-black print:max-h-none print:shadow-none print:border-none print:w-full print:h-full">
            
            {/* Header info */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 print:border-b-2 print:border-black print:pb-4 print:mb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#ea580c] print:text-black">Bitácora de Auditoría y Gestión</span>
                <h3 className="font-bold text-lg text-white print:text-black mt-1">
                  @ {showLogsModal.nombre} (@{showLogsModal.alias})
                </h3>
              </div>
              <div className="flex gap-2 print:hidden">
                <button onClick={handlePrint} className="btn btn-secondary flex items-center gap-1 text-[10px] px-3 py-1.5">
                  Imprimir
                </button>
                <button onClick={handleExportCSV} className="btn btn-secondary flex items-center gap-1 text-[10px] px-3 py-1.5">
                  <Download size={12} /> CSV
                </button>
                <button onClick={() => setShowLogsModal(null)} className="w-8 h-8 bg-white/5 text-secondary rounded-full flex items-center justify-center hover:bg-white/10 hover:text-white transition-all">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Filter tab bar */}
            <div className="bg-black/10 border-b border-white/5 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
              <div className="flex gap-2">
                <button onClick={() => setLogTab('conexiones')} className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${logTab === 'conexiones' ? 'bg-primary text-white' : 'text-secondary hover:text-white'}`}>
                  Bitácora de Conexión
                </button>
                <button onClick={() => setLogTab('gestion')} className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${logTab === 'gestion' ? 'bg-primary text-white' : 'text-secondary hover:text-white'}`}>
                  Bitácora de Gestión
                </button>
              </div>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="form-input max-w-[160px] py-1.5 text-xs text-center"
              />
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar print:p-0">
              {getFilteredLogs().length === 0 ? (
                <div className="text-center py-20 text-secondary print:text-black">No hay registros cargados para este período.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-secondary font-black tracking-wider uppercase text-[10px] print:border-b-2 print:border-black print:text-black">
                      <th className="pb-3 px-2">Fecha y Hora</th>
                      <th className="pb-3 px-2">Acción</th>
                      <th className="pb-3 px-2">Detalles / IPs de Conexión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredLogs().map(l => (
                      <tr key={l.id} className="border-b border-white/5 hover:bg-white/5 transition-all print:border-b print:border-black/15 print:hover:bg-transparent">
                        <td className="py-3.5 px-2 text-secondary font-medium print:text-black shrink-0" style={{ whiteSpace: 'nowrap' }}>
                          {new Date(l.created_at).toLocaleString('es-AR')}
                        </td>
                        <td className="py-3.5 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${l.action_type === 'LOGIN' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : l.action_type === 'LOGOUT' ? 'bg-gray-500/10 text-gray-400 border border-gray-500/20' : 'bg-primary/10 text-primary border border-primary/20'} print:text-black print:bg-transparent print:border-none print:px-0`}>
                            {l.action_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-[#e2e8f0] print:text-black">
                          {l.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
