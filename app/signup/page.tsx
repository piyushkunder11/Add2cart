import AuthScreen from '@/components/AuthScreen'

// This page uses searchParams via AuthScreen, so it must be dynamic
export const dynamic = 'force-dynamic'

export default function SignupPage() {
  return <AuthScreen defaultTab="signup" />
}

