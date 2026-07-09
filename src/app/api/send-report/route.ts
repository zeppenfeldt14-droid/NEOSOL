import { sendReportEmail } from '@/lib/mailer'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { pdfBase64, emailTo, dateStr } = body

    if (!pdfBase64 || !emailTo) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const pdfBuffer = Buffer.from(pdfBase64.split(',')[1], 'base64')

    await sendReportEmail(
      emailTo,
      `Reporte de Visitas Neosol - ${dateStr}`,
      `
      <div style="font-family: sans-serif; color: #333;">
        <h2>Reporte de Visitas</h2>
        <p>Adjunto encontrarás el reporte de visitas correspondiente al ${dateStr}.</p>
        <br/>
        <p>Atentamente,</p>
        <p><strong>Ernesto Lares</strong><br/>Ventas en Terreno - Neosol</p>
      </div>
      `,
      pdfBuffer
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error enviando correo:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
