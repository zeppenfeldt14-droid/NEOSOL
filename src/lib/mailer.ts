import nodemailer from 'nodemailer'

export const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'mail.galletitasneosol.com.ar',
  port: Number(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
})

export async function sendReportEmail(
  to: string,
  subject: string,
  htmlBody: string,
  pdfBuffer?: Buffer
) {
  const mailOptions: nodemailer.SendMailOptions = {
    from: `"CRM Neosol" <${process.env.MAIL_FROM}>`,
    to,
    subject,
    html: htmlBody,
    attachments: pdfBuffer
      ? [
          {
            filename: `reporte-visitas-${new Date().toISOString().slice(0, 10)}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ]
      : [],
  }

  return transporter.sendMail(mailOptions)
}
