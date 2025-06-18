'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useToastContext } from '@/contexts/ToastContext'
import { Navigation } from '@/components/shared/Navigation'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const { showSuccess, showError } = useToastContext()

  // The access token is no longer directly in the URL fragment.
  // Supabase handles it in the session when the user clicks the link.
  
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (password.length < 6) {
        showError('Password Error', 'Password must be at least 6 characters long.')
        setLoading(false)
        return
    }

    try {
      // The user's session is automatically updated when they click the magic link.
      // We just need to call updateUser with the new password.
      const { error } = await supabase.auth.updateUser({ password: password })

      if (error) throw error

      showSuccess(
          'Password Updated!', 
          'Your password has been successfully updated. You can now sign in with your new password.',
          { duration: 6000 }
      )
      
      // Redirect to the sign-in page after a short delay
      setTimeout(() => {
          router.push('/auth/login')
      }, 2000)

    } catch (error: any) {
      showError('Update Failed', error.message || 'Failed to update password.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="container mx-auto px-4 py-8 sm:py-16">
        <div className="max-w-md mx-auto">
          <div className="bg-white border-2 border-black rounded-2xl shadow-xl p-6 sm:p-8 text-black">
            <h2 className="font-graffiti text-2xl sm:text-3xl text-black mb-4 sm:mb-6 text-center">
              RESET YOUR PASSWORD
            </h2>
            <p className="text-center text-black/80 mb-4 sm:mb-6 text-sm sm:text-base">
              Enter a new password for your account below.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <input
                  type="password"
                  placeholder="New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-4 bg-white border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black placeholder-black/70 text-base"
                  required
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full border-2 border-black text-black bg-white py-4 rounded-lg font-graffiti text-lg sm:text-xl hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                {loading ? 'SAVING...' : 'SAVE NEW PASSWORD'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}


export default function ResetPasswordPage() {
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
        <ResetPasswordContent />
      </Suspense>
    )
  } 