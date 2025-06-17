'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Navigation } from '@/components/shared/Navigation'
import { useToastContext } from '@/contexts/ToastContext'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { showSuccess, showError } = useToastContext()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check if we have access token and refresh token from the email link
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    
    if (accessToken && refreshToken) {
      // Set the session with the tokens from the email
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
    }
  }, [searchParams, supabase])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password.length < 6) {
      showError('Invalid Password', 'Password must be at least 6 characters long')
      return
    }
    
    if (password !== confirmPassword) {
      showError('Password Mismatch', 'Passwords do not match')
      return
    }

    setIsLoading(true)
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      showSuccess('Password Updated', 'Your password has been successfully updated!')
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Password reset error:', error)
      showError('Reset Failed', error.message || 'Failed to update password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <div className="bg-white border-2 border-black rounded-2xl shadow-xl p-8">
          <h1 className="font-graffiti text-2xl font-bold text-black mb-6 text-center">
            Reset Your Password
          </h1>
          
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-black font-semibold mb-2">
                New Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-4 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black placeholder-black/70"
                required
                minLength={6}
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-black font-semibold mb-2">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-4 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black placeholder-black/70"
                required
                minLength={6}
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="w-full bg-black text-white py-4 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#DC2626]">
      <Navigation />
      
      <Suspense fallback={
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto">
            <div className="bg-white border-2 border-black rounded-2xl shadow-xl p-8">
              <div className="text-center">
                <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <p className="text-black">Loading...</p>
              </div>
            </div>
          </div>
        </main>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
} 