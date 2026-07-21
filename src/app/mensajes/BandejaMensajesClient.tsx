'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, CheckCircle, Clock, Search, Inbox, Send as SendIcon, PlusCircle, AlertCircle } from 'lucide-react'

export default function BandejaMensajesClient({ userAlias, usuarios }: { userAlias: string, usuarios: any[] }) {
  const [activeTab, setActiveTab] = useState<'recibidos' | 'enviados'>('recibidos')
  const [mensajes, setMensajes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Nuevo Mensaje
  const [showNew, setShowNew] = useState(false)
  const [nuevoDestinatario, setNuevoDestinatario] = useState('')
  const [nuevoTexto, setNuevoTexto] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchMensajes = async () => {
    try {
      const res = await fetch(`/api/notas-planificador?global=true&alias=${encodeURIComponent(userAlias)}`)
      if (res.ok) {
        const data = await res.json()
        setMensajes(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMensajes()
    const interval = setInterval(fetchMensajes, 30000) // update every 30s
    return () => clearInterval(interval)
  }, [userAlias])

  const handleCompletar = async (id: number) => {
    try {
      setMensajes(prev => prev.map(m => m.id === id ? { ...m, estado: 'completada' } : m))
      const res = await fetch(`/api/notas-planificador/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'completada' })
      })
      if (!res.ok) {
        fetchMensajes()
      }
    } catch (e) {
      console.error(e)
      fetchMensajes()
    }
  }

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoDestinatario || !nuevoTexto) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/notas-planificador`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto: nuevoTexto,
          destinatario: nuevoDestinatario,
          zona: 'General',
          creadoPor: userAlias
        })
      })

      if (res.ok) {
        setNuevoTexto('')
        setShowNew(false)
        fetchMensajes()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  const displayedMensajes = mensajes.filter(m => {
    if (activeTab === 'recibidos') return m.destinatario === userAlias
    return m.creadoPor === userAlias
  }).filter(m => 
    m.texto.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.creadoPor && m.creadoPor.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (m.destinatario && m.destinatario.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="flex flex-col h-full bg-[#0b1021] border border-white/10 rounded-2xl overflow-hidden">
      
      {/* HEADER TABS */}
      <div className="flex border-b border-white/10 bg-[#12182c]">
        <button 
          onClick={() => setActiveTab('recibidos')}
          className={`flex-1 flex justify-center items-center gap-2 py-4 font-bold text-sm transition-colors ${activeTab === 'recibidos' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-secondary hover:text-white hover:bg-white/5'}`}
        >
          <Inbox size={18} /> Recibidos
        </button>
        <button 
          onClick={() => setActiveTab('enviados')}
          className={`flex-1 flex justify-center items-center gap-2 py-4 font-bold text-sm transition-colors ${activeTab === 'enviados' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-secondary hover:text-white hover:bg-white/5'}`}
        >
          <SendIcon size={18} /> Enviados
        </button>
      </div>

      {/* ACTION BAR */}
      <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-[#151c36]/50">
        <div className="relative w-full md:w-1/2 lg:w-1/3">
          <Search size={16} className="absolute left-3 top-3 text-secondary" />
          <input 
            type="text" 
            placeholder="Buscar mensajes..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input w-full pl-9 py-2 bg-black/40 border-white/5 rounded-xl text-sm"
          />
        </div>
        <button 
          onClick={() => setShowNew(!showNew)}
          className="btn btn-primary w-full md:w-auto py-2 px-6 rounded-xl text-sm font-bold flex justify-center items-center gap-2"
        >
          {showNew ? 'Cancelar' : <><PlusCircle size={18} /> Nuevo Mensaje</>}
        </button>
      </div>

      {/* NEW MESSAGE FORM */}
      {showNew && (
        <div className="p-4 bg-primary/10 border-b border-primary/20">
          <form onSubmit={handleEnviar} className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="form-label text-xs">Destinatario</label>
                <select 
                  required
                  value={nuevoDestinatario}
                  onChange={(e) => setNuevoDestinatario(e.target.value)}
                  className="form-input bg-black/50"
                >
                  <option value="">Selecciona un destinatario...</option>
                  {usuarios.filter(u => u.alias !== userAlias).map(u => (
                    <option key={u.alias} value={u.alias}>{u.nombre} (@{u.alias})</option>
                  ))}
                  <option value="personal">Para mi mismo (Personal)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="form-label text-xs">Mensaje</label>
              <textarea 
                required
                value={nuevoTexto}
                onChange={(e) => setNuevoTexto(e.target.value)}
                className="form-input bg-black/50 min-h-[100px]"
                placeholder="Escribe el mensaje aquí..."
                spellCheck={true} lang="es"
              />
            </div>
            <div className="flex justify-end">
              <button disabled={submitting} type="submit" className="btn btn-primary px-8 py-2 rounded-xl flex items-center gap-2 font-bold text-sm">
                {submitting ? 'Enviando...' : <><Send size={16} /> Enviar</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MESSAGE LIST */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" style={{ maxHeight: 'calc(100vh - 250px)' }}>
        {loading ? (
          <div className="text-center py-12 text-secondary animate-pulse">Cargando mensajes...</div>
        ) : displayedMensajes.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center justify-center text-secondary gap-3 opacity-60">
            <Inbox size={48} />
            <p className="font-bold">No hay mensajes {activeTab === 'recibidos' ? 'recibidos' : 'enviados'}</p>
          </div>
        ) : (
          displayedMensajes.map(m => (
            <div key={m.id} className={`p-4 rounded-xl border flex flex-col gap-3 transition-all ${m.estado === 'completada' ? 'bg-[#12182c]/40 border-white/5 opacity-70' : 'bg-[#151c36] border-white/10 hover:border-primary/50'}`}>
              
              <div className="flex justify-between items-start gap-4">
                <div className="flex flex-col">
                  <div className="text-xs text-secondary font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                    {activeTab === 'recibidos' ? (
                      <>De: <span className="text-primary">{m.creadoPor || 'Sistema'}</span></>
                    ) : (
                      <>Para: <span className="text-primary">{m.destinatario}</span></>
                    )}
                  </div>
                  <p className="text-white text-sm whitespace-pre-wrap">{m.texto}</p>
                </div>
                
                {/* Context Badges */}
                {(m.empresa || m.pedido || m.factura || m.cobranza) && (
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    {m.empresa && <span className="badge badge-info text-[10px]">🏢 {m.empresa.nombre}</span>}
                    {m.pedido && <span className="badge badge-warning text-[10px]">📦 Pedido</span>}
                    {m.factura && <span className="badge badge-danger text-[10px]">📄 Factura</span>}
                    {m.cobranza && <span className="badge badge-success text-[10px]">💰 Cobranza</span>}
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center mt-2 pt-3 border-t border-white/5">
                <div className="flex items-center gap-4 text-xs text-secondary">
                  <span className="flex items-center gap-1"><Clock size={12} /> {new Date(m.creadoEn).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <span className={`px-2 py-0.5 rounded-md font-bold uppercase ${m.estado === 'completada' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {m.estado}
                  </span>
                </div>
                
                {/* Actions */}
                {m.estado !== 'completada' && activeTab === 'recibidos' && (
                  <button 
                    onClick={() => handleCompletar(m.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs font-bold transition-colors"
                  >
                    <CheckCircle size={14} /> Marcar Resuelto
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  )
}
