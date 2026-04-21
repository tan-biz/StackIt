import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'StackIt - Pickleball Game Manager',
  description: 'Organize and manage your pickleball games with ease',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-body antialiased">
        {children}
      </body>
    </html>
  )
}
