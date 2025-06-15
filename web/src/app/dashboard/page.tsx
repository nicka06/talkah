'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useRef, useState, useEffect } from 'react'

export default function DashboardPage() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

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
      {/* Navbar */}
      <header className="text-black py-4 border-b-2 border-black">
        <div className="flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <h1 className="font-graffiti text-2xl font-bold text-black">
              TALKAH
            </h1>
          </div>
          <div className="relative" ref={dropdownRef}>
            <button
              className="w-12 h-12 rounded-full border-2 border-black flex items-center justify-center bg-white hover:bg-black/10 transition-colors focus:outline-none"
              onClick={() => setDropdownOpen((open) => !open)}
              aria-label="Open profile menu"
            >
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <span className="text-black font-bold text-lg">{user?.email?.[0]?.toUpperCase() || 'U'}</span>
              )}
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border-2 border-black rounded-xl shadow-xl z-50">
                <div className="px-4 py-3 border-b border-black">
                  <div className="font-semibold text-black">{user?.email || 'User'}</div>
                </div>
                <ul className="py-2">
                  <li>
                    <a href="/dashboard/activity" className="block px-4 py-2 text-black hover:bg-black/10 rounded transition-colors">History</a>
                  </li>
                  <li>
                    <a href="/dashboard/account" className="block px-4 py-2 text-black hover:bg-black/10 rounded transition-colors">Subscription</a>
                  </li>
                  <li>
                    <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-black hover:bg-black/10 rounded transition-colors">Sign Out</button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>

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