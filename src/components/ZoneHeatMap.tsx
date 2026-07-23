'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Flame, Eye } from 'lucide-react'

type HeatPoint = {
  lat: number
  lng: number
  weight: number
  nombre: string
  zona?: string
}

type Props = {
  visitas: HeatPoint[]
  ventas: HeatPoint[]
  totalEmpresas: number
  selectedZones?: string[]
}

// CABA center coordinates
const CABA_CENTER: [number, number] = [-34.6118, -58.4173]
const CABA_ZOOM = 13

export function ZoneHeatMap({ visitas, ventas, totalEmpresas, selectedZones }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const heatLayerRef = useRef<any>(null)
  const markersLayerRef = useRef<any>(null)
  const [mode, setMode] = useState<'visitas' | 'ventas'>('visitas')
  const [isLoaded, setIsLoaded] = useState(false)

  const activeData = mode === 'visitas' ? visitas : ventas
  const hasData = activeData.length > 0

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Dynamically import leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      // Fix the default icon path issue in Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!, {
        center: CABA_CENTER,
        zoom: CABA_ZOOM,
        zoomControl: true,
        scrollWheelZoom: true,
      })

      // OpenStreetMap dark tile
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '©OpenStreetMap, ©CartoDB',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map)

      mapInstanceRef.current = map
      setIsLoaded(true)
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update heatmap when mode or data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return

    const L = (window as any).L || null

    import('leaflet').then(async (L) => {
      const map = mapInstanceRef.current

      // Remove previous layers
      if (heatLayerRef.current) {
        heatLayerRef.current.remove()
        heatLayerRef.current = null
      }
      if (markersLayerRef.current) {
        markersLayerRef.current.remove()
        markersLayerRef.current = null
      }

      if (activeData.length === 0) return

      // Dynamically load leaflet.heat
      try {
        await import('leaflet.heat')
      } catch (e) {
        console.warn('leaflet.heat not loaded, using markers only')
      }

      // Build heatmap points [lat, lng, intensity]
      const maxWeight = Math.max(...activeData.map(p => p.weight), 1)
      const heatPoints = activeData.map(p => [
        p.lat, 
        p.lng, 
        Math.min(p.weight / maxWeight, 1)  // normalize 0-1
      ] as [number, number, number])

      // Heat layer gradient
      const gradient = mode === 'visitas' 
        ? { 0.2: '#1e40af', 0.4: '#3b82f6', 0.6: '#38bdf8', 0.8: '#fbbf24', 1.0: '#ef4444' }
        : { 0.2: '#14532d', 0.4: '#16a34a', 0.6: '#4ade80', 0.8: '#fbbf24', 1.0: '#ef4444' }

      if ((L as any).heatLayer || (window as any).L?.heatLayer) {
        const heatFn = (L as any).heatLayer || (window as any).L.heatLayer
        heatLayerRef.current = heatFn(heatPoints, {
          radius: 35,
          blur: 25,
          maxZoom: 17,
          max: 1.0,
          gradient
        }).addTo(map)
      }

      // Add marker pins for each company
      const markersGroup = L.layerGroup()
      activeData.forEach(point => {
        const color = mode === 'visitas' ? '#3b82f6' : '#22c55e'
        const icon = L.divIcon({
          html: `<div style="
            width: 10px; height: 10px; 
            background: ${color}; 
            border: 2px solid white; 
            border-radius: 50%; 
            box-shadow: 0 0 6px ${color};
          "></div>`,
          className: '',
          iconSize: [10, 10],
          iconAnchor: [5, 5]
        })

        const marker = L.marker([point.lat, point.lng], { icon })
        marker.bindPopup(`
          <div style="font-family: Arial; font-size: 12px; min-width: 140px;">
            <strong style="color: #1e293b;">${point.nombre}</strong><br/>
            <span style="color: #64748b; font-size: 11px;">${point.zona || ''}</span><br/>
            <span style="color: ${color}; font-weight: bold; font-size: 13px;">
              ${point.weight} ${mode === 'visitas' ? 'visita(s)' : 'venta(s)'}
            </span>
          </div>
        `, { 
          closeButton: false,
          className: 'leaflet-popup-custom'
        })
        markersGroup.addLayer(marker)
      })
      markersGroup.addTo(map)
      markersLayerRef.current = markersGroup

      // Fit map to data bounds
      if (activeData.length > 1) {
        const bounds = L.latLngBounds(activeData.map(p => [p.lat, p.lng] as [number, number]))
        map.fitBounds(bounds, { padding: [40, 40] })
      } else if (activeData.length === 1) {
        map.setView([activeData[0].lat, activeData[0].lng], 15)
      }
    })
  }, [mode, isLoaded, visitas, ventas])

  return (
    <div style={{ 
      width: '100%', 
      background: 'rgba(15, 23, 42, 0.8)', 
      borderRadius: '16px', 
      border: '1px solid rgba(255,255,255,0.08)',
      overflow: 'hidden',
      boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '1.25rem 1.5rem', 
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            width: '10px', height: '10px', borderRadius: '50%',
            background: mode === 'visitas' ? '#3b82f6' : '#22c55e',
            boxShadow: `0 0 10px ${mode === 'visitas' ? '#3b82f6' : '#22c55e'}`
          }} />
          <h4 style={{ 
            fontSize: '0.75rem', fontWeight: 900, color: 'white', 
            textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0
          }}>
            Mapa de Calor — {mode === 'visitas' ? 'Gestión de Visitas' : 'Gestión de Ventas'}
          </h4>
          <span style={{ 
            fontSize: '0.7rem', color: '#64748b', 
            background: 'rgba(255,255,255,0.05)', 
            padding: '2px 8px', borderRadius: '20px' 
          }}>
            {activeData.length} puntos activos / {totalEmpresas} empresas con geo
          </span>
        </div>

        {/* Toggle */}
        <div style={{ 
          display: 'flex', gap: '0.5rem',
          background: 'rgba(255,255,255,0.04)', 
          padding: '4px', borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <button 
            onClick={() => setMode('visitas')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: 700,
              background: mode === 'visitas' ? 'rgba(59,130,246,0.2)' : 'transparent',
              color: mode === 'visitas' ? '#3b82f6' : '#64748b',
              transition: 'all 0.2s'
            }}
          >
            <Eye size={13} /> Visitas
          </button>
          <button 
            onClick={() => setMode('ventas')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: 700,
              background: mode === 'ventas' ? 'rgba(34,197,94,0.2)' : 'transparent',
              color: mode === 'ventas' ? '#22c55e' : '#64748b',
              transition: 'all 0.2s'
            }}
          >
            <Flame size={13} /> Ventas
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div style={{ position: 'relative', width: '100%', height: '480px' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        
        {/* No data overlay */}
        {isLoaded && !hasData && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(15,23,42,0.85)', gap: '1rem'
          }}>
            <MapPin size={32} color="#3b82f6" />
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', margin: 0 }}>
              No hay actividad con coordenadas<br/>
              <span style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                en el período seleccionado para este modo
              </span>
            </p>
          </div>
        )}

        {/* Legend */}
        {isLoaded && hasData && (
          <div style={{
            position: 'absolute', bottom: '16px', left: '16px',
            background: 'rgba(15,23,42,0.9)', 
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px', padding: '10px 14px',
            display: 'flex', gap: '16px', alignItems: 'center',
            backdropFilter: 'blur(8px)', zIndex: 1000
          }}>
            <span style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Intensidad</span>
            {mode === 'visitas' 
              ? <>
                  <span style={{ fontSize: '0.65rem', color: '#1e40af' }}>● Baja</span>
                  <span style={{ fontSize: '0.65rem', color: '#3b82f6' }}>● Media</span>
                  <span style={{ fontSize: '0.65rem', color: '#fbbf24' }}>● Alta</span>
                  <span style={{ fontSize: '0.65rem', color: '#ef4444' }}>● Máxima</span>
                </>
              : <>
                  <span style={{ fontSize: '0.65rem', color: '#14532d' }}>● Baja</span>
                  <span style={{ fontSize: '0.65rem', color: '#16a34a' }}>● Media</span>
                  <span style={{ fontSize: '0.65rem', color: '#fbbf24' }}>● Alta</span>
                  <span style={{ fontSize: '0.65rem', color: '#ef4444' }}>● Máxima</span>
                </>
            }
          </div>
        )}
      </div>
    </div>
  )
}
