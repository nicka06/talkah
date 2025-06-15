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
    <header className="text-black py-4 border-b-2 border-black">
      <div className="flex items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          {/* Logo */}
          <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <h1 className="font-graffiti text-2xl font-bold text-black">
            TALKAH
          </h1>
        </div>

        {/* User Dropdown */}
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
                  <a href="/dashboard/account" className="block px-4 py-2 text-black hover:bg-black/10 rounded transition-colors">Account Details</a>
                </li>
                <li>
                  <a href="/dashboard/activity" className="block px-4 py-2 text-black hover:bg-black/10 rounded transition-colors">History</a>
                </li>
                <li>
                  <a href="/dashboard/subscription" className="block px-4 py-2 text-black hover:bg-black/10 rounded transition-colors">Subscription</a>
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
  )
} 