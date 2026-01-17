import AuthScreen from '@/components/AuthScreen'

// This page uses searchParams via AuthScreen, so it must be dynamic
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return <AuthScreen defaultTab="login" />
}

