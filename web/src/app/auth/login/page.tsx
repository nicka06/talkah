'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { AuthForm } from '@/components/auth/AuthForm'
import { useAuth } from '@/hooks/useAuth'

export default function SignInPage() {
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
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-background-light">
      {/* Header */}
      <header className="bg-background-dark text-white py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <h1 className="font-graffiti text-2xl font-bold text-primary">
                TALKAH
              </h1>
            </a>
          </div>
        </div>
      </header>

      {/* Sign In Form */}
      <main className="container mx-auto px-4 py-16">
        <AuthForm mode="signin" onSuccess={handleSuccess} />
      </main>
    </div>
  )
} 