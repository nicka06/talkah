'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export function Navigation() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  const handleSignOut = async () => {
    await signOut?.()
    router.push('/')
  }

  return (
    <header className="text-black py-3 sm:py-4 border-b-2 border-black">
      <div className="flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Logo */}
          <a href="/" className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity">
            <img 
              src="/talkah_logo.png" 
              alt="Talkah Logo" 
              width={40} 
              height={40} 
              className="w-8 h-8 sm:w-12 sm:h-12 rounded-full object-cover"
            />
            <h1 className="font-graffiti text-lg sm:text-2xl font-bold text-black">
              TALKAH
            </h1>
          </a>
        </div>

        {/* Conditional Navigation */}
        {user ? (
          /* User Dropdown for authenticated users */
          <div className="relative" ref={dropdownRef}>
            <button
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-black flex items-center justify-center bg-white hover:bg-black/10 transition-colors focus:outline-none touch-manipulation"
              onClick={() => setDropdownOpen((open) => !open)}
              aria-label="Open profile menu"
            >
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover" />
              ) : (
                <span className="text-black font-bold text-sm sm:text-lg">{user?.email?.[0]?.toUpperCase() || 'U'}</span>
              )}
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-black rounded-xl shadow-xl z-50">
                <div className="px-4 py-3 border-b border-black">
                  <div className="font-semibold text-black text-sm truncate" title={user?.email || 'User'}>
                    {user?.email || 'User'}
                  </div>
                </div>
                <ul className="py-2">
                  <li>
                    <a 
                      href="/dashboard/account" 
                      className="block px-4 py-3 text-black hover:bg-black/10 rounded transition-colors text-sm whitespace-nowrap touch-manipulation"
                    >
                      Account Details
                    </a>
                  </li>
                  <li>
                    <a 
                      href="/dashboard/activity" 
                      className="block px-4 py-3 text-black hover:bg-black/10 rounded transition-colors text-sm whitespace-nowrap touch-manipulation"
                    >
                      History
                    </a>
                  </li>
                  <li>
                    <a 
                      href="/dashboard/subscription" 
                      className="block px-4 py-3 text-black hover:bg-black/10 rounded transition-colors text-sm whitespace-nowrap touch-manipulation"
                    >
                      Subscription
                    </a>
                  </li>
                  <li>
                    <button 
                      onClick={handleSignOut} 
                      className="w-full text-left px-4 py-3 text-black hover:bg-black/10 rounded transition-colors text-sm whitespace-nowrap touch-manipulation"
                    >
                      Sign Out
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        ) : (
          /* Sign In/Sign Up buttons for non-authenticated users */
          <nav className="flex space-x-2 sm:space-x-6">
            <a
              href="/auth/login"
              className="px-3 py-2 sm:px-6 sm:py-2 rounded-lg font-semibold border-2 border-black text-black hover:bg-black hover:text-white transition-colors text-sm sm:text-base touch-manipulation"
            >
              Sign In
            </a>
            <a
              href="/auth/signup"
              className="px-3 py-2 sm:px-6 sm:py-2 rounded-lg font-semibold bg-black text-white hover:bg-gray-800 transition-colors text-sm sm:text-base touch-manipulation"
            >
              Sign Up
            </a>
          </nav>
        )}
      </div>
    </header>
  )
} 