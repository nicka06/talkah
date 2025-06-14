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
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center mb-6">
          <h2 className="font-graffiti text-3xl font-bold text-background-dark mb-2">
            {mode === 'signin' ? 'SIGN IN' : 'SIGN UP'}
          </h2>
          <p className="text-text-secondary">
            {mode === 'signin' ? 'Welcome back to TALKAH' : 'Join TALKAH today'}
          </p>
        </div>

        {error && (
          <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleOAuth('google')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <button
            onClick={() => handleOAuth('apple')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-black text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.017 0C8.396 0 8.164.024 6.93.12 5.702.216 4.865.401 4.14.757c-.748.368-1.384.856-2.016 1.488-.632.632-1.12 1.268-1.488 2.016C.272 4.865.087 5.702.024 6.93.001 8.164 0 8.396 0 12.017c0 3.621.024 3.853.12 5.087.096 1.228.272 2.065.633 2.79.368.748.856 1.384 1.488 2.016.632.632 1.268 1.12 2.016 1.488.725.361 1.562.537 2.79.633 1.234.096 1.466.12 5.087.12 3.621 0 3.853-.024 5.087-.12 1.228-.096 2.065-.272 2.79-.633.748-.368 1.384-.856 2.016-1.488.632-.632 1.12-1.268 1.488-2.016.361-.725.537-1.562.633-2.79.096-1.234.12-1.466.12-5.087 0-3.621-.024-3.853-.12-5.087-.096-1.228-.272-2.065-.633-2.79-.368-.748-.856-1.384-1.488-2.016C19.384.856 18.748.368 18 .24 17.065.087 16.228.024 15 .024 14.164.001 13.396 0 12.017 0zm0 2.16c3.548 0 3.97.024 5.37.12 1.297.056 2.005.272 2.474.457.621.241 1.064.529 1.529.994.465.465.753.908.994 1.529.185.469.401 1.177.457 2.474.096 1.4.12 1.822.12 5.37 0 3.548-.024 3.97-.12 5.37-.056 1.297-.272 2.005-.457 2.474-.241.621-.529 1.064-.994 1.529-.465.465-.908.753-1.529.994-.469.185-1.177.401-2.474.457-1.4.096-1.822.12-5.37.12-3.548 0-3.97-.024-5.37-.12-1.297-.056-2.005-.272-2.474-.457-.621-.241-1.064-.529-1.529-.994-.465-.465-.753-.908-.994-1.529-.185-.469-.401-1.177-.457-2.474-.096-1.4-.12-1.822-.12-5.37 0-3.548.024-3.97.12-5.37.056-1.297.272-2.005.457-2.474.241-.621.529-1.064.994-1.529.465-.465.908-.753 1.529-.994.469-.185 1.177-.401 2.474-.457 1.4-.096 1.822-.12 5.37-.12z"/>
            </svg>
            Continue with Apple
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-text-secondary">or</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        {/* Switch Mode */}
        <div className="text-center mt-6">
          <p className="text-text-secondary">
            {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
            <a
              href={mode === 'signin' ? '/auth/signup' : '/auth/login'}
              className="text-primary hover:text-primary-700 font-semibold"
            >
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
} 