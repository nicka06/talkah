'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useToastContext } from '@/contexts/ToastContext'
import Image from 'next/image'

type VerificationState = 'loading' | 'success' | 'error' | 'password_reset'

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showSuccess, showError } = useToastContext()
  const [state, setState] = useState<VerificationState>('loading')
  const [message, setMessage] = useState('')
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: ''
  })
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const handleVerification = async () => {
      const token_hash = searchParams.get('token_hash')
      const type = searchParams.get('type')
      const next = searchParams.get('next') ?? '/dashboard'

      if (!token_hash || !type) {
        setState('error')
        setMessage('Invalid verification link. Please check your email and try again.')
        return
      }

      try {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any
        })

        if (error) throw error

        if (type === 'email_change') {
          setState('success')
          setMessage('Email successfully verified! Your email address has been updated.')
          
          // Show success toast and redirect after delay
          setTimeout(() => {
            showSuccess('Email Verified', 'Your email address has been successfully updated!')
            router.push(next)
          }, 2000)
        } else if (type === 'recovery') {
          setState('password_reset')
          setMessage('Please enter your new password below.')
        } else {
          setState('success')
          setMessage('Verification successful!')
          
          setTimeout(() => {
            router.push(next)
          }, 2000)
        }
      } catch (error: any) {
        console.error('Verification error:', error)
        setState('error')
        setMessage(error.message || 'Verification failed. Please try again.')
      }
    }

    handleVerification()
  }, [searchParams, router, supabase, showSuccess])

  const handlePasswordReset = async () => {
    if (!passwordForm.password || passwordForm.password.length < 6) {
      showError('Validation Error', 'Password must be at least 6 characters long')
      return
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      showError('Validation Error', 'Passwords do not match')
      return
    }

    setIsUpdatingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.password
      })

      if (error) throw error

      setState('success')
      setMessage('Password successfully updated!')
      
      setTimeout(() => {
        showSuccess('Password Reset', 'Your password has been successfully updated!')
        router.push('/dashboard')
      }, 2000)
    } catch (error: any) {
      console.error('Password update error:', error)
      showError('Update Failed', error.message || 'Failed to update password')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleReturnToDashboard = () => {
    router.push('/dashboard')
  }

  const handleReturnToAccount = () => {
    router.push('/dashboard/account')
  }

  const handleReturnToLogin = () => {
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-[#DC2626] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl shadow-lg border-2 border-black text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image 
              src="/talkah_logo.png" 
              alt="Talkah Logo" 
              width={64} 
              height={64} 
              className="rounded-full"
            />
          </div>

          <h1 className="font-graffiti text-3xl font-bold text-black mb-6">
            {state === 'password_reset' ? 'Reset Password' : 'Email Verification'}
          </h1>

          {state === 'loading' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-black">Verifying...</p>
            </div>
          )}

          {state === 'password_reset' && (
            <div className="space-y-6 text-left">
              <p className="text-black text-center">{message}</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-black font-semibold mb-2">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter your new password"
                    className="w-full px-4 py-3 border-2 border-black rounded-lg focus:border-red-500 focus:outline-none"
                    disabled={isUpdatingPassword}
                  />
                </div>
                
                <div>
                  <label className="block text-black font-semibold mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm your new password"
                    className="w-full px-4 py-3 border-2 border-black rounded-lg focus:border-red-500 focus:outline-none"
                    disabled={isUpdatingPassword}
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={handlePasswordReset}
                  disabled={isUpdatingPassword}
                  className="w-full px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold disabled:opacity-50"
                >
                  {isUpdatingPassword ? 'Updating Password...' : 'Reset Password'}
                </button>
                <button
                  onClick={handleReturnToLogin}
                  className="w-full px-6 py-3 border-2 border-black text-black rounded-lg hover:bg-black hover:text-white transition-colors font-semibold"
                >
                  Back to Login
                </button>
              </div>
            </div>
          )}

          {state === 'success' && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-black mb-2">Success!</h2>
                <p className="text-black/90 mb-6">{message}</p>
                <p className="text-black/70 text-sm mb-6">
                  You will be redirected in a few seconds...
                </p>
              </div>
              <div className="space-y-3">
                {message.includes('password') ? (
                  <button
                    onClick={handleReturnToLogin}
                    className="w-full px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold"
                  >
                    Go to Login
                  </button>
                ) : (
                  <button
                    onClick={handleReturnToAccount}
                    className="w-full px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold"
                  >
                    Go to Account Settings
                  </button>
                )}
                <button
                  onClick={handleReturnToDashboard}
                  className="w-full px-6 py-3 border-2 border-black text-black rounded-lg hover:bg-black hover:text-white transition-colors font-semibold"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-black mb-2">Verification Failed</h2>
                <p className="text-black/90 mb-6">{message}</p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={handleReturnToLogin}
                  className="w-full px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold"
                >
                  Back to Login
                </button>
                <button
                  onClick={handleReturnToDashboard}
                  className="w-full px-6 py-3 border-2 border-black text-black rounded-lg hover:bg-black hover:text-white transition-colors font-semibold"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-black/70 text-sm">
            Need help? Contact us at{' '}
            <a href="mailto:support@talkah.com" className="underline hover:text-black">
              support@talkah.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#DC2626] flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl shadow-lg border-2 border-black text-center">
            <div className="flex justify-center mb-6">
              <Image 
                src="/talkah_logo.png" 
                alt="Talkah Logo" 
                width={64} 
                height={64} 
                className="rounded-full"
              />
            </div>
            <h1 className="font-graffiti text-3xl font-bold text-black mb-6">Loading...</h1>
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
} 