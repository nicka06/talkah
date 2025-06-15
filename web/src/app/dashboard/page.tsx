'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/shared/Navigation'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <p className="text-black">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="font-graffiti text-6xl md:text-8xl font-bold text-black mb-6">
            Welcome to your dashboard
          </h1>
          <p className="text-xl text-black/90 mb-12 max-w-2xl mx-auto">
            Your AI-powered communication hub
          </p>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Email Card - Left */}
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl shadow-lg border-2 border-black order-1 md:order-1 flex flex-col items-center">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="font-bold text-xl mb-2 text-black">Emails</h3>
              <p className="text-black/90 mb-4">Smart email composition and responses</p>
              <a href="/dashboard/emails" className="mt-auto px-6 py-2 rounded-lg font-semibold border-2 border-black text-black hover:bg-black hover:text-white transition-colors">Go to Emails</a>
            </div>
            {/* Phone Card - Center */}
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl shadow-lg border-2 border-black order-2 md:order-2 flex flex-col items-center">
              <div className="text-4xl mb-4">📞</div>
              <h3 className="font-bold text-xl mb-2 text-black">Phone Calls</h3>
              <p className="text-black/90 mb-4">AI-powered conversations with anyone, anywhere</p>
              <a href="/dashboard/calls" className="mt-auto px-6 py-2 rounded-lg font-semibold border-2 border-black text-black hover:bg-black hover:text-white transition-colors">Go to Calls</a>
            </div>
            {/* Messages Card - Right */}
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl shadow-lg border-2 border-black opacity-50 order-3 md:order-3 flex flex-col items-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="font-bold text-xl mb-2 text-black">Texts</h3>
              <p className="text-black/90">Coming Soon</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 