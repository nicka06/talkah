import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authentication - TALKAH | Sign In or Sign Up',
  description: 'Sign in or create your TALKAH account to access AI-powered phone calls, smart emails, and intelligent conversations.',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 