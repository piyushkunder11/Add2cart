'use client'

import { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

/**
 * Previously this component wrapped every route change in a Framer Motion
 * animation, which added ~400ms of artificial delay before the next page
 * appeared. We now just render children directly so navigation feels instant.
 */
export default function PageTransition({ children }: PageTransitionProps) {
  return <div className="min-h-screen">{children}</div>
}

