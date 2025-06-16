'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient()
      
      try {
        // Check if we have a code parameter (OAuth flow)
        const code = searchParams.get('code')
        
        if (code) {
          // Handle OAuth code exchange
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error('OAuth code exchange error:', error)
            router.push('/auth/login?error=oauth_failed')
            return
          }
        }
        
        // Get the current session
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/auth/login?error=callback_failed')
          return
        }

        if (data.session) {
          // Check for pending call data first
          const savedCallData = localStorage.getItem('talkah_pending_call')
          
          if (savedCallData) {
            // If there's pending call data, go to calls page
            // The calls page will handle populating the form and showing welcome message
            router.push('/dashboard/calls')
          } else {
            // No pending call data - this is either:
            // 1. A new user signing up (go to dashboard)
            // 2. A returning user logging in (go to dashboard)
            // In both cases, dashboard is the right place
            router.push('/dashboard')
          }
        } else {
          router.push('/auth/login')
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error)
        router.push('/auth/login?error=unexpected')
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-background-light flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-white font-bold text-xl">T</span>
        </div>
        <h2 className="font-graffiti text-2xl font-bold text-background-dark mb-2">
          COMPLETING SIGN IN...
        </h2>
        <p className="text-text-secondary">Please wait while we complete your authentication.</p>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-xl">T</span>
          </div>
          <h2 className="font-graffiti text-2xl font-bold text-background-dark mb-2">
            COMPLETING SIGN IN...
          </h2>
          <p className="text-text-secondary">Please wait while we complete your authentication.</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
} 