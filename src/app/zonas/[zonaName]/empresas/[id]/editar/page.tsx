import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Save, X } from 'lucide-react'
import { updateEmpresa } from '../actions'
import { getSessionUser } from '@/lib/auth'
export const dynamic = 'force-dynamic'


export default async function EditarEmpresaPage({ params }: { params: Promise<{ id: string; zonaName: string }> }) {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }

  const { id, zonaName } = await params
  const decodedZona = decodeURIComponent(zonaName)
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

  // Security: level 3 users can only edit their assigned companies
  if (user.nivel === 3 && empresa.vendedorAsignado !== user.alias) {
    notFound()
  }

  // Fetch active users for the salesperson selector (only for N1/N2 users)
  const usuarios = await prisma.usuario.findMany({
    where: { activo: true },
    select: { nombre: true, alias: true }
  })

  // Fetch available sub-zones in DB for this company's major zone
  const subZonas = await prisma.subZona.findMany({
    where: { zona: empresa.zona || 'CABA' },
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

  const updateEmpresaWithId = updateEmpresa.bind(null, empresaId)

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
        <Link href={`/zonas/${zonaName}/empresas/${empresaId}`} className="btn btn-secondary">
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
          redirect(`/zonas/${zonaName}/empresas/${empresaId}`)
        }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Bloque 1: Información General */}
          <div className="col-span-1 md:col-span-2 bg-slate-800/50 p-4 md:p-6 rounded-xl border border-white/5 mb-6">
            <h3 className="text-lg font-medium text-white mb-4 text-primary text-center">Información General</h3>
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
                <label className="form-label">Sucursal (Zona Principal)</label>
                {user.nivel === 1 ? (
                  <select name="zona" defaultValue={empresa.zona || 'CABA'} className="form-input bg-dark">
                    {todasLasZonas.map(z => (
                      <option key={z.id} value={z.nombre}>{z.nombre}</option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input type="hidden" name="zona" value={empresa.zona || 'CABA'} />
                    <input type="text" className="form-input opacity-60 bg-black/20" value={empresa.zona || 'CABA'} disabled />
                  </>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Mini-Zona / Categoría (Sub-Zona)</label>
                <select name="subZona" defaultValue={empresa.subZona || 'SIN ASIGNAR'} className="form-input bg-dark">
                  <option value="SIN ASIGNAR">SIN ASIGNAR</option>
                  <option value="CORREO">CORREO</option>
                  {subZonas.map(sz => (
                    <option key={sz.id} value={sz.nombre}>{sz.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Rubro Comercial</label>
                <select name="rubro" defaultValue={empresa.rubro || 'CATEGORIA 1'} className="form-input bg-dark">
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
                      defaultChecked={empresa.ocultarVendedor} 
                      className="w-4 h-4 rounded border-white/10 bg-dark text-primary focus:ring-primary"
                    />
                    <span>Ocultar esta empresa para el Vendedor (Nivel 3)</span>
                  </label>
                </div>
              )}
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
          <div className="col-span-1 md:col-span-2 bg-zinc-800/50 p-4 md:p-6 rounded-xl border border-white/5 mb-6">
            <h3 className="text-lg font-medium text-white mb-4 text-primary text-center">Dirección y Logística</h3>
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
          <div className="col-span-1 md:col-span-2 bg-indigo-900/20 p-4 md:p-6 rounded-xl border border-white/5 mb-6">
            <h3 className="text-lg font-medium text-white mb-4 text-primary text-center">Contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="form-label">Celular / TEL. (Principal / WhatsApp)</label>
                <input type="text" name="telefono" defaultValue={empresa.telefono || ''} className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Teléfono #2 (Alternativo)</label>
                <input type="text" name="telefono2" defaultValue={empresa.telefono2 || ''} className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Correo Electrónico / e-mail empresa</label>
                <input type="email" name="email" defaultValue={empresa.email || ''} className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Sitio Web (URL)</label>
                <input type="url" name="url" defaultValue={empresa.url || ''} className="form-input" placeholder="https://" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Vendedor Asignado</label>
                {user.nivel === 3 ? (
                  <>
                    <input type="hidden" name="vendedorAsignado" value={empresa.vendedorAsignado || user.alias} />
                    <input type="text" className="form-input opacity-60 bg-black/20" value={`${empresa.vendedorAsignado || user.alias}`} disabled />
                  </>
                ) : (
                  <select name="vendedorAsignado" defaultValue={empresa.vendedorAsignado || ''} className="form-input bg-dark">
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
                <input type="text" name="responsable" defaultValue={empresa.responsable || ''} className="form-input" />
              </div>
            </div>
          </div>

          {/* Bloque 4: Administración y Cobranzas */}
          <div className="col-span-1 md:col-span-2 bg-emerald-900/20 p-4 md:p-6 rounded-xl border border-white/5 mb-6">
            <h3 className="text-lg font-medium text-white mb-4 text-primary text-center">Administración y Cobranzas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="form-label">Contacto de Cobranzas</label>
                <input type="text" name="contactoCobranzas" defaultValue={empresa.contactoCobranzas || ''} className="form-input" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="form-label">Días de pago</label>
                <input type="text" name="diasPago" defaultValue={empresa.diasPago || ''} className="form-input" />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <h4 className="text-sm font-semibold text-white/70 mt-2 mb-1">Datos Bancarios</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="form-label">Institución (Banco)</label>
                    <input type="text" name="bancoInstitucion" defaultValue={empresa.bancoInstitucion || ''} className="form-input" placeholder="Ej. Banco Galicia" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="form-label">Sucursal</label>
                    <input type="text" name="bancoSucursal" defaultValue={empresa.bancoSucursal || ''} className="form-input" placeholder="Ej. Centro" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="form-label">Tipo y Nº de Cuenta / CBU / Alias</label>
                    <input type="text" name="bancoCuenta" defaultValue={empresa.bancoCuenta || ''} className="form-input" placeholder="CBU, Alias o Número de cuenta" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bloque 5: Notas y CRM */}
          <div className="col-span-1 md:col-span-2 bg-purple-900/20 p-4 md:p-6 rounded-xl border border-white/5 mb-6">
            <h3 className="text-lg font-medium text-white mb-4 text-primary text-center">CRM Interno</h3>
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
          <div className="col-span-1 md:col-span-2 flex flex-col md:flex-row justify-end gap-3 mt-4 pt-4 border-t border-white/10">
            <Link href={`/empresas/${empresaId}`} className="btn btn-secondary w-full md:w-auto justify-center">
              <X size={16} className="md:hidden mr-2" /> Cancelar
            </Link>
            <button type="submit" className="btn btn-primary w-full md:w-auto justify-center">
              <Save size={16} /> <span className="hidden md:inline ml-1">Guardar Cambios</span><span className="md:hidden ml-1">Guardar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
