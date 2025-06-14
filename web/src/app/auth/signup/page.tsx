'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { AuthForm } from '@/components/auth/AuthForm'
import { useAuth } from '@/hooks/useAuth'

export default function SignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()

  // Redirect if already signed in
  useEffect(() => {
    if (!loading && user) {
      const redirectTo = searchParams.get('redirectTo') || '/dashboard'
      router.push(redirectTo)
    }
  }, [user, loading, router, searchParams])

  const handleSuccess = () => {
    // Check if there's saved call data in localStorage
    const savedCallData = localStorage.getItem('talkah_pending_call')
    
    if (savedCallData) {
      // Redirect to calls page to complete the pending call
      router.push('/dashboard/calls')
    } else {
      // Normal redirect to dashboard
      const redirectTo = searchParams.get('redirectTo') || '/dashboard'
      router.push(redirectTo)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-600 font-bold text-lg">T</span>
          </div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="text-white py-4 border-b-2 border-white">
        <div className="container mx-auto px-8">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-bold text-lg">T</span>
              </div>
              <h1 className="font-graffiti text-2xl font-bold text-white">
                TALKAH
              </h1>
            </a>
            <nav className="flex space-x-6">
              <a
                href="/auth/login"
                className="px-6 py-2 rounded-lg font-semibold border-2 border-white text-white hover:bg-white hover:text-primary-600 transition-colors"
              >
                Sign In
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Sign Up Form */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <AuthForm mode="signup" onSuccess={handleSuccess} />
        </div>
      </main>
    </div>
  )
} 