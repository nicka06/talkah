'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { EmailService } from '../../../services/emailService'
import { Navigation } from '@/components/shared/Navigation'
import { BackButton } from '@/components/shared/BackButton'
import { SubscriptionPopup } from '@/components/subscription/SubscriptionPopup'
import { useToastContext } from '@/contexts/ToastContext'

export default function EmailsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { usage, plans, loading: subscriptionLoading, getCurrentPlanId } = useSubscription()
  const { showSuccess, showError } = useToastContext()
  const [recipientEmail, setRecipientEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [fromEmailLocal, setFromEmailLocal] = useState('hello')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false)
  const [currentPlanId, setCurrentPlanId] = useState<string>('free')

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  // Get current plan ID
  useEffect(() => {
    const fetchCurrentPlan = async () => {
      const planId = await getCurrentPlanId()
      setCurrentPlanId(planId || 'free')
    }
    fetchCurrentPlan()
  }, [getCurrentPlanId])

  const validateInputs = () => {
    if (!EmailService.validateEmail(recipientEmail)) {
      showError('Invalid Email', 'Please enter a valid recipient email address')
      return false
    }
    if (!subject.trim()) {
      showError('Missing Subject', 'Please enter an email subject')
      return false
    }
    if (!topic.trim()) {
      showError('Missing Topic', 'Please describe what the email should be about')
      return false
    }
    if (topic.trim().length < 10) {
      showError('Topic Too Short', 'Please provide more details about the email topic (at least 10 characters)')
      return false
    }
    return true
  }

  const handleSendEmail = async () => {
    if (!validateInputs() || isProcessing || !user) return

    try {
      setIsProcessing(true)

      // Check if user can send an email BEFORE making the API call
      const emailsRemaining = usage ? (usage.emailsLimit === -1 ? Infinity : usage.emailsLimit - usage.emailsUsed) : 0
      if (emailsRemaining <= 0) {
        // Show subscription popup instead of error
        setShowSubscriptionPopup(true)
        return
      }

      // Format the from email
      const fromEmail = EmailService.formatFromEmail(fromEmailLocal)

      const result = await EmailService.sendEmail({
        recipientEmail: recipientEmail.trim(),
        subject: subject.trim(),
        topic: topic.trim(),
        fromEmail
      })

      if (result?.success) {
        // Show success message
        showSuccess(
          'Email Sent!', 
          'Your AI-generated email has been sent successfully.',
          { duration: 8000 }
        )
        
        // Clear form
        setRecipientEmail('')
        setSubject('')
        setTopic('')
        setFromEmailLocal('hello')
      } else {
        showError('Email Failed', 'Failed to send email. Please check your inputs and try again.')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      showError('Email Error', 'Failed to send email. Please try again or contact support if the problem persists.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (authLoading || subscriptionLoading) {
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
        <div className="text-center max-w-2xl mx-auto">
          {/* Back Button */}
          <div className="flex justify-start mb-8">
            <BackButton text="Dashboard" href="/dashboard" />
          </div>

          <h1 className="font-graffiti text-5xl md:text-6xl font-bold text-black mb-6">
            AI EMAILS
          </h1>
          <p className="text-xl text-black/90 mb-8">
            AI-powered professional emails generated instantly
          </p>

          {/* Email Form */}
          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl shadow-lg border-2 border-black">
            <div className="space-y-6">
              {/* Recipient Email Input */}
              <div>
                <label htmlFor="recipientEmail" className="block text-left text-black font-semibold mb-2">
                  Recipient Email
                </label>
                <input
                  id="recipientEmail"
                  type="email"
                  placeholder="recipient@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black placeholder-black/70"
                  disabled={isProcessing}
                />
              </div>

              {/* Subject Input */}
              <div>
                <label htmlFor="subject" className="block text-left text-black font-semibold mb-2">
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  placeholder="Email subject line"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black placeholder-black/70"
                  disabled={isProcessing}
                />
              </div>

              {/* From Email Input */}
              <div>
                <label htmlFor="fromEmail" className="block text-left text-black font-semibold mb-2">
                  From Email
                </label>
                <div className="flex items-center">
                  <input
                    id="fromEmail"
                    type="text"
                    placeholder="hello"
                    value={fromEmailLocal}
                    onChange={(e) => setFromEmailLocal(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white/5 border-2 border-black rounded-l-lg focus:outline-none focus:ring-2 focus:ring-black text-black placeholder-black/70"
                    disabled={isProcessing}
                  />
                  <div className="px-4 py-3 bg-black/10 border-2 border-l-0 border-black rounded-r-lg text-black font-semibold">
                    @talkah.com
                  </div>
                </div>
              </div>

              {/* Topic Input */}
              <div>
                <label htmlFor="topic" className="block text-left text-black font-semibold mb-2">
                  Email Topic
                </label>
                <p className="text-left text-black/70 text-sm mb-2">
                  AI will generate professional email content based on this topic
                </p>
                <textarea
                  id="topic"
                  placeholder="Describe what you want the email to be about..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black placeholder-black/70 resize-none"
                  disabled={isProcessing}
                />
              </div>

              {/* Send Button - Always enabled */}
              <button
                onClick={handleSendEmail}
                disabled={isProcessing}
                className={`
                  w-full py-4 rounded-lg font-graffiti text-xl transition-colors
                  ${isProcessing
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-gray-800'
                  }
                `}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>GENERATING & SENDING...</span>
                  </div>
                ) : (
                  'GENERATE & SEND EMAIL'
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Subscription Popup */}
      <SubscriptionPopup
        isOpen={showSubscriptionPopup}
        onClose={() => setShowSubscriptionPopup(false)}
        plans={plans}
        currentPlanId={currentPlanId}
        userEmail={user?.email || ''}
        userId={user?.id || ''}
      />
    </div>
  )
} 