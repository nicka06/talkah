'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Navigation } from '@/components/shared/Navigation'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Check for pending call data from homepage signup flow
  useEffect(() => {
    if (user && !loading) {
      const pendingCallData = localStorage.getItem('talkah_pending_call')
      
      if (pendingCallData) {
        // Redirect to calls page where the data will be processed
        router.push('/dashboard/calls')
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#DC2626]">
        <div className="text-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-600 font-bold text-lg">T</span>
          </div>
          <p className="text-white">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#DC2626]">
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 sm:py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="font-graffiti text-3xl sm:text-5xl md:text-6xl font-bold text-black mb-4 sm:mb-6">
            AI COMMUNICATION
          </h1>
          <p className="text-lg sm:text-xl text-black/90 mb-8 sm:mb-12 max-w-2xl mx-auto px-2">
            Talk to AI through phone calls and have AI send emails for you
          </p>

          {/* Communication Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Emails Card - First position */}
            <div className="bg-white border-2 border-black rounded-xl p-6 hover:shadow-lg transition-shadow lg:col-start-1">
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-black rounded-full flex items-center justify-center">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-black mb-2">Emails</h3>
                  <p className="text-black/70 text-sm mb-4">
                    Have AI generate and send professional emails on any topic you specify
                  </p>
                </div>
                <button
                  onClick={() => router.push('/dashboard/emails')}
                  className="w-full bg-black text-white py-3 sm:py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors touch-manipulation text-sm sm:text-base"
                >
                  Send Email
                </button>
              </div>
            </div>

            {/* Phone Calls Card - Center position */}
            <div className="bg-white border-2 border-black rounded-xl p-6 hover:shadow-lg transition-shadow lg:col-start-2">
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-black rounded-full flex items-center justify-center">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-black mb-2">Phone Calls</h3>
                  <p className="text-black/70 text-sm mb-4">
                    Have AI-powered conversations where you talk to AI about any topic
                  </p>
                </div>
                <button
                  onClick={() => router.push('/dashboard/calls')}
                  className="w-full bg-black text-white py-3 sm:py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors touch-manipulation text-sm sm:text-base"
                >
                  Start Call
                </button>
              </div>
            </div>

            {/* Text Messages Card - Coming Soon - Third position */}
            <div className="bg-white border-2 border-black rounded-xl p-6 opacity-50 sm:col-span-2 lg:col-span-1 lg:col-start-3">
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-400 rounded-full flex items-center justify-center">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-black mb-2">Text Messages</h3>
                  <p className="text-black/70 text-sm mb-4">
                    Chat with AI through text messages
                  </p>
                </div>
                <div className="w-full bg-gray-300 text-gray-600 py-3 rounded-lg font-semibold text-center text-sm sm:text-base">
                  Coming Soon
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 