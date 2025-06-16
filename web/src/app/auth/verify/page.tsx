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
      const token_hash = searchParams.get('token_hash') || searchParams.get('token')
      const type = searchParams.get('type')
      const next = searchParams.get('next') ?? '/dashboard'

      console.log('Verification params:', { token_hash, type, next })

      if (!token_hash || !type) {
        setState('error')
        setMessage('Invalid verification link. Please check your email and try again.')
        return
      }

      try {
        // For email_change, use the correct verification method
        if (type === 'email_change') {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'email_change'
          })

          if (error) {
            console.error('Email change verification error:', error)
            throw error
          }

          // Email change was successful - now update the users table
          if (data.user) {
            try {
              // Get the current user's pending_email from the database
              const { data: userData, error: fetchError } = await supabase
                .from('users')
                .select('pending_email')
                .eq('id', data.user.id)
                .single()

              if (fetchError) {
                console.error('Error fetching user data:', fetchError)
              } else if (userData?.pending_email) {
                // Update the user's email in the database and clear pending_email
                const { error: updateError } = await supabase
                  .from('users')
                  .update({ 
                    email: userData.pending_email,
                    pending_email: null,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', data.user.id)

                if (updateError) {
                  console.error('Error updating user email in database:', updateError)
                } else {
                  console.log('Successfully updated user email in database')
                }
              }
            } catch (dbError) {
              console.error('Database update error:', dbError)
              // Don't fail the verification if DB update fails - email change was successful in auth
            }
          }

          setState('success')
          setMessage('Email successfully verified! Your email address has been updated.')
          
          // Show success toast and redirect after delay
          setTimeout(() => {
            showSuccess('Email Verified', 'Your email address has been successfully updated!')
            // Add query parameter to indicate successful email verification
            const redirectUrl = next.includes('?') 
              ? `${next}&verified=email` 
              : `${next}?verified=email`
            router.push(redirectUrl)
          }, 2000)
        } else if (type === 'recovery') {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'recovery'
          })

          if (error) throw error

          setState('password_reset')
          setMessage('Please enter your new password below.')
        } else {
          // For other types (signup, invite, etc.)
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any
          })

          if (error) throw error

          setState('success')
          setMessage('Verification successful!')
          
          setTimeout(() => {
            router.push(next)
          }, 2000)
        }
      } catch (error: any) {
        console.error('Verification error:', error)
        setState('error')
        
        // Provide more specific error messages
        if (error.message?.includes('expired')) {
          setMessage('This verification link has expired. Please request a new one.')
        } else if (error.message?.includes('invalid')) {
          setMessage('This verification link is invalid. Please check your email for the correct link.')
        } else {
          setMessage(error.message || 'Verification failed. Please try again or contact support.')
        }
      }
    }

    handleVerification()
  }, [searchParams, supabase.auth, showSuccess, router])

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
    <div className="min-h-screen bg-[#DC2626] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-sm p-6 sm:p-8 rounded-xl shadow-lg border-2 border-black text-center">
          {/* Logo */}
          <div className="flex justify-center mb-4 sm:mb-6">
            <Image 
              src="/talkah_logo.png" 
              alt="Talkah Logo" 
              width={64} 
              height={64} 
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full"
            />
          </div>

          {/* Status Icon and Title */}
          {state === 'loading' && (
            <>
              <div className="mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h1 className="font-graffiti text-2xl sm:text-3xl font-bold text-black mb-2">
                  VERIFYING...
                </h1>
                <p className="text-black/80 text-sm sm:text-base">
                  Please wait while we verify your request
                </p>
              </div>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="font-graffiti text-2xl sm:text-3xl font-bold text-black mb-2">
                  VERIFIED!
                </h1>
                <p className="text-black/80 text-sm sm:text-base mb-4 sm:mb-6">
                  {message}
                </p>
                <div className="space-y-3">
                  <button
                    onClick={handleReturnToDashboard}
                    className="w-full bg-black text-white py-3 rounded-lg font-graffiti text-lg hover:bg-gray-800 transition-colors touch-manipulation"
                  >
                    GO TO DASHBOARD
                  </button>
                  <button
                    onClick={handleReturnToAccount}
                    className="w-full bg-white/20 text-black border-2 border-black py-3 rounded-lg font-semibold hover:bg-white/30 transition-colors text-sm sm:text-base touch-manipulation"
                  >
                    Return to Account Settings
                  </button>
                </div>
              </div>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="font-graffiti text-2xl sm:text-3xl font-bold text-black mb-2">
                  VERIFICATION FAILED
                </h1>
                <p className="text-black/80 text-sm sm:text-base mb-4 sm:mb-6">
                  {message}
                </p>
                <div className="space-y-3">
                  <button
                    onClick={handleReturnToLogin}
                    className="w-full bg-black text-white py-3 rounded-lg font-graffiti text-lg hover:bg-gray-800 transition-colors touch-manipulation"
                  >
                    BACK TO LOGIN
                  </button>
                  <button
                    onClick={handleReturnToAccount}
                    className="w-full bg-white/20 text-black border-2 border-black py-3 rounded-lg font-semibold hover:bg-white/30 transition-colors text-sm sm:text-base touch-manipulation"
                  >
                    Account Settings
                  </button>
                </div>
              </div>
            </>
          )}

          {state === 'password_reset' && (
            <>
              <div className="mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3a1 1 0 011-1h2.586l6.243-6.243C11.645 9.38 11 8.38 11 7.111A6 6 0 0117 1z" />
                  </svg>
                </div>
                <h1 className="font-graffiti text-2xl sm:text-3xl font-bold text-black mb-2">
                  RESET PASSWORD
                </h1>
                <p className="text-black/80 text-sm sm:text-base mb-4 sm:mb-6">
                  {message}
                </p>
                
                <div className="space-y-4 text-left">
                  <div>
                    <label htmlFor="password" className="block text-black font-semibold mb-2 text-sm sm:text-base">
                      New Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      placeholder="Enter new password"
                      value={passwordForm.password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                      className="w-full px-4 py-4 bg-white/20 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black placeholder-black/70 text-base"
                      disabled={isUpdatingPassword}
                      autoComplete="new-password"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-black font-semibold mb-2 text-sm sm:text-base">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full px-4 py-4 bg-white/20 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black placeholder-black/70 text-base"
                      disabled={isUpdatingPassword}
                      autoComplete="new-password"
                    />
                  </div>
                  
                  <button
                    onClick={handlePasswordReset}
                    disabled={isUpdatingPassword || !passwordForm.password || !passwordForm.confirmPassword}
                    className="w-full bg-black text-white py-4 rounded-lg font-graffiti text-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  >
                    {isUpdatingPassword ? 'UPDATING...' : 'UPDATE PASSWORD'}
                  </button>
                </div>
              </div>
            </>
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