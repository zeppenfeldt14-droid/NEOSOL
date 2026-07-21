import { createEmpresa } from './actions'
import { ArrowLeft, Building2, Save, X } from 'lucide-react'
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

  // Fetch all rubros
  const rubros = await prisma.rubro.findMany({
    orderBy: { nombre: 'asc' }
  })

  // Fetch all major zones
  const todasLasZonas = await prisma.zona.findMany({
    orderBy: { nombre: 'asc' }
  })

  const getRubroDisplayName = (name: string) => {
    const match = name.match(/^CATEGORIA\s+(\d+)$/i);
    if (match) {
      return `Categoría ${match[1]}`;
    }
    return name;
  };

  const getRubroEmoji = (name: string) => {
    const mapping: Record<string, string> = {
      'CATEGORIA 1': '🍬',
      'CATEGORIA 2': '🍽️',
      'CATEGORIA 3': '🛒',
      'CATEGORIA 4': '🧀',
      'CATEGORIA 5': '🌱',
      'CATEGORIA 6': '🏪',
      'CATEGORIA 7': '🚚',
      'CATEGORIA 8': '🎉',
      'CATEGORIA 9': '❌',
      'CATEGORIA 10': '📦',
      'CATEGORIA 11': '🏥'
    };
    return mapping[name.toUpperCase()] || '🏷️';
  };

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

      <div className="glass-panel p-4 md:p-6">
        <form action={createEmpresa} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input type="hidden" name="defaultZona" value={decodedZona} />
          
          {/* Bloque 1: Información General */}
          <div className="col-span-1 md:col-span-2 bg-slate-800/50 p-4 md:p-6 rounded-xl border border-white/5 mb-6">
            <h3 className="text-lg font-medium text-white mb-4 text-primary text-center">Información General</h3>
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
                    {todasLasZonas.map(z => (
                      <option key={z.id} value={z.nombre}>{z.nombre}</option>
                    ))}
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
              <div className="flex flex-col gap-2">
                <label className="form-label">Rubro Comercial</label>
                <select name="rubro" defaultValue="CATEGORIA 1" className="form-input bg-dark">
                  {rubros.map(r => (
                    <option key={r.id} value={r.nombre}>
                      {getRubroEmoji(r.nombre)} {getRubroDisplayName(r.nombre)}
                    </option>
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
          <div className="col-span-1 md:col-span-2 bg-zinc-800/50 p-4 md:p-6 rounded-xl border border-white/5 mb-6">
            <h3 className="text-lg font-medium text-white mb-4 text-primary text-center">Dirección y Logística</h3>
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
          <div className="col-span-1 md:col-span-2 bg-indigo-900/20 p-4 md:p-6 rounded-xl border border-white/5 mb-6">
            <h3 className="text-lg font-medium text-white mb-4 text-primary text-center">Contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="form-label">Celular / TEL. (Principal / WhatsApp)</label>
                <input type="text" name="telefono" className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Teléfono #2 (Alternativo)</label>
                <input type="text" name="telefono2" className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Correo Electrónico / e-mail empresa</label>
                <input type="email" name="email" className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Sitio Web (URL)</label>
                <input type="url" name="url" className="form-input" placeholder="https://" />
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
          <div className="col-span-1 md:col-span-2 bg-emerald-900/20 p-4 md:p-6 rounded-xl border border-white/5 mb-6">
            <h3 className="text-lg font-medium text-white mb-4 text-primary text-center">Administración y Cobranzas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="form-label">Contacto de Cobranzas</label>
                <input type="text" name="contactoCobranzas" className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Días de pago</label>
                <input type="text" name="diasPago" className="form-input" />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <h4 className="text-sm font-semibold text-white/70 mt-2 mb-1">Datos Bancarios</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="form-label">Institución (Banco)</label>
                    <input type="text" name="bancoInstitucion" className="form-input" placeholder="Ej. Banco Galicia" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="form-label">Sucursal</label>
                    <input type="text" name="bancoSucursal" className="form-input" placeholder="Ej. Centro" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="form-label">Tipo y Nº de Cuenta / CBU / Alias</label>
                    <input type="text" name="bancoCuenta" className="form-input" placeholder="CBU, Alias o Número de cuenta" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bloque 5: CRM Interno */}
          <div className="col-span-1 md:col-span-2 bg-purple-900/20 p-4 md:p-6 rounded-xl border border-white/5 mb-6">
            <h3 className="text-lg font-medium text-white mb-4 text-primary text-center">CRM Interno</h3>
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
                <textarea name="notas" className="form-input min-h-[100px]" spellCheck={true} lang="es"></textarea>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="col-span-1 md:col-span-2 flex flex-col md:flex-row justify-end gap-3 mt-4 pt-4 border-t border-white/10">
            <Link href={`/zonas/${zonaName}/empresas`} className="btn btn-secondary w-full md:w-auto justify-center">
              <X size={16} className="md:hidden mr-2" /> Cancelar
            </Link>
            <button type="submit" className="btn btn-primary w-full md:w-auto justify-center">
              <Save size={16} /> <span className="hidden md:inline ml-1">Guardar Ficha de Alta</span><span className="md:hidden ml-1">Guardar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

