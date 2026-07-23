'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Flame, Eye, RefreshCw, AlertCircle } from 'lucide-react'

type HeatPoint = {
  lat: number
  lng: number
  weight: number
  nombre: string
  zona?: string
}

type AllPoint = {
  lat: number
  lng: number
  zona?: string | null
  nombre?: string
  estado?: string | null
  motivoBaja?: string | null
}

type Props = {
  visitas: HeatPoint[]
  ventas: HeatPoint[]
  totalEmpresas: number
  selectedZones?: string[]
  userNivel?: number
  userZona?: string | null
  allPoints?: AllPoint[]
}

// Color and label per estado
const ESTADO_CONFIG: Record<string, { color: string; glow: string; label: string; emoji: string }> = {
  activo:     { color: '#22c55e', glow: '#22c55e80', label: 'Cliente Activo', emoji: '✅' },
  prospecto:  { color: '#f59e0b', glow: '#f59e0b80', label: 'Prospecto',      emoji: '🟡' },
  descartada: { color: '#8b5cf6', glow: '#8b5cf680', label: 'Descartada',     emoji: '🟣' },
  baja:       { color: '#ef4444', glow: '#ef444480', label: 'Baja',           emoji: '🔴' },
}

// GBA default center — wide view
const GBA_CENTER: [number, number] = [-34.65, -58.55]
const GBA_ZOOM = 10

const ZONE_CENTERS: Record<string, [number, number]> = {
  'CABA':      [-34.6118, -58.4173],
  'GBA NORTE': [-34.48,   -58.52],
  'GBA SUR':   [-34.82,   -58.40],
  'GBA OESTE': [-34.66,   -58.72],
  'SUR':       [-34.82,   -58.40],
  'NORTE':     [-34.48,   -58.52],
  'OESTE':     [-34.66,   -58.72],
}

export function ZoneHeatMap({ visitas, ventas, totalEmpresas, selectedZones, userNivel, userZona, allPoints }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const heatLayerRef = useRef<any>(null)
  const markersLayerRef = useRef<any>(null)
  const companyMarkersRef = useRef<any>(null)

  // Default mode → ventas
  const [mode, setMode] = useState<'visitas' | 'ventas'>('ventas')
  const [showCompanies, setShowCompanies] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [geocodeMsg, setGeocodeMsg] = useState('')

  const activeData = mode === 'visitas' ? visitas : ventas
  const hasData = activeData.length > 0
  const noEmpresas = totalEmpresas === 0

  const getMapCenter = () => {
    if (userNivel === 3 && userZona) {
      const key = Object.keys(ZONE_CENTERS).find(k =>
        userZona.toUpperCase().includes(k) || k.includes(userZona.toUpperCase())
      )
      if (key) return { center: ZONE_CENTERS[key], zoom: 12 }
    }
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

  // Build company marker layer
  const buildCompanyMarkers = useCallback(async (L: any, map: any) => {
    if (companyMarkersRef.current) {
      companyMarkersRef.current.remove()
      companyMarkersRef.current = null
    }
    if (!showCompanies || !allPoints || allPoints.length === 0) return

    const group = L.layerGroup()

    allPoints.forEach((point: AllPoint) => {
      const cfg = ESTADO_CONFIG[point.estado?.toLowerCase() || ''] || ESTADO_CONFIG.prospecto
      const isBajaOrDescartada = ['baja', 'descartada'].includes(point.estado?.toLowerCase() || '')
      const motivoHtml = isBajaOrDescartada && point.motivoBaja 
        ? `<div style="margin-top:6px;padding:4px 6px;background:rgba(0,0,0,0.05);border-left:2px solid ${cfg.color};font-size:10px;color:#475569;font-style:italic;">Motivo: ${point.motivoBaja}</div>` 
        : ''

      const icon = L.divIcon({
        html: `<div title="${point.nombre || ''}" style="
          position:relative;
          width:14px; height:14px;
          background:${cfg.color};
          border:2.5px solid rgba(255,255,255,0.9);
          border-radius:50%;
          box-shadow:0 2px 5px rgba(0,0,0,0.3);
          cursor:pointer;
          transition: transform 0.15s;
        "></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      })

      L.marker([point.lat, point.lng], { icon })
        .bindPopup(`
          <div style="font-family:Arial;font-size:12px;min-width:160px;line-height:1.6;padding:2px 0">
            <strong style="color:#0f172a;font-size:13px">${point.nombre || 'Empresa'}</strong><br/>
            <span style="color:#64748b;font-size:11px">${point.zona || ''}</span><br/>
            <span style="
              display:inline-block;margin-top:4px;
              background:${cfg.color}20;color:${cfg.color};
              border:1px solid ${cfg.color}50;
              padding:2px 8px;border-radius:12px;
              font-weight:700;font-size:11px;
            ">${cfg.emoji} ${cfg.label}</span>
            ${motivoHtml}
          </div>
        `, { closeButton: false, maxWidth: 220 })
        .addTo(group)
    })

    group.addTo(map)
    companyMarkersRef.current = group
  }, [showCompanies, allPoints])

  // Init map
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
        center, zoom,
        zoomControl: true,
        scrollWheelZoom: true,
        dragging: true,
        doubleClickZoom: true,
        touchZoom: true,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '©OpenStreetMap, ©CartoDB',
        subdomains: 'abcd',
        maxZoom: 19,
        minZoom: 7
      }).addTo(map)

      map.zoomControl.setPosition('bottomright')
      mapInstanceRef.current = map
      setIsLoaded(true)
    })

    return () => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update heat layer on mode/data change
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return

    import('leaflet').then(async (L) => {
      const map = mapInstanceRef.current

      if (heatLayerRef.current) { heatLayerRef.current.remove(); heatLayerRef.current = null }
      if (markersLayerRef.current) { markersLayerRef.current.remove(); markersLayerRef.current = null }

      // Build company markers
      await buildCompanyMarkers(L, map)

      if (activeData.length === 0) return

      try { await import('leaflet.heat') } catch {}

      const maxWeight = Math.max(...activeData.map(p => p.weight), 1)
      const heatPoints = activeData.map(p => [
        p.lat, p.lng, Math.min(p.weight / maxWeight, 1)
      ] as [number, number, number])

      const gradient = mode === 'visitas'
        ? { 0.1: '#1e3a8a', 0.3: '#1d4ed8', 0.5: '#38bdf8', 0.75: '#fbbf24', 1.0: '#ef4444' }
        : { 0.1: '#14532d', 0.3: '#15803d', 0.5: '#4ade80', 0.75: '#fbbf24', 1.0: '#ef4444' }

      const Lany = L as any
      if (Lany.heatLayer) {
        heatLayerRef.current = Lany.heatLayer(heatPoints, {
          radius: 40, blur: 30, maxZoom: 17, max: 1.0, gradient
        }).addTo(map)
      }

      // Activity markers (glowing dots on top of heat)
      const group = L.layerGroup()
      const dotColor = mode === 'visitas' ? '#60a5fa' : '#34d399'
      activeData.forEach(point => {
        const icon = L.divIcon({
          html: `<div style="width:10px;height:10px;background:${dotColor};border:2px solid white;border-radius:50%;box-shadow:0 0 8px ${dotColor}"></div>`,
          className: '', iconSize: [10, 10], iconAnchor: [5, 5]
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

      if (activeData.length > 1) {
        map.fitBounds(
          L.latLngBounds(activeData.map(p => [p.lat, p.lng] as [number, number])),
          { padding: [50, 50], maxZoom: 14 }
        )
      } else if (activeData.length === 1) {
        map.setView([activeData[0].lat, activeData[0].lng], 14)
      }
    })
  }, [mode, isLoaded, visitas, ventas, buildCompanyMarkers])

  // Toggle company markers without rebuilding heat
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return
    import('leaflet').then((L) => buildCompanyMarkers(L, mapInstanceRef.current))
  }, [showCompanies, isLoaded, buildCompanyMarkers])

  // Leyenda de estados
  const estadoEntries = Object.entries(ESTADO_CONFIG)

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
        padding: '1.1rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexWrap: 'wrap',
        justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem'
      }}>
        {/* Left: title + badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: mode === 'visitas' ? '#3b82f6' : '#22c55e',
            boxShadow: `0 0 10px ${mode === 'visitas' ? '#3b82f6' : '#22c55e'}`
          }} />
          <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            Mapa de Calor — {mode === 'visitas' ? 'Gestión de Visitas' : 'Gestión de Ventas'}
          </h4>
          <span style={{ fontSize: '0.68rem', color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '20px' }}>
            {activeData.length} activos / {totalEmpresas} geo
          </span>
          {userZona && userNivel === 3 && (
            <span style={{ fontSize: '0.68rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: '20px', border: '1px solid rgba(245,158,11,0.2)' }}>
              📍 {userZona}
            </span>
          )}
        </div>

        {/* Right: controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Companies toggle */}
          <button
            onClick={() => setShowCompanies(v => !v)}
            style={{
              padding: '6px 12px', borderRadius: '8px', border: `1px solid ${showCompanies ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
              background: showCompanies ? 'rgba(139,92,246,0.15)' : 'transparent',
              color: showCompanies ? '#a78bfa' : '#64748b',
              fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer'
            }}
          >
            {showCompanies ? '🏢 Empresas ON' : '🏢 Empresas OFF'}
          </button>

          {/* Geocode button */}
          {noEmpresas && (
            <button onClick={handleGeocode} disabled={isGeocoding} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 12px', borderRadius: '8px',
              border: '1px solid rgba(245,158,11,0.3)',
              background: 'rgba(245,158,11,0.1)', color: '#fbbf24',
              cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700
            }}>
              <RefreshCw size={12} />
              {isGeocoding ? 'Geocodificando...' : 'Cargar Coordenadas'}
            </button>
          )}

          {/* Mode toggle */}
          <div style={{
            display: 'flex', gap: '0.4rem',
            background: 'rgba(255,255,255,0.04)',
            padding: '3px', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <button onClick={() => setMode('visitas')} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer',
              fontSize: '0.7rem', fontWeight: 700,
              background: mode === 'visitas' ? 'rgba(59,130,246,0.2)' : 'transparent',
              color: mode === 'visitas' ? '#60a5fa' : '#64748b',
              transition: 'all 0.2s'
            }}>
              <Eye size={12} /> Visitas
            </button>
            <button onClick={() => setMode('ventas')} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer',
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

      {/* Estado legend */}
      <div style={{
        padding: '0.5rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Empresas:</span>
        {estadoEntries.map(([key, cfg]) => (
          <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: cfg.color }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: cfg.color, display: 'inline-block', boxShadow: `0 0 5px ${cfg.glow}` }} />
            {cfg.label}
          </span>
        ))}
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

        {/* No activity overlay */}
        {isLoaded && totalEmpresas > 0 && !hasData && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(15,23,42,0.6)', gap: '0.75rem', zIndex: 500
          }}>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', margin: 0 }}>
              Sin actividad registrada en este período para este modo
            </p>
          </div>
        )}

        {/* No coordinates overlay */}
        {isLoaded && noEmpresas && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(15,23,42,0.75)', gap: '0.75rem', zIndex: 500
          }}>
            <AlertCircle size={28} color="#f59e0b" />
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
              Ninguna empresa tiene coordenadas cargadas.<br />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Presioná "Cargar Coordenadas" para geocodificarlas automáticamente.
              </span>
            </p>
          </div>
        )}

        {/* Heat density legend */}
        {isLoaded && hasData && (
          <div style={{
            position: 'absolute', bottom: '50px', left: '12px',
            background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px', padding: '7px 12px',
            display: 'flex', gap: '10px', alignItems: 'center',
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
