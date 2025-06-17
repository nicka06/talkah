'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Navigation } from '@/components/shared/Navigation'
import { BackButton } from '@/components/shared/BackButton'
import { createClient } from '@/lib/supabase'
import { useToastContext } from '@/contexts/ToastContext'

export default function AccountPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { showSuccess, showError, showWarning, showInfo } = useToastContext()
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [emailForm, setEmailForm] = useState({ newEmail: '' })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [isResending, setIsResending] = useState(false)
  const [lastEmailChangeTime, setLastEmailChangeTime] = useState<number>(0)
  const supabase = createClient()

  // Fetch user profile including pending_email
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error fetching user profile:', error)
          return
        }

        setUserProfile(data)
        setPendingEmail(data?.pending_email || null)
      } catch (error) {
        console.error('Error fetching user profile:', error)
      }
    }

    fetchUserProfile()
  }, [user?.id, supabase])

  // Listen for route changes to refresh data when returning from email verification
  useEffect(() => {
    const handleRouteChange = () => {
      if (user?.id) {
        // Refresh user profile when returning to this page
        setTimeout(() => {
          const fetchUpdatedProfile = async () => {
            try {
              const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single()

              if (!error && data) {
                setUserProfile(data)
                setPendingEmail(data?.pending_email || null)
                
                // If pending_email was cleared, show success message
                if (pendingEmail && !data.pending_email) {
                  showSuccess('Email Updated', 'Your email address has been successfully updated!')
                }
              }
            } catch (error) {
              console.error('Error refreshing user profile:', error)
            }
          }
          fetchUpdatedProfile()
        }, 1000) // Small delay to ensure database has been updated
      }
    }

    // Check if we're returning from email verification
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('verified') === 'email') {
      handleRouteChange()
    }
  }, [user?.id, supabase, pendingEmail, showSuccess])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  // Countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (resendCountdown > 0) {
      interval = setInterval(() => {
        setResendCountdown(prev => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [resendCountdown])

  const generatePasswordMask = (length: number = 10) => {
    return '*'.repeat(length)
  }

  const validateEmail = (email: string) => {
    return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)
  }

  const validatePasswordChange = () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm
    
    if (!currentPassword) {
      showError('Validation Error', 'Please enter your current password')
      return false
    }
    
    if (!newPassword || newPassword.length < 6) {
      showError('Validation Error', 'New password must be at least 6 characters')
      return false
    }
    
    if (newPassword === currentPassword) {
      showError('Validation Error', 'New password must be different from current password')
      return false
    }
    
    if (newPassword !== confirmPassword) {
      showError('Validation Error', 'Passwords do not match')
      return false
    }
    
    return true
  }

  const handleEmailChange = async () => {
    if (!emailForm.newEmail) {
      showError('Validation Error', 'Please enter an email address')
      return
    }
    
    if (!validateEmail(emailForm.newEmail)) {
      showError('Validation Error', 'Please enter a valid email address')
      return
    }
    
    if (emailForm.newEmail === user?.email) {
      showWarning('Same Email', 'This is already your current email address')
      return
    }

    // Prevent duplicate requests with debouncing
    const now = Date.now()
    if (isProcessing || (now - lastEmailChangeTime < 30000)) {
      showWarning('Please Wait', 'Please wait at least 30 seconds between email change requests.')
      return
    }

    // Check if there's already a pending email change
    if (pendingEmail) {
      showWarning('Email Change Pending', `You already have a pending email change to ${pendingEmail}. Please verify that email first or cancel the current change.`)
      return
    }

    setIsProcessing(true)
    setLastEmailChangeTime(now)
    
    try {
      // Step 1: Store the pending email in the database FIRST
      const { error: dbError } = await supabase
        .from('users')
        .update({ pending_email: emailForm.newEmail })
        .eq('id', user!.id)

      if (dbError) {
        // If pending_email column doesn't exist, we need to add it
        if (dbError.message.includes('column "pending_email" of relation "users" does not exist')) {
          showError('Database Error', 'The email verification system needs to be set up. Please contact support.')
          return
        }
        throw dbError
      }

      // Step 2: Update local state immediately (UI shows pending state)
      setPendingEmail(emailForm.newEmail)
      setShowEmailDialog(false)
      setEmailForm({ newEmail: '' })

      // Step 3: Trigger the Supabase auth email change (sends verification email)
      const { data, error } = await supabase.auth.updateUser({
        email: emailForm.newEmail
      })

      if (error) {
        // Rollback the pending_email if auth update fails
        await supabase
          .from('users')
          .update({ pending_email: null })
          .eq('id', user!.id)
        setPendingEmail(null)
        throw error
      }
      
      // Start the 60-second countdown
      setResendCountdown(60)
      
      showInfo(
        'Verification Email Sent', 
        `A verification email has been sent to your CURRENT email address (${user?.email}). Click the link in that email to confirm the change to ${emailForm.newEmail}.`,
        { duration: 10000 }
      )
    } catch (error: any) {
      console.error('Error updating email:', error)
      if (error.message?.includes('rate limit') || error.message?.includes('frequency')) {
        showError('Rate Limited', 'You are sending requests too quickly. Please wait a moment before trying again.')
      } else if (error.message?.includes('same email')) {
        showWarning('Same Email', 'This email address is already associated with your account.')
      } else {
        showError('Update Failed', `Failed to update email: ${error.message}`)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleResendEmail = async () => {
    if (!pendingEmail || resendCountdown > 0 || isResending) return

    setIsResending(true)
    try {
      // Resend the verification email to the OLD email address
      const { error: authError } = await supabase.auth.updateUser({
        email: pendingEmail
      })

      if (authError) throw authError

      // Restart the 60-second countdown
      setResendCountdown(60)
      
      showInfo(
        'Verification Email Resent', 
        `A new verification email has been sent to your CURRENT email address (${user?.email}). Click the link to confirm the change to ${pendingEmail}.`,
        { duration: 8000 }
      )
    } catch (error: any) {
      console.error('Error resending email:', error)
      showError('Resend Failed', `Failed to resend email: ${error.message}`)
    } finally {
      setIsResending(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!validatePasswordChange()) return

    setIsProcessing(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (error) throw error

      setShowPasswordDialog(false)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      showSuccess('Password Updated', 'Your password has been updated successfully!')
    } catch (error: any) {
      console.error('Error updating password:', error)
      showError('Update Failed', `Failed to update password: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const cancelEmailChange = async () => {
    try {
      // Clear the pending_email from the database
      const { error } = await supabase
        .from('users')
        .update({ pending_email: null })
        .eq('id', user!.id)

      if (error) throw error

      setPendingEmail(null)
      showInfo('Email Change Cancelled', 'Your email change request has been cancelled')
    } catch (error: any) {
      console.error('Error cancelling email change:', error)
      showError('Cancel Failed', 'Failed to cancel email change')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#DC2626]">
        <div className="text-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-600 font-bold text-lg">T</span>
          </div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  const emailPendingVerification = !!pendingEmail

  return (
    <div className="min-h-screen bg-[#DC2626]">
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 sm:py-16">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <div className="flex justify-start mb-6 sm:mb-8">
            <BackButton text="Dashboard" href="/dashboard" />
          </div>

          <h1 className="font-graffiti text-3xl sm:text-5xl md:text-6xl font-bold text-black mb-4 sm:mb-8 text-center">
            ACCOUNT SETTINGS
          </h1>

          {/* Single Account Card */}
          <div className="bg-white border-2 border-black rounded-xl p-6 sm:p-8">
            <div className="space-y-6">
              {/* Email Row */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="block text-black font-semibold mb-1 text-sm sm:text-base">Email</label>
                  <p className="text-black/70 text-sm sm:text-base break-all">{user?.email}</p>
                  {pendingEmail && (
                    <p className="text-blue-600 text-xs mt-1">
                      Pending: {pendingEmail}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowEmailDialog(true)}
                  className="w-10 h-10 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center ml-4"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>

              {/* Divider */}
              <hr className="border-black/20" />

              {/* Password Row */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="block text-black font-semibold mb-1 text-sm sm:text-base">Password</label>
                  <p className="text-black/70 font-mono text-sm sm:text-base">••••••••••</p>
                </div>
                <button
                  onClick={() => setShowPasswordDialog(true)}
                  className="w-10 h-10 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center ml-4"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Simplified Email Change Dialog */}
      {showEmailDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black rounded-xl p-6 sm:p-8 w-full max-w-md">
            <h3 className="font-graffiti text-xl sm:text-2xl font-bold text-black mb-4 sm:mb-6">
              Change Email
            </h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="newEmail" className="block text-black font-semibold mb-2 text-sm sm:text-base">
                  New Email Address
                </label>
                <input
                  id="newEmail"
                  type="email"
                  placeholder="Enter new email address"
                  value={emailForm.newEmail}
                  onChange={(e) => setEmailForm({ newEmail: e.target.value })}
                  className="w-full px-4 py-4 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black placeholder-black/70 text-base"
                  disabled={isProcessing}
                  autoComplete="email"
                  inputMode="email"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleEmailChange}
                  disabled={isProcessing || !emailForm.newEmail}
                  className="flex-1 bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {isProcessing ? 'Sending...' : 'Send Verification'}
                </button>
                <button
                  onClick={() => {
                    setShowEmailDialog(false)
                    setEmailForm({ newEmail: '' })
                  }}
                  disabled={isProcessing}
                  className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simplified Password Change Dialog */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black rounded-xl p-6 sm:p-8 w-full max-w-md">
            <h3 className="font-graffiti text-xl sm:text-2xl font-bold text-black mb-4 sm:mb-6">
              Reset Password
            </h3>
            
            <div className="space-y-4">
              <p className="text-black/70 text-sm">
                We'll send a password reset link to your email address.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    setIsProcessing(true)
                    try {
                      console.log('🔄 Attempting password reset for:', user!.email!)
                      
                      const { data, error } = await supabase.auth.resetPasswordForEmail(
                        user!.email!, 
                        {
                          redirectTo: `${window.location.origin}/auth/reset-password`
                        }
                      )
                      
                      console.log('📧 Password reset response:', { data, error })
                      
                      if (error) {
                        console.error('❌ Password reset error:', error)
                        throw error
                      }
                      
                      console.log('✅ Password reset email sent successfully')
                      showSuccess('Reset Email Sent', 'Check your email for password reset instructions')
                      setShowPasswordDialog(false)
                    } catch (error: any) {
                      console.error('💥 Password reset failed:', error)
                      
                      // Show specific error messages
                      let errorMessage = 'Failed to send reset email'
                      if (error.message?.includes('rate limit') || error.message?.includes('frequency')) {
                        errorMessage = 'Too many requests. Please wait before trying again.'
                      } else if (error.message?.includes('not found')) {
                        errorMessage = 'Email address not found.'
                      } else if (error.message) {
                        errorMessage = error.message
                      }
                      
                      showError('Reset Failed', errorMessage)
                    } finally {
                      setIsProcessing(false)
                    }
                  }}
                  disabled={isProcessing}
                  className="flex-1 bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 text-sm sm:text-base"
                >
                  {isProcessing ? 'Sending...' : 'Send Reset Email'}
                </button>
                <button
                  onClick={() => setShowPasswordDialog(false)}
                  disabled={isProcessing}
                  className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 