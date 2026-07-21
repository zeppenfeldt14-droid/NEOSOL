'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'

export function NotificationBell({ userAlias }: { userAlias: string }) {
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnread = async () => {
    try {
      const res = await fetch(`/api/notas-planificador?global=true&alias=${encodeURIComponent(userAlias)}`)
      if (res.ok) {
        const data = await res.json()
        const unread = data.filter((m: any) => m.destinatario === userAlias && m.estado !== 'completada').length
        setUnreadCount(unread)
      }
    } catch (e) {
      console.error('Error fetching notifications:', e)
    }
  }

  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 60000) // check every minute
    return () => clearInterval(interval)
  }, [userAlias])

  return (
    <Link href="/mensajes" className="relative p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center">
      <Bell size={20} className="text-secondary" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#0B132B]">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
