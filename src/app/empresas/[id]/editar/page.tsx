import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Save } from 'lucide-react'
import { updateEmpresa } from '../actions'

export const dynamic = 'force-dynamic'

export default async function EditarEmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const empresaId = parseInt(id)
  
  if (isNaN(empresaId)) {
    notFound()
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId }
  })

  if (!empresa) {
    notFound()
  }

  const updateEmpresaWithId = updateEmpresa.bind(null, empresaId)

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/empresas/${empresaId}`} className="btn btn-secondary">
          <ArrowLeft size={16} /> Volver a Ficha
        </Link>
        <div>
          <h1 className="page-title !mb-0 flex items-center gap-2">
            <Building2 className="text-primary" /> Editar Ficha de Cliente
          </h1>
          <p className="page-subtitle mt-1">
            Actualizando datos de {empresa.nombre}
          </p>
        </div>
      </div>

      <div className="glass-panel p-6">
        <form action={async (formData) => {
          'use server'
          await updateEmpresaWithId(formData)
          redirect(`/empresas/${empresaId}`)
        }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Bloque 1: Información General */}
          <div className="col-span-1 md:col-span-2 border-b border-white/10 pb-4 mb-2">
            <h3 className="text-lg font-medium text-white mb-4 text-primary">Información General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="form-label">Institución (Nombre y Apellido) / Empresa *</label>
                <input type="text" name="nombre" defaultValue={empresa.nombre} className="form-input" required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">CUIT Nº</label>
                <input type="text" name="cuit" defaultValue={empresa.cuit || ''} className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Actividad</label>
                <input type="text" name="actividad" defaultValue={empresa.actividad || ''} className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Sucursal (Zona)</label>
                <input type="text" name="zona" defaultValue={empresa.zona || ''} className="form-input" />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="form-label">Estado de la Empresa</label>
                <select
                  name="estado"
                  defaultValue={empresa.estado}
                  className="form-input bg-dark"
                  id="estadoSelect"
                >
                  <option value="prospecto">Prospecto</option>
                  <option value="activo">Cliente Activo</option>
                  <option value="descartada">Descartada</option>
                  <option value="baja">Baja (ex-cliente)</option>
                </select>
              </div>
              <div
                id="motivoBajaSection"
                className="flex flex-col gap-2 md:col-span-2"
                style={{ display: empresa.estado === 'baja' ? 'flex' : 'none' }}
              >
                <label className="form-label" style={{ color: '#ef4444' }}>
                  ⚠️ Motivo de Baja <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  name="motivoBaja"
                  defaultValue={empresa.motivoBaja || ''}
                  className="form-input"
                  rows={3}
                  placeholder="Explica por qué se dio de baja al cliente (ej: dejó de comprar, encontró otro proveedor, cierre de negocio...)"
                />
              </div>
              <script dangerouslySetInnerHTML={{ __html: `
                document.getElementById('estadoSelect').addEventListener('change', function() {
                  document.getElementById('motivoBajaSection').style.display = this.value === 'baja' ? 'flex' : 'none';
                });
              ` }} />
            </div>
          </div>

          {/* Bloque 2: Ubicación */}
          <div className="col-span-1 md:col-span-2 border-b border-white/10 pb-4 mb-2">
            <h3 className="text-lg font-medium text-white mb-4 text-primary">Dirección y Logística</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="form-label">Dirección Fiscal / Legal</label>
                <input type="text" name="direccionFiscal" defaultValue={empresa.direccionFiscal || ''} className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Dirección de Entrega</label>
                <input type="text" name="direccion" defaultValue={empresa.direccion || ''} className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Localidad</label>
                <input type="text" name="barrio" defaultValue={empresa.barrio || ''} className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Partido</label>
                <input type="text" name="partido" defaultValue={empresa.partido || ''} className="form-input" />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="form-label">Transporte Sugerido</label>
                <input type="text" name="transporte" defaultValue={empresa.transporte || ''} className="form-input" />
              </div>
            </div>
          </div>

          {/* Bloque 3: Contacto */}
          <div className="col-span-1 md:col-span-2 border-b border-white/10 pb-4 mb-2">
            <h3 className="text-lg font-medium text-white mb-4 text-primary">Contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="form-label">Celular / TEL.</label>
                <input type="text" name="telefono" defaultValue={empresa.telefono || ''} className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Correo Electrónico / e-mail empresa</label>
                <input type="email" name="email" defaultValue={empresa.email || ''} className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Vendedor Asignado</label>
                <input type="text" name="vendedorAsignado" defaultValue={empresa.vendedorAsignado || ''} className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Contacto principal (Responsable)</label>
                <input type="text" name="responsable" defaultValue={empresa.responsable || ''} className="form-input" />
              </div>
            </div>
          </div>

          {/* Bloque 4: Administración y Cobranzas */}
          <div className="col-span-1 md:col-span-2 border-b border-white/10 pb-4 mb-2">
            <h3 className="text-lg font-medium text-white mb-4 text-primary">Administración y Cobranzas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="form-label">Contacto de Cobranzas</label>
                <input type="text" name="contactoCobranzas" defaultValue={empresa.contactoCobranzas || ''} className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Días de pago</label>
                <input type="text" name="diasPago" defaultValue={empresa.diasPago || ''} className="form-input" />
              </div>
            </div>
          </div>

          {/* Bloque 5: Notas y CRM */}
          <div className="col-span-1 md:col-span-2 mb-4">
            <h3 className="text-lg font-medium text-white mb-4 text-primary">CRM Interno</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="form-label">Productos de Interés</label>
                <input type="text" name="productosInteres" defaultValue={empresa.productosInteres || ''} className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Ciclo de Venta Estimado (Días)</label>
                <input type="number" name="cicloVentaDias" defaultValue={empresa.cicloVentaDias?.toString() || ''} className="form-input" />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="form-label">Notas Adicionales (Tipo/Nº Cuenta, Cobrador, etc.)</label>
                <textarea name="notas" defaultValue={empresa.notas || ''} className="form-input min-h-[100px]"></textarea>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="col-span-1 md:col-span-2 flex justify-end gap-4 mt-4 pt-4 border-t border-white/10">
            <Link href={`/empresas/${empresaId}`} className="btn btn-secondary">
              Cancelar
            </Link>
            <button type="submit" className="btn btn-primary">
              <Save size={16} /> Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
