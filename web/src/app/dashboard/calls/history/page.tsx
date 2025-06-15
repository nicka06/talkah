'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { CallService, CallRecord } from '../../../../services/callService'
import { Navigation } from '@/components/shared/Navigation'
import { BackButton } from '@/components/shared/BackButton'

export default function CallHistoryPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  // Load call history
  useEffect(() => {
    if (user) {
      loadCallHistory()
    }
  }, [user])

  const loadCallHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      const history = await CallService.getCallHistory()
      setCalls(history)
    } catch (err) {
      console.error('Error loading call history:', err)
      setError('Failed to load call history')
    } finally {
      setLoading(false)
    }
  }

  const handleRedial = async (phoneNumber: string, topic: string) => {
    if (!user) return

    try {
      const result = await CallService.initiateCall({
        phoneNumber,
        topic,
        userId: user.id,
        email: user.email!
      })

      if (result) {
        alert('Call initiated successfully! You should receive a call shortly.')
        // Refresh the call history
        loadCallHistory()
      } else {
        alert('Failed to initiate call. Please try again.')
      }
    } catch (error) {
      console.error('Error redialing:', error)
      alert('Failed to initiate call. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'failed':
      case 'busy':
      case 'no-answer':
        return 'text-red-600 bg-red-100'
      case 'in-progress':
      case 'ringing':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatStatus = (status: string) => {
    return status.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#DC2626]">
        <div className="text-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-600 font-bold text-lg">T</span>
          </div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#DC2626]">
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <div className="flex justify-start mb-8">
            <BackButton text="Calls" href="/dashboard/calls" />
          </div>

          <h1 className="font-graffiti text-5xl md:text-6xl font-bold text-black mb-8 text-center">
            CALL HISTORY
          </h1>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-black">Loading call history...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-black mb-4">{error}</p>
              <button
                onClick={loadCallHistory}
                className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-black mb-4">No calls found</p>
              <a
                href="/dashboard/calls"
                className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors inline-block"
              >
                Make Your First Call
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border-2 border-black"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-black">
                          {CallService.formatPhoneNumber(call.userPhoneNumber)}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}
                        >
                          {formatStatus(call.status)}
                        </span>
                      </div>
                      <p className="text-black/80 mb-2">{call.topic}</p>
                      <p className="text-black/60 text-sm">
                        {CallService.formatDate(call.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRedial(call.userPhoneNumber, call.topic)}
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                      >
                        Redial
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Navigation Links */}
          <div className="mt-8 text-center">
            <a
              href="/dashboard/calls"
              className="px-6 py-2 bg-white/10 border-2 border-black rounded-lg text-black hover:bg-black hover:text-white transition-colors"
            >
              Make New Call
            </a>
          </div>
        </div>
      </main>
    </div>
  )
} 