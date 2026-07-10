import { createEmpresa } from './actions'
import { ArrowLeft, Building2, Save } from 'lucide-react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function NuevaEmpresaPage({ params }: { params: Promise<{ zonaName: string }> }) {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }

  const { zonaName } = await params
  const decodedZona = decodeURIComponent(zonaName)

  // Fetch active users for the salesperson select field (N1/N2 only)
  const usuarios = await prisma.usuario.findMany({
    where: { activo: true },
    select: { nombre: true, alias: true }
  })

  // Fetch available sub-zones in DB for this major zone
  const subZonas = await prisma.subZona.findMany({
    where: { zona: decodedZona },
    orderBy: { nombre: 'asc' }
  })

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/zonas/${zonaName}/empresas`} className="btn btn-secondary">
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
          <input type="hidden" name="defaultZona" value={decodedZona} />
          
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
                <label className="form-label">Sucursal (Zona Principal)</label>
                {user.nivel === 1 ? (
                  <select name="zona" defaultValue={decodedZona} className="form-input bg-dark">
                    <option value="CABA">CABA</option>
                    <option value="Zona SUR">Zona SUR</option>
                    <option value="Zona OESTE">Zona OESTE</option>
                    <option value="Zona NORTE">Zona NORTE</option>
                  </select>
                ) : (
                  <>
                    <input type="hidden" name="zona" value={decodedZona} />
                    <input type="text" className="form-input opacity-60 bg-black/20" value={decodedZona} disabled />
                  </>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Mini-Zona / Categoría (Sub-Zona)</label>
                <select name="subZona" defaultValue="SIN ASIGNAR" className="form-input bg-dark">
                  <option value="SIN ASIGNAR">SIN ASIGNAR</option>
                  <option value="CORREO">CORREO</option>
                  {subZonas.map(sz => (
                    <option key={sz.id} value={sz.nombre}>{sz.nombre}</option>
                  ))}
                </select>
              </div>
              {user.nivel === 1 && (
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="form-label flex items-center gap-2 cursor-pointer mt-2">
                    <input 
                      type="checkbox" 
                      name="ocultarVendedor" 
                      className="w-4 h-4 rounded border-white/10 bg-dark text-primary focus:ring-primary"
                    />
                    <span>Ocultar esta empresa para el Vendedor (Nivel 3)</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Bloque 2: Dirección y Logística */}
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
                {user.nivel === 3 ? (
                  <>
                    <input type="hidden" name="vendedorAsignado" value={user.alias} />
                    <input type="text" className="form-input opacity-60 bg-black/20" value={`${user.alias}`} disabled />
                  </>
                ) : (
                  <select name="vendedorAsignado" defaultValue="" className="form-input bg-dark">
                    <option value="">Sin Asignar</option>
                    {usuarios.map(u => (
                      <option key={u.alias} value={u.alias}>
                        {u.nombre} (@{u.alias})
                      </option>
                    ))}
                  </select>
                )}
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

          {/* Bloque 5: CRM Interno */}
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
            <Link href={`/zonas/${zonaName}/empresas`} className="btn btn-secondary">
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

