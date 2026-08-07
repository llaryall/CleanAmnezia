import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CleanAmnezia - Cloudflare IP Scanner',
  description: 'Scan clean Cloudflare IPs and generate AmneziaWG configs',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="ltr">
      <body>
        <div className="grid-bg" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        {children}
      </body>
    </html>
  )
}