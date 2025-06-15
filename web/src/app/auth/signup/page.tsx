'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useCallback, Suspense } from 'react'
import { AuthForm } from '@/components/auth/AuthForm'
import { useAuth } from '@/hooks/useAuth'
import { Navigation } from '@/components/shared/Navigation'

function SignUpContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading, signInWithOAuth } = useAuth()

  // Redirect if already signed in - CHECK FOR PENDING CALL DATA HERE
  useEffect(() => {
    if (!loading && user) {
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
  }, [user, loading, router, searchParams])

  const handleSuccess = () => {
    // This function is called for email/password auth
    // The redirect logic is now handled in the useEffect above
    // But we keep this for consistency
    const savedCallData = localStorage.getItem('talkah_pending_call')
    
    if (savedCallData) {
      router.push('/dashboard/calls')
    } else {
      const redirectTo = searchParams.get('redirectTo') || '/dashboard'
      router.push(redirectTo)
    }
  }

  // OAuth handler for Google and Apple
  const handleOAuth = useCallback(async (provider: 'google' | 'apple') => {
    await signInWithOAuth(provider);
  }, [signInWithOAuth]);

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
      {/* Navigation */}
      <Navigation />

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
              <button onClick={() => handleOAuth('google')} className="w-full flex items-center justify-center border-2 border-black text-black font-semibold py-2 rounded-lg hover:bg-black hover:text-white transition-colors">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48"><g><path fill='#4285F4' d='M24 9.5c3.54 0 6.36 1.53 7.82 2.81l5.74-5.74C34.36 3.36 29.64 1 24 1 14.82 1 6.98 6.98 3.69 15.09l6.67 5.18C12.13 14.09 17.62 9.5 24 9.5z'/><path fill='#34A853' d='M46.1 24.5c0-1.64-.15-3.22-.42-4.74H24v9.04h12.42c-.54 2.9-2.16 5.36-4.6 7.04l7.1 5.52C43.98 37.02 46.1 31.18 46.1 24.5z'/><path fill='#FBBC05' d='M10.36 28.27c-1.04-3.09-1.04-6.45 0-9.54l-6.67-5.18C1.1 17.36 0 20.57 0 24c0 3.43 1.1 6.64 3.69 10.45l6.67-5.18z'/><path fill='#EA4335' d='M24 46.5c5.64 0 10.36-1.87 13.8-5.09l-7.1-5.52c-1.97 1.33-4.5 2.11-6.7 2.11-6.38 0-11.87-4.59-13.64-10.77l-6.67 5.18C6.98 41.02 14.82 46.5 24 46.5z'/></g></svg>
                Sign up with Google
              </button>
              <button onClick={() => handleOAuth('apple')} className="w-full flex items-center justify-center border-2 border-black text-black font-semibold py-2 rounded-lg hover:bg-black hover:text-white transition-colors">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M16.365 1.43c0 1.14-.93 2.07-2.07 2.07-.06 0-.12 0-.18-.01-.01-.06-.01-.13-.01-.19 0-1.13.92-2.06 2.06-2.06.07 0 .13 0 .19.01.01.06.01.13.01.18zm4.13 6.98c-.06-.05-1.19-.86-2.48-.85-1.01.01-1.44.48-2.7.48-1.25 0-1.67-.47-2.7-.48-1.3-.01-2.48.8-2.54.85-.7.5-2.01 1.78-2.01 4.09 0 3.01 2.36 6.13 4.2 6.13.8 0 1.13-.46 2.13-.46 1 0 1.29.46 2.13.46 1.85 0 4.2-3.12 4.2-6.13 0-2.31-1.31-3.59-2.01-4.09z"/></svg>
                Sign up with Apple
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-600 font-bold text-lg">T</span>
          </div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  )
} 