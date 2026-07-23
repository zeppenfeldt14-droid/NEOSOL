'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, Flame, Eye, RefreshCw, AlertCircle } from 'lucide-react'

type HeatPoint = {
  lat: number
  lng: number
  weight: number
  nombre: string
  zona?: string
}

type AllPoint = { lat: number; lng: number; zona?: string | null }

type Props = {
  visitas: HeatPoint[]
  ventas: HeatPoint[]
  totalEmpresas: number
  selectedZones?: string[]
  userNivel?: number
  userZona?: string | null
  allPoints?: AllPoint[]
}

// Buenos Aires / GBA default center — wider view
const GBA_CENTER: [number, number] = [-34.65, -58.55]
const GBA_ZOOM = 10  // Shows all GBA + surroundings

// Zone-specific centers (for nivel 3 - specific zone)
const ZONE_CENTERS: Record<string, [number, number]> = {
  'CABA':     [-34.6118, -58.4173],
  'GBA NORTE': [-34.48, -58.52],
  'GBA SUR':  [-34.82, -58.40],
  'GBA OESTE': [-34.66, -58.72],
  'SUR':      [-34.82, -58.40],
  'NORTE':    [-34.48, -58.52],
  'OESTE':    [-34.66, -58.72],
}

export function ZoneHeatMap({ visitas, ventas, totalEmpresas, selectedZones, userNivel, userZona, allPoints }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const heatLayerRef = useRef<any>(null)
  const markersLayerRef = useRef<any>(null)
  const [mode, setMode] = useState<'visitas' | 'ventas'>('visitas')
  const [isLoaded, setIsLoaded] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [geocodeMsg, setGeocodeMsg] = useState('')

  const activeData = mode === 'visitas' ? visitas : ventas
  const hasData = activeData.length > 0
  const noEmpresas = totalEmpresas === 0

  // Determine the best center/zoom based on user level
  const getMapCenter = (): { center: [number, number]; zoom: number } => {
    // nivel 3 = vendedor → center on their zone
    if (userNivel === 3 && userZona) {
      const key = Object.keys(ZONE_CENTERS).find(k => 
        userZona.toUpperCase().includes(k) || k.includes(userZona.toUpperCase())
      )
      if (key) return { center: ZONE_CENTERS[key], zoom: 12 }
    }
    // nivel 1 & 2 → show all GBA  
    return { center: GBA_CENTER, zoom: GBA_ZOOM }
  }

  const handleGeocode = useCallback(async () => {
    setIsGeocoding(true)
    setGeocodeMsg('Geocodificando direcciones...')
    try {
      const res = await fetch('/api/geocode', { method: 'POST' })
      const data = await res.json()
      setGeocodeMsg(`✓ ${data.updated} empresas actualizadas. ${data.remaining} pendientes. Recargá la página.`)
    } catch {
      setGeocodeMsg('Error al geocodificar. Intentá de nuevo.')
    } finally {
      setIsGeocoding(false)
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const { center, zoom } = getMapCenter()

    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!, {
        center,
        zoom,
        zoomControl: true,
        scrollWheelZoom: true,   // ← zoom con rueda del mouse
        dragging: true,           // ← arrastrar con cursor
        doubleClickZoom: true,
        touchZoom: true,
      })

      // CartoDB Dark — premium look sin API key
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '©OpenStreetMap, ©CartoDB',
        subdomains: 'abcd',
        maxZoom: 19,
        minZoom: 7
      }).addTo(map)

      // Reposition zoom controls to bottom-right
      map.zoomControl.setPosition('bottomright')

      mapInstanceRef.current = map
      setIsLoaded(true)
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update heatmap layer when mode or data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return

    import('leaflet').then(async (L) => {
      const map = mapInstanceRef.current

      // Clear previous layers
      if (heatLayerRef.current) { heatLayerRef.current.remove(); heatLayerRef.current = null }
      if (markersLayerRef.current) { markersLayerRef.current.remove(); markersLayerRef.current = null }

      if (activeData.length === 0) return

      // Load leaflet.heat plugin
      try { await import('leaflet.heat') } catch {}

      const maxWeight = Math.max(...activeData.map(p => p.weight), 1)
      const heatPoints = activeData.map(p => [
        p.lat, p.lng,
        Math.min(p.weight / maxWeight, 1)
      ] as [number, number, number])

      const gradient = mode === 'visitas'
        ? { 0.1: '#1e3a8a', 0.3: '#1d4ed8', 0.5: '#38bdf8', 0.75: '#fbbf24', 1.0: '#ef4444' }
        : { 0.1: '#14532d', 0.3: '#15803d', 0.5: '#4ade80', 0.75: '#fbbf24', 1.0: '#ef4444' }

      // Add heatmap if plugin loaded
      const Lany = L as any
      if (Lany.heatLayer) {
        heatLayerRef.current = Lany.heatLayer(heatPoints, {
          radius: 40,
          blur: 30,
          maxZoom: 17,
          max: 1.0,
          gradient
        }).addTo(map)
      }

      // Add glowing dot markers per company
      const group = L.layerGroup()
      const dotColor = mode === 'visitas' ? '#60a5fa' : '#34d399'
      activeData.forEach(point => {
        const icon = L.divIcon({
          html: `<div style="
            width:12px;height:12px;
            background:${dotColor};
            border:2px solid rgba(255,255,255,0.8);
            border-radius:50%;
            box-shadow:0 0 8px ${dotColor}, 0 0 16px ${dotColor}40;
          "></div>`,
          className: '',
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        })
        L.marker([point.lat, point.lng], { icon })
          .bindPopup(`
            <div style="font-family:Arial;font-size:12px;min-width:150px;line-height:1.5">
              <strong style="color:#0f172a">${point.nombre}</strong><br/>
              <span style="color:#64748b;font-size:11px">${point.zona || ''}</span><br/>
              <span style="color:${dotColor};font-weight:bold;font-size:14px">
                ${point.weight} ${mode === 'visitas' ? 'visita(s)' : 'venta(s)'}
              </span>
            </div>
          `, { closeButton: false })
          .addTo(group)
      })
      group.addTo(map)
      markersLayerRef.current = group

      // Fit bounds to visible data
      if (activeData.length > 1) {
        map.fitBounds(
          L.latLngBounds(activeData.map(p => [p.lat, p.lng] as [number, number])),
          { padding: [50, 50], maxZoom: 14 }
        )
      } else if (activeData.length === 1) {
        map.setView([activeData[0].lat, activeData[0].lng], 14)
      }
    })
  }, [mode, isLoaded, visitas, ventas])

  return (
    <div style={{
      width: '100%',
      background: 'rgba(15,23,42,0.8)',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.08)',
      overflow: 'hidden',
      boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexWrap: 'wrap',
        justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: mode === 'visitas' ? '#3b82f6' : '#22c55e',
            boxShadow: `0 0 10px ${mode === 'visitas' ? '#3b82f6' : '#22c55e'}`
          }} />
          <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            Mapa de Calor — {mode === 'visitas' ? 'Gestión de Visitas' : 'Gestión de Ventas'}
          </h4>
          <span style={{ fontSize: '0.7rem', color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '20px' }}>
            {activeData.length} puntos activos / {totalEmpresas} empresas con geo
          </span>
          {userZona && userNivel === 3 && (
            <span style={{ fontSize: '0.7rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: '20px', border: '1px solid rgba(245,158,11,0.2)' }}>
              📍 {userZona}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Geocode button — only visible if no empresas have geo */}
          {noEmpresas && (
            <button
              onClick={handleGeocode}
              disabled={isGeocoding}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)',
                background: 'rgba(245,158,11,0.1)', color: '#fbbf24', cursor: 'pointer',
                fontSize: '0.7rem', fontWeight: 700
              }}
            >
              <RefreshCw size={12} className={isGeocoding ? 'animate-spin' : ''} />
              {isGeocoding ? 'Geocodificando...' : 'Cargar Coordenadas'}
            </button>
          )}

          {/* Mode Toggle */}
          <div style={{
            display: 'flex', gap: '0.5rem',
            background: 'rgba(255,255,255,0.04)',
            padding: '4px', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <button onClick={() => setMode('visitas')} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer',
              fontSize: '0.7rem', fontWeight: 700,
              background: mode === 'visitas' ? 'rgba(59,130,246,0.2)' : 'transparent',
              color: mode === 'visitas' ? '#60a5fa' : '#64748b',
              transition: 'all 0.2s'
            }}>
              <Eye size={12} /> Visitas
            </button>
            <button onClick={() => setMode('ventas')} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer',
              fontSize: '0.7rem', fontWeight: 700,
              background: mode === 'ventas' ? 'rgba(34,197,94,0.2)' : 'transparent',
              color: mode === 'ventas' ? '#34d399' : '#64748b',
              transition: 'all 0.2s'
            }}>
              <Flame size={12} /> Ventas
            </button>
          </div>
        </div>
      </div>

      {/* Geocode message */}
      {geocodeMsg && (
        <div style={{
          padding: '0.5rem 1.5rem', fontSize: '0.75rem',
          color: geocodeMsg.startsWith('✓') ? '#34d399' : '#fbbf24',
          background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}>
          {geocodeMsg}
        </div>
      )}

      {/* Map Container */}
      <div style={{ position: 'relative', width: '100%', height: '480px' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* No data overlay when empresas have geo but no activity */}
        {isLoaded && totalEmpresas > 0 && !hasData && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(15,23,42,0.7)', gap: '0.75rem', zIndex: 500
          }}>
            <MapPin size={28} color="#3b82f6" />
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', margin: 0 }}>
              Sin actividad con coordenadas en este período
            </p>
          </div>
        )}

        {/* No coordinates at all */}
        {isLoaded && noEmpresas && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(15,23,42,0.75)', gap: '0.75rem', zIndex: 500
          }}>
            <AlertCircle size={28} color="#f59e0b" />
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
              Ninguna empresa tiene coordenadas cargadas.<br/>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Presioná "Cargar Coordenadas" para geocodificarlas automáticamente.
              </span>
            </p>
          </div>
        )}

        {/* Legend */}
        {isLoaded && hasData && (
          <div style={{
            position: 'absolute', bottom: '50px', left: '12px',
            background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px', padding: '8px 12px',
            display: 'flex', gap: '12px', alignItems: 'center',
            backdropFilter: 'blur(8px)', zIndex: 1000, fontSize: '0.65rem'
          }}>
            <span style={{ color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Densidad</span>
            <span style={{ color: mode === 'visitas' ? '#1d4ed8' : '#14532d' }}>● Baja</span>
            <span style={{ color: '#38bdf8' }}>● Media</span>
            <span style={{ color: '#fbbf24' }}>● Alta</span>
            <span style={{ color: '#ef4444' }}>● Máxima</span>
          </div>
        )}
      </div>
    </div>
  )
}
