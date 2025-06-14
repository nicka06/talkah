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
      <header className="text-black py-4 border-b-2 border-black">
        <div className="flex items-center justify-between px-6">
          <a href="/" className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <h1 className="font-graffiti text-2xl font-bold text-black">
              TALKAH
            </h1>
          </a>
          <nav className="flex space-x-6">
            <a
              href="/auth/login"
              className="px-6 py-2 rounded-lg font-semibold border-2 border-black text-black hover:bg-black hover:text-white transition-colors"
            >
              Sign In
            </a>
          </nav>
        </div>
      </header>

      {/* Sign Up Form */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="bg-white border-2 border-black rounded-2xl shadow-xl p-8 text-black">
            <AuthForm mode="signup" onSuccess={handleSuccess} />
            <div className="flex items-center my-6">
              <div className="flex-grow border-t border-black" />
              <span className="mx-4 text-black/70 font-semibold">or</span>
              <div className="flex-grow border-t border-black" />
            </div>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center border-2 border-black text-black font-semibold py-2 rounded-lg hover:bg-black hover:text-white transition-colors">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.36 1.53 7.82 2.81l5.74-5.74C34.36 3.36 29.64 1 24 1 14.82 1 6.98 6.98 3.69 15.09l6.67 5.18C12.13 14.09 17.62 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.5c0-1.64-.15-3.22-.42-4.74H24v9.04h12.42c-.54 2.9-2.16 5.36-4.6 7.04l7.1 5.52C43.98 37.02 46.1 31.18 46.1 24.5z"/><path fill="#FBBC05" d="M10.36 28.27c-1.04-3.09-1.04-6.45 0-9.54l-6.67-5.18C1.1 17.36 0 20.57 0 24c0 3.43 1.1 6.64 3.69 10.45l6.67-5.18z"/><path fill="#EA4335" d="M24 46.5c5.64 0 10.36-1.87 13.8-5.09l-7.1-5.52c-1.97 1.33-4.5 2.11-6.7 2.11-6.38 0-11.87-4.59-13.64-10.77l-6.67 5.18C6.98 41.02 14.82 46.5 24 46.5z"/></g></svg>
                Sign up with Google
              </button>
              <button className="w-full flex items-center justify-center border-2 border-black text-black font-semibold py-2 rounded-lg hover:bg-black hover:text-white transition-colors">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48"><g><path fill="#24292F" d="M24 1C11.85 1 2 10.85 2 23c0 9.74 6.28 17.98 15.01 20.88 1.1.2 1.5-.48 1.5-1.07 0-.53-.02-1.93-.03-3.79-6.1 1.33-7.39-2.94-7.39-2.94-1-2.54-2.44-3.22-2.44-3.22-2-1.37.15-1.34.15-1.34 2.21.16 3.38 2.27 3.38 2.27 1.96 3.36 5.15 2.39 6.41 1.83.2-1.42.77-2.39 1.4-2.94-4.87-.55-10-2.44-10-10.87 0-2.4.86-4.36 2.27-5.89-.23-.56-.99-2.8.22-5.84 0 0 1.84-.59 6.03 2.25A20.9 20.9 0 0124 13.5c1.87.01 3.76.25 5.53.73 4.19-2.84 6.03-2.25 6.03-2.25 1.21 3.04.45 5.28.22 5.84 1.41 1.53 2.27 3.49 2.27 5.89 0 8.45-5.14 10.31-10.03 10.85.79.68 1.5 2.03 1.5 4.09 0 2.95-.03 5.33-.03 6.06 0 .59.39 1.28 1.51 1.06C41.72 40.97 48 32.73 48 23c0-12.15-9.85-22-22-22z"/></g></svg>
                Sign up with GitHub
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 