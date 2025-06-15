import { UsageTracking } from '@/services/subscriptionService'

interface UsageDisplayProps {
  usage: UsageTracking
  className?: string
}

export function UsageDisplay({ usage, className = '' }: UsageDisplayProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 0.9) return 'bg-red-500'
    if (progress >= 0.7) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const UsageBar = ({ 
    label, 
    used, 
    limit, 
    icon 
  }: { 
    label: string
    used: number
    limit: number
    icon: React.ReactNode
  }) => {
    const progress = limit === -1 ? 0 : Math.min(used / limit, 1)
    const displayLimit = limit === -1 ? '∞' : limit
    const displayUsed = limit === -1 ? used : `${used}/${displayLimit}`

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-gray-600">{icon}</div>
            <span className="font-medium">{label}</span>
          </div>
          <span className="text-sm text-gray-600">{displayUsed}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getProgressColor(progress)} transition-all duration-300`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border-2 border-black rounded-xl p-6 ${className}`}>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold mb-2">Current Usage</h3>
          <p className="text-sm text-gray-600">
            Billing Period: {formatDate(usage.billingPeriodStart)} - {formatDate(usage.billingPeriodEnd)}
          </p>
        </div>

        <div className="space-y-4">
          <UsageBar
            label="Phone Calls"
            used={usage.phoneCallsUsed}
            limit={usage.phoneCallsLimit}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            }
          />

          <UsageBar
            label="Text Conversations"
            used={usage.textChainsUsed}
            limit={usage.textChainsLimit}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
          />

          <UsageBar
            label="Emails"
            used={usage.emailsUsed}
            limit={usage.emailsLimit}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  )
} 