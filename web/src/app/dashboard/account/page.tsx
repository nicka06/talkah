'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Navigation } from '@/components/shared/Navigation'
import { BackButton } from '@/components/shared/BackButton'
import { createClient } from '@/lib/supabase'

export default function AccountPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [emailPendingVerification, setEmailPendingVerification] = useState(false)
  const [passwordPendingVerification, setPasswordPendingVerification] = useState(false)
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
  const supabase = createClient()

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  const generatePasswordMask = (length: number = 10) => {
    return '*'.repeat(length)
  }

  const validateEmail = (email: string) => {
    return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)
  }

  const validatePasswordChange = () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm
    
    if (!currentPassword) {
      alert('Please enter your current password')
      return false
    }
    
    if (!newPassword || newPassword.length < 6) {
      alert('New password must be at least 6 characters')
      return false
    }
    
    if (newPassword === currentPassword) {
      alert('New password must be different from current password')
      return false
    }
    
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match')
      return false
    }
    
    return true
  }

  const handleEmailChange = async () => {
    if (!emailForm.newEmail) {
      alert('Please enter an email address')
      return
    }
    
    if (!validateEmail(emailForm.newEmail)) {
      alert('Please enter a valid email address')
      return
    }
    
    if (emailForm.newEmail === user?.email) {
      alert('This is already your current email address')
      return
    }

    setIsProcessing(true)
    try {
      const { error } = await supabase.auth.updateUser({
        email: emailForm.newEmail
      })

      if (error) throw error

      setEmailPendingVerification(true)
      setPendingEmail(emailForm.newEmail)
      setShowEmailDialog(false)
      setEmailForm({ newEmail: '' })
      
      alert(`Verification email sent to ${emailForm.newEmail}. Please check your email and click the verification link.`)
    } catch (error: any) {
      console.error('Error updating email:', error)
      alert(`Failed to update email: ${error.message}`)
    } finally {
      setIsProcessing(false)
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
      alert('Password updated successfully!')
    } catch (error: any) {
      console.error('Error updating password:', error)
      alert(`Failed to update password: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const cancelEmailChange = () => {
    setEmailPendingVerification(false)
    setPendingEmail(null)
    alert('Email change cancelled')
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

  return (
    <div className="min-h-screen bg-[#DC2626]">
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <div className="flex justify-start mb-8">
            <BackButton text="Dashboard" href="/dashboard" />
          </div>

          <h1 className="font-graffiti text-5xl md:text-6xl font-bold text-black mb-8 text-center">
            ACCOUNT INFO
          </h1>

          <div className="space-y-6">
            {/* Email Field */}
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-orange-800 text-sm">Pending verification to {pendingEmail}</span>
                    </div>
                    <button
                      onClick={cancelEmailChange}
                      className="text-red-600 hover:text-red-800 text-sm underline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Password Field */}
            <div className="bg-black p-6 rounded-xl border-2 border-black">
              <div className="text-center mb-4">
                <h3 className="text-white font-semibold text-lg">Password</h3>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-800 p-3 rounded-lg">
                  <p className="text-white text-center font-mono">{generatePasswordMask()}</p>
                </div>
                <button
                  onClick={() => passwordPendingVerification ? null : setShowPasswordDialog(true)}
                  className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg transition-colors"
                  disabled={passwordPendingVerification}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
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
              Enter your new email address. A verification email will be sent to confirm the change.
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