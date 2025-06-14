'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <p className="text-text-secondary">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light">
      {/* Header */}
      <header className="bg-background-dark text-white py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <h1 className="font-graffiti text-2xl font-bold text-primary">
                TALKAH
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-text-secondary">
                Welcome, {user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="bg-primary px-4 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <h1 className="font-graffiti text-4xl md:text-6xl font-bold text-background-dark mb-4">
              WELCOME TO YOUR DASHBOARD
            </h1>
            <p className="text-xl text-text-secondary">
              Your AI-powered communication hub
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <a
              href="/dashboard/calls"
              className="bg-white p-8 rounded-xl shadow-lg border-l-4 border-primary hover:shadow-xl transition-shadow"
            >
              <div className="text-4xl mb-4">📞</div>
              <h3 className="font-bold text-xl mb-2">Make a Call</h3>
              <p className="text-text-secondary">Start an AI-powered phone conversation</p>
            </a>
            
            <a
              href="/dashboard/emails"
              className="bg-white p-8 rounded-xl shadow-lg border-l-4 border-primary hover:shadow-xl transition-shadow"
            >
              <div className="text-4xl mb-4">📧</div>
              <h3 className="font-bold text-xl mb-2">Send Email</h3>
              <p className="text-text-secondary">Compose intelligent emails</p>
            </a>
            
            <div className="bg-white p-8 rounded-xl shadow-lg border-l-4 border-gray-300 opacity-50">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="font-bold text-xl mb-2">Text Messages</h3>
              <p className="text-text-secondary">Coming Soon</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="font-bold text-xl mb-4">Quick Navigation</h3>
            <div className="grid md:grid-cols-4 gap-4">
              <a
                href="/dashboard/calls"
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                <div className="font-semibold">Phone Calls</div>
                <div className="text-sm text-text-secondary">Make & view calls</div>
              </a>
              <a
                href="/dashboard/emails"
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                <div className="font-semibold">Emails</div>
                <div className="text-sm text-text-secondary">Compose & view emails</div>
              </a>
              <a
                href="/dashboard/activity"
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                <div className="font-semibold">Activity History</div>
                <div className="text-sm text-text-secondary">View all communications</div>
              </a>
              <a
                href="/dashboard/account"
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                <div className="font-semibold">Account</div>
                <div className="text-sm text-text-secondary">Settings & billing</div>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 