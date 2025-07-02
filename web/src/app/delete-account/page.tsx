'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useToastContext } from '@/contexts/ToastContext'
import { Navigation } from '@/components/shared/Navigation'

export default function DeleteAccountPage() {
  const router = useRouter()
  const { showSuccess, showError } = useToastContext()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmDelete: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.password) {
      showError('Missing Information', 'Please enter your email and password')
      return
    }

    if (!formData.confirmDelete) {
      showError('Confirmation Required', 'Please confirm that you want to delete your account')
      return
    }

    setIsSubmitting(true)

    try {
      // First, verify the user's credentials
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })

      if (authError) {
        showError('Authentication Failed', 'Invalid email or password')
        setIsSubmitting(false)
        return
      }

      // Get user details for the deletion request
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      // Send deletion request email directly to admin
      const { data, error } = await supabase.functions.invoke('send-deletion-request', {
        body: {
          userEmail: formData.email,
          userId: authData.user.id,
          userDetails: userData,
          requestTimestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        }
      })

      if (error) {
        console.error('Error sending deletion request:', error)
        showError('Request Failed', 'Failed to send deletion request. Please try again.')
        setIsSubmitting(false)
        return
      }

      // Sign out the user immediately
      await supabase.auth.signOut()

      showSuccess(
        'Account Deletion Request Submitted', 
        'Your account deletion request has been sent to our team. Your account data will be deleted within 24 hours.',
        { duration: 10000 }
      )

      // Redirect to home page after success
      setTimeout(() => {
        router.push('/')
      }, 3000)

    } catch (error) {
      console.error('Error in deletion request:', error)
      showError('Request Failed', 'An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-red-600/10">
      <Navigation />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="bg-white border-2 border-black rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="font-graffiti text-3xl font-bold text-red-600 mb-4">
                Delete Account
              </h1>
              <p className="text-black/70 text-sm">
                This action cannot be undone. All your data will be permanently deleted.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-black mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-black rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter your email"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-bold text-black mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-black rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter your password"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Confirmation Checkbox */}
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.confirmDelete}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmDelete: e.target.checked }))}
                    className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-2 border-red-300 rounded"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-red-800 font-medium">
                    I understand that this action is permanent and will delete all my account data, 
                    including call history, email records, subscription information, and usage statistics.
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !formData.confirmDelete}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl border-2 border-black transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⏳</span>
                    Sending Request...
                  </>
                ) : (
                  'Delete My Account'
                )}
              </button>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="w-full bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-black font-bold py-3 px-6 rounded-xl border-2 border-black transition-colors"
              >
                Cancel
              </button>
            </form>

            {/* Legal Note */}
            <div className="mt-6 text-center">
              <p className="text-xs text-black/60">
                Account deletion requests are processed within 24 hours. 
                You will receive email confirmation once completed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 