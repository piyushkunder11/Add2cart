import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PageTransition from '@/components/PageTransition'
import NavigationProgress from '@/components/NavigationProgress'
import AuthProvider from '@/components/AuthProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Add2Cart - Login & Signup',
  description: 'Login or create an account to continue shopping',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="m-0 p-0">
      <body className={`${inter.className} m-0 p-0`}>
        <AuthProvider>
          <NavigationProgress />
          <PageTransition>{children}</PageTransition>
        </AuthProvider>
      </body>
    </html>
  )
}

