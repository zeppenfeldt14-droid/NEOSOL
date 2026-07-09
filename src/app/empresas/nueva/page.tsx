import { createEmpresa } from './actions'
import { ArrowLeft, Building2, Save } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function NuevaEmpresaPage() {
  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/empresas" className="btn btn-secondary">
          <ArrowLeft size={16} /> Volver
        </Link>
        <div>
          <h1 className="page-title !mb-0 flex items-center gap-2">
            <Building2 className="text-primary" /> Ficha de Alta de Cliente
          </h1>
          <p className="page-subtitle mt-1">
            Completar según formulario oficial para administración.
          </p>
        </div>
      </div>

      <div className="glass-panel p-6">
        <form action={createEmpresa} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Bloque 1: Información General */}
          <div className="col-span-1 md:col-span-2 border-b border-white/10 pb-4 mb-2">
            <h3 className="text-lg font-medium text-white mb-4 text-primary">Información General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="form-label">Institución (Nombre y Apellido) / Empresa *</label>
                <input type="text" name="nombre" className="form-input" required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">CUIT Nº</label>
                <input type="text" name="cuit" className="form-input" placeholder="Ej. 30-12345678-9" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Actividad</label>
                <input type="text" name="actividad" className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Sucursal (Zona)</label>
                <input type="text" name="zona" className="form-input" />
              </div>
            </div>
          </div>

          {/* Bloque 2: Ubicación */}
          <div className="col-span-1 md:col-span-2 border-b border-white/10 pb-4 mb-2">
            <h3 className="text-lg font-medium text-white mb-4 text-primary">Dirección y Logística</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="form-label">Dirección Fiscal / Legal</label>
                <input type="text" name="direccionFiscal" className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Dirección de Entrega</label>
                <input type="text" name="direccion" className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Localidad</label>
                <input type="text" name="barrio" className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Partido</label>
                <input type="text" name="partido" className="form-input" />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="form-label">Transporte Sugerido</label>
                <input type="text" name="transporte" className="form-input" />
              </div>
            </div>
          </div>

          {/* Bloque 3: Contacto */}
          <div className="col-span-1 md:col-span-2 border-b border-white/10 pb-4 mb-2">
            <h3 className="text-lg font-medium text-white mb-4 text-primary">Contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="form-label">Celular / TEL.</label>
                <input type="text" name="telefono" className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Correo Electrónico / e-mail empresa</label>
                <input type="email" name="email" className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Vendedor Asignado</label>
                <input type="text" name="vendedorAsignado" className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Contacto principal (Responsable)</label>
                <input type="text" name="responsable" className="form-input" />
              </div>
            </div>
          </div>

          {/* Bloque 4: Administración y Cobranzas */}
          <div className="col-span-1 md:col-span-2 border-b border-white/10 pb-4 mb-2">
            <h3 className="text-lg font-medium text-white mb-4 text-primary">Administración y Cobranzas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="form-label">Contacto de Cobranzas</label>
                <input type="text" name="contactoCobranzas" className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Días de pago</label>
                <input type="text" name="diasPago" className="form-input" />
              </div>
            </div>
          </div>

          {/* Bloque 5: Notas y CRM */}
          <div className="col-span-1 md:col-span-2 mb-4">
            <h3 className="text-lg font-medium text-white mb-4 text-primary">CRM Interno</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="form-label">Productos de Interés</label>
                <input type="text" name="productosInteres" className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Ciclo de Venta Estimado (Días)</label>
                <input type="number" name="cicloVentaDias" className="form-input" placeholder="Para alarmas automáticas" />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="form-label">Notas Adicionales (Tipo/Nº Cuenta, Cobrador, etc.)</label>
                <textarea name="notas" className="form-input min-h-[100px]"></textarea>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="col-span-1 md:col-span-2 flex justify-end gap-4 mt-4 pt-4 border-t border-white/10">
            <Link href="/empresas" className="btn btn-secondary">
              Cancelar
            </Link>
            <button type="submit" className="btn btn-primary">
              <Save size={16} /> Guardar Ficha de Alta
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
