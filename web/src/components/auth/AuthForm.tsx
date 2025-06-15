'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToastContext } from '@/contexts/ToastContext'
import { createClient } from '@/lib/supabase'

interface AuthFormProps {
  mode: 'signin' | 'signup'
  onSuccess?: () => void
}

export function AuthForm({ mode, onSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  
  const { signIn, signUp, signInWithOAuth } = useAuth()
  const { showSuccess, showError, showInfo } = useToastContext()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = mode === 'signin' 
        ? await signIn(email, password)
        : await signUp(email, password)

      if (error) {
        showError(
          mode === 'signin' ? 'Sign In Failed' : 'Sign Up Failed',
          error.message
        )
      } else {
        showSuccess(
          mode === 'signin' ? 'Welcome Back!' : 'Account Created!',
          mode === 'signin' 
            ? 'You have been signed in successfully.' 
            : 'Your account has been created. Please check your email for verification.'
        )
        onSuccess?.()
      }
    } catch (err) {
      showError('Authentication Error', 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail) {
      showError('Validation Error', 'Please enter your email address')
      return
    }

    setResetLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'http://localhost:3000/auth/verify'
      })

      if (error) throw error

      showSuccess(
        'Reset Email Sent!', 
        `Check your email at ${resetEmail} for password reset instructions.`,
        { duration: 8000 }
      )
      setShowForgotPassword(false)
      setResetEmail('')
    } catch (error: any) {
      showError('Reset Failed', error.message || 'Failed to send reset email')
    } finally {
      setResetLoading(false)
    }
  }

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setLoading(true)

    try {
      const { error } = await signInWithOAuth(provider)
      if (error) {
        showError('OAuth Sign In Failed', error.message)
      } else {
        showSuccess('Welcome!', `Successfully signed in with ${provider === 'google' ? 'Google' : 'Apple'}`)
      }
    } catch (err) {
      showError('OAuth Error', 'OAuth sign in failed')
    } finally {
      setLoading(false)
    }
  }

  if (showForgotPassword) {
    return (
      <div className="bg-white border-2 border-black p-8 rounded-2xl shadow-xl text-black">
        <h2 className="font-graffiti text-3xl text-black mb-6 text-center">
          FORGOT PASSWORD
        </h2>
        
        <p className="text-center text-black/80 mb-6">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black placeholder-black/70"
              required
            />
          </div>

          <button
            type="submit"
            disabled={resetLoading}
            className="w-full border-2 border-black text-black bg-white py-3 rounded-lg font-graffiti text-xl hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resetLoading ? 'SENDING...' : 'SEND RESET EMAIL'}
          </button>

          <button
            type="button"
            onClick={() => setShowForgotPassword(false)}
            className="w-full text-black underline hover:text-black/70 transition-colors"
          >
            Back to Sign In
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="bg-white border-2 border-black p-8 rounded-2xl shadow-xl text-black">
      <h2 className="font-graffiti text-3xl text-black mb-6 text-center">
        {mode === 'signin' ? 'SIGN IN' : 'SIGN UP'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-white border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black placeholder-black/70"
            required
          />
        </div>
        
        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-white border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black placeholder-black/70"
            required
          />
        </div>

        {mode === 'signin' && (
          <div className="text-right">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-black underline hover:text-black/70 transition-colors text-sm"
            >
              Forgot Password?
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full border-2 border-black text-black bg-white py-3 rounded-lg font-graffiti text-xl hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'LOADING...' : mode === 'signin' ? 'SIGN IN' : 'SIGN UP'}
        </button>

        <div className="text-center text-black/90">
          {mode === 'signin' ? (
            <p>
              Don't have an account?{' '}
              <a href="/auth/signup" className="text-black underline hover:text-black/70 transition-colors">
                Sign up
              </a>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <a href="/auth/login" className="text-black underline hover:text-black/70 transition-colors">
                Sign in
              </a>
            </p>
          )}
        </div>
      </form>
    </div>
  )
} 