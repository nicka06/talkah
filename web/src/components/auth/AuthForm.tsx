'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface AuthFormProps {
  mode: 'signin' | 'signup'
  onSuccess?: () => void
}

export function AuthForm({ mode, onSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { signIn, signUp, signInWithOAuth } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = mode === 'signin' 
        ? await signIn(email, password)
        : await signUp(email, password)

      if (error) {
        setError(error.message)
      } else {
        onSuccess?.()
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await signInWithOAuth(provider)
      if (error) {
        setError(error.message)
      }
    } catch (err) {
      setError('OAuth sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl shadow-lg border-2 border-white">
      <h2 className="font-graffiti text-3xl text-white mb-6 text-center">
        {mode === 'signin' ? 'SIGN IN' : 'SIGN UP'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border-2 border-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white text-white placeholder-white/70"
            required
          />
        </div>
        
        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border-2 border-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white text-white placeholder-white/70"
            required
          />
        </div>

        {error && (
          <div className="text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-primary-600 py-3 rounded-lg font-graffiti text-xl hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'LOADING...' : mode === 'signin' ? 'SIGN IN' : 'SIGN UP'}
        </button>

        <div className="text-center text-white/90">
          {mode === 'signin' ? (
            <p>
              Don't have an account?{' '}
              <a href="/auth/signup" className="text-white hover:text-primary-300 transition-colors">
                Sign up
              </a>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <a href="/auth/login" className="text-white hover:text-primary-300 transition-colors">
                Sign in
              </a>
            </p>
          )}
        </div>
      </form>
    </div>
  )
} 