import {
  ShoppingCart,
  Download,
  XCircle,
  Package,
  FileText,
  Globe,
  Calendar,
  Calculator,
  User
} from 'lucide-react'
import { formatDate } from '@/lib/date'

interface Props {
  pedido: any
  onClose: () => void
  onStateChange?: (id: number, newState: string) => void
  userNivel?: number
}

const ESTADO_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  pendiente_supervisor: 'Pendiente',
  aprobado: 'Aprobado',
  cancelado: 'Cancelado',
}

const ESTADO_BADGES: Record<string, string> = {
  borrador: 'bg-white/5 text-secondary border-white/10',
  pendiente_supervisor: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  aprobado: 'bg-green-400/10 text-green-400 border-green-400/20',
  cancelado: 'bg-red-500/10 text-red-500 border-red-500/20',
}

export function PedidoDetalleModal({ pedido, onClose, onStateChange, userNivel = 3 }: Props) {
  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })

  const handlePrintPedido = () => {
    window.open(`/api/reportes/download?type=pedido&id=${pedido.id}`, '_blank')
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0B0F19] border border-white/10 rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <ShoppingCart className="text-primary" size={20} />
            <h3 className="text-white font-bold text-lg">Pedido {pedido.numeroPedido}</h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${ESTADO_BADGES[pedido.estado] || ''}`}>
              {ESTADO_LABELS[pedido.estado] || pedido.estado}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintPedido}
              className="btn btn-secondary text-xs flex items-center gap-1.5 font-bold"
            >
              <Download size={14} />
              Descargar
            </button>
            <button
              onClick={onClose}
              className="btn-action ml-2 w-8 h-8"
            >
              <XCircle size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto min-h-0 flex-1 custom-scrollbar">
          {/* Info General */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-xl text-xs">
            <div>
              <span className="text-secondary block mb-1">Cliente</span>
              <strong className="text-white text-sm">{pedido.empresa.nombre}</strong>
              {pedido.empresa.cuit && <span className="block text-[10px] text-white/50 mt-0.5">CUIT: {pedido.empresa.cuit}</span>}
            </div>
            <div>
              <span className="text-secondary block mb-1">Zona</span>
              <strong className="text-white text-sm uppercase">{pedido.zona}</strong>
            </div>
            <div>
              <span className="text-secondary block mb-1">Vendedor</span>
              <strong className="text-white text-sm">{pedido.vendedorAlias}</strong>
            </div>
            <div>
              <span className="text-secondary block mb-1">Fecha de Creación</span>
              <strong className="text-white text-sm">
                {formatDate(pedido.creadoEn)} {new Date(pedido.creadoEn).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </strong>
            </div>
          </div>

          {/* Detalles de Productos */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
              <Package size={14} className="text-primary" /> Productos del Pedido
            </h4>
            <div className="border border-white/5 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-black text-secondary uppercase tracking-widest">
                    <th className="px-4 py-2">Cód</th>
                    <th className="px-4 py-2">Producto</th>
                    <th className="px-4 py-2 text-center">Paq/Caja</th>
                    <th className="px-4 py-2 text-right">Precio Caja</th>
                    <th className="px-4 py-2 text-center">Cantidad</th>
                    <th className="px-4 py-2 text-center">Bonus</th>
                    <th className="px-4 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.detalles.map((d: any) => {
                    const isCustom = Math.abs(d.precioCajaSnapshot - d.precioCajaOriginal) > 0.01
                    return (
                      <tr key={d.id} className="border-b border-white/5 text-white/90">
                        <td className="px-4 py-3 text-primary font-bold">{d.producto?.codigoInterno || '—'}</td>
                        <td className="px-4 py-3 font-semibold">{d.productoNombre}</td>
                        <td className="px-4 py-3 text-center text-secondary">{d.producto?.paqPorCaja || '—'}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {fmt(d.precioCajaSnapshot)}
                          {isCustom && <span className="block text-[8px] text-yellow-400 font-bold">Negociado</span>}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-white">{d.cantidadCajas}</td>
                        <td className="px-4 py-3 text-center">
                          {d.cajasBonus > 0 ? (
                            <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-black" title={d.descripcionBonus || ''}>
                              +{d.cajasBonus} reg
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-white">{fmt(d.subtotal)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Negociación & Logística */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl flex flex-col gap-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                <FileText size={14} className="text-secondary" /> Condiciones de Venta
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-secondary block mb-0.5">Condición de Pago</span>
                  <strong className="text-white">{pedido.condicionPago || '—'}</strong>
                </div>
                <div>
                  <span className="text-secondary block mb-0.5">Recargo Financiera (3%)</span>
                  <strong className={pedido.aplicaFinanciera ? 'text-primary font-black' : 'text-white/40'}>
                    {pedido.aplicaFinanciera ? 'SÍ' : 'NO'}
                  </strong>
                </div>
                {pedido.plazosPago && (
                  <div className="col-span-2">
                    <span className="text-secondary block mb-0.5">Plazos Especiales</span>
                    <strong className="text-white">{pedido.plazosPago}</strong>
                  </div>
                )}
                {pedido.acuerdosComerciales && (
                  <div className="col-span-2">
                    <span className="text-secondary block mb-0.5">Acuerdos Comerciales</span>
                    <strong className="text-yellow-400 font-semibold">{pedido.acuerdosComerciales}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl flex flex-col gap-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                <Globe size={14} className="text-secondary" /> Logística e Indicadores
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-secondary block mb-0.5">Requiere Presupuesto</span>
                  <strong className="text-white">{pedido.requierePresupuesto ? 'SÍ' : 'NO'}</strong>
                </div>
                <div>
                  <span className="text-secondary block mb-0.5">Turno de Entrega</span>
                  <strong className="text-white">{pedido.turnoEntrega || '—'}</strong>
                </div>
                {pedido.fechaEntrega && (
                  <div className="col-span-2">
                    <span className="text-secondary block mb-0.5">Día de Entrega Acordado</span>
                    <strong className="text-green-400 flex items-center gap-1 font-bold text-sm bg-green-400/10 border border-green-400/20 px-2 py-1 rounded-lg w-max mt-1">
                      <Calendar size={13} />
                      {formatDate(pedido.fechaEntrega)}
                    </strong>
                  </div>
                )}
                {pedido.observaciones && (
                  <div className="col-span-2">
                    <span className="text-secondary block mb-0.5">Observaciones</span>
                    <strong className="text-white font-normal">{pedido.observaciones}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Totales y Facturación Split */}
          <div className="bg-primary/5 border border-primary/20 p-5 rounded-xl flex flex-col gap-4">
            <h4 className="text-primary font-bold text-xs uppercase tracking-wider flex items-center gap-2 border-b border-primary/20 pb-2">
              <Calculator size={14} className="text-primary" /> Liquidación e Impuestos
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
              <div>
                <span className="text-primary/70 block text-[10px] uppercase font-black tracking-wider mb-1">Subtotal s/IVA</span>
                <strong className="text-white font-bold">{fmt(pedido.subtotalSinIVA)}</strong>
              </div>
              <div>
                <span className="text-primary/70 block text-[10px] uppercase font-black tracking-wider mb-1">IVA (21% s/Parte A)</span>
                <strong className="text-blue-400 font-bold">{fmt(pedido.montoIVA)}</strong>
                <span className="block text-[9px] text-secondary font-semibold mt-0.5">({pedido.porcentajePagoA}% facturado en A)</span>
              </div>
              <div>
                <span className="text-primary/70 block text-[10px] uppercase font-black tracking-wider mb-1">Cargo Fin. (3%)</span>
                <strong className="text-orange-400 font-bold">{fmt(pedido.montoFinanciera)}</strong>
              </div>
              <div>
                <span className="text-primary block text-[10px] uppercase font-black tracking-wider mb-1">TOTAL GENERAL</span>
                <strong className="text-green-400 font-black text-xl">{fmt(pedido.totalGeneral)}</strong>
              </div>
            </div>
          </div>
          {/* Auditoría */}
          {pedido.aprobadoPorAlias && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400 flex items-center gap-2">
              <User size={13} />
              Aprobado por: <strong>{pedido.aprobadoPorAlias}</strong> el <strong>{pedido.aprobadoEn ? formatDate(pedido.aprobadoEn) : '—'}</strong>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 flex items-center justify-between shrink-0 bg-black/40 rounded-b-2xl">
          <div className="flex gap-2">
            {pedido.estado === 'pendiente_supervisor' && userNivel < 3 && onStateChange && (
              <>
                <button
                  onClick={() => onStateChange(pedido.id, 'aprobar')}
                  className="btn btn-primary text-xs bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30 font-bold"
                >
                  Aprobar Pedido
                </button>
                <button
                  onClick={() => onStateChange(pedido.id, 'cancelar')}
                  className="btn btn-outline border-red-500/30 text-red-500 hover:bg-red-500/20 text-xs font-bold"
                >
                  Cancelar Pedido
                </button>
              </>
            )}
            {pedido.estado === 'borrador' && onStateChange && (
              <button
                onClick={() => onStateChange(pedido.id, 'enviar')}
                className="btn btn-primary text-xs font-bold"
              >
                Enviar a Supervisor
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary text-xs"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  )
}

