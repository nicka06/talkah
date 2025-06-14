'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient()
      
      try {
        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/auth/login?error=callback_failed')
          return
        }

        if (data.session) {
          // Check for pending call data
          const savedCallData = localStorage.getItem('talkah_pending_call')
          
          if (savedCallData) {
            router.push('/dashboard/calls')
          } else {
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
  }, [router])

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