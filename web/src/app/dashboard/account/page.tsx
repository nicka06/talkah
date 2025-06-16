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
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Main Card Container */}
          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl shadow-lg border-2 border-black">
            {/* Back Button inside card */}
            <div className="flex justify-start mb-6">
              <BackButton text="Dashboard" href="/dashboard" />
            </div>

            <h1 className="font-graffiti text-4xl md:text-5xl font-bold text-black mb-8 text-center">
              ACCOUNT INFO
            </h1>

            <div className="space-y-6">
              {/* Email Card */}
              <div className="bg-black p-6 rounded-xl border-2 border-black">
                <div className="text-center mb-4">
                  <h3 className="text-white font-semibold text-lg">Email</h3>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-800 p-3 rounded-lg">
                    <p className="text-white text-center">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => emailPendingVerification ? null : setShowEmailDialog(true)}
                    className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg transition-colors"
                    disabled={emailPendingVerification}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>

                {emailPendingVerification && (
                  <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-orange-800 text-sm">Pending verification to change email to: {pendingEmail}</span>
                      </div>
                      <button
                        onClick={cancelEmailChange}
                        className="text-red-600 hover:text-red-800 text-sm underline"
                      >
                        Cancel
                      </button>
                    </div>
                    
                    <div className="mb-2">
                      <span className="text-orange-700 text-xs">
                        <strong>Security:</strong> Verification email sent to your current address ({user?.email}) to prevent unauthorized changes.
                      </span>
                    </div>
                    
                    {/* Resend Email Button */}
                    <div className="flex items-center justify-between">
                      <span className="text-orange-700 text-xs">
                        Didn't receive the email? Check your spam folder.
                      </span>
                      <button
                        onClick={handleResendEmail}
                        disabled={resendCountdown > 0 || isResending}
                        className={`text-xs px-3 py-1 rounded transition-colors ${
                          resendCountdown > 0 || isResending
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-orange-600 hover:bg-orange-700 text-white'
                        }`}
                      >
                        {isResending 
                          ? 'Sending...' 
                          : resendCountdown > 0 
                            ? `Resend in ${resendCountdown}s`
                            : 'Resend Email'
                        }
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Password Card */}
              <div className="bg-black p-6 rounded-xl border-2 border-black">
                <div className="text-center mb-4">
                  <h3 className="text-white font-semibold text-lg">Password</h3>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-800 p-3 rounded-lg">
                    <p className="text-white text-center font-mono">{generatePasswordMask()}</p>
                  </div>
                  <button
                    onClick={() => setShowPasswordDialog(true)}
                    className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Email Change Dialog */}
      {showEmailDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-center">Change Email</h3>
            <p className="text-gray-600 mb-4 text-center">
              Enter your new email address. For security, a verification email will be sent to your <strong>current email address</strong> ({user?.email}) to confirm this change.
            </p>
            
            <div className="space-y-4">
              <input
                type="email"
                placeholder="New Email"
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm({ newEmail: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEmailDialog(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmailChange}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Sending...' : 'Send Verification'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Dialog */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-center">Change Password</h3>
            <p className="text-gray-600 mb-4 text-center">
              Enter your current password and new password. Your password will be updated immediately after verification.
            </p>
            
            <div className="space-y-4">
              <input
                type="password"
                placeholder="Current Password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
              />
              
              <input
                type="password"
                placeholder="New Password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
              />
              
              <input
                type="password"
                placeholder="Confirm New Password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPasswordDialog(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 