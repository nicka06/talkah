import { createClient } from '@/lib/supabase'

export interface CallRecord {
  id: string
  userId: string
  userPhoneNumber: string
  topic: string
  twilioCallSid: string
  status: string
  createdAt: Date
  answeredTime?: Date
  completedTime?: Date
  durationSeconds?: number
}

export interface InitiateCallParams {
  phoneNumber: string
  topic: string
  userId: string
  email: string
}

export class CallService {
  private static supabase = createClient()

  // Initiate a phone call
  static async initiateCall(params: InitiateCallParams): Promise<any> {
    try {
      const { data, error } = await this.supabase.functions.invoke('initiate-call', {
        body: {
          user_phone_number: params.phoneNumber,
          topic: params.topic
        }
      })

      if (error) {
        console.error('Error initiating call:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in initiateCall:', error)
      throw error
    }
  }

  // Get call history for current user
  static async getCallHistory(limit: number = 50, offset: number = 0): Promise<CallRecord[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        console.log('No authenticated user')
        return []
      }

      const { data, error } = await this.supabase
        .from('calls')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Error fetching call history:', error)
        return []
      }

      return (data || []).map(call => ({
        id: call.id,
        userId: call.user_id,
        userPhoneNumber: call.user_phone_number,
        topic: call.topic,
        twilioCallSid: call.twilio_call_sid,
        status: call.status,
        createdAt: new Date(call.created_at),
        answeredTime: call.answered_time ? new Date(call.answered_time) : undefined,
        completedTime: call.completed_time ? new Date(call.completed_time) : undefined,
        durationSeconds: call.duration_seconds
      }))
    } catch (error) {
      console.error('Error in getCallHistory:', error)
      return []
    }
  }

  // Redial a previous call
  static async redialCall(phoneNumber: string, topic: string, userId: string, email: string): Promise<any> {
    return this.initiateCall({ phoneNumber, topic, userId, email })
  }

  // Check if user can make a phone call
  static async canMakePhoneCall(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.functions.invoke('check-usage-limit', {
        body: { action_type: 'phone_call' }
      })

      if (error) {
        console.error('Error checking phone call permission:', error)
        return false
      }

      return data?.can_perform || false
    } catch (error) {
      console.error('Error in canMakePhoneCall:', error)
      return false
    }
  }

  // Format phone number for display
  static formatPhoneNumber(phoneNumber: string): string {
    const cleanNumber = phoneNumber.replace(/\D/g, '')
    
    if (cleanNumber.length === 11 && cleanNumber.startsWith('1')) {
      const areaCode = cleanNumber.substring(1, 4)
      const firstThree = cleanNumber.substring(4, 7)
      const lastFour = cleanNumber.substring(7)
      return `(${areaCode}) ${firstThree}-${lastFour}`
    } else if (cleanNumber.length === 10) {
      const areaCode = cleanNumber.substring(0, 3)
      const firstThree = cleanNumber.substring(3, 6)
      const lastFour = cleanNumber.substring(6)
      return `(${areaCode}) ${firstThree}-${lastFour}`
    }
    
    return phoneNumber
  }

  // Format call duration
  static formatDuration(durationSeconds?: number): string {
    if (!durationSeconds || durationSeconds <= 0) return '--:--'
    
    const minutes = Math.floor(durationSeconds / 60)
    const seconds = durationSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Get display status for call
  static getDisplayStatus(status: string): string {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'answered':
        return 'Answered'
      case 'failed':
        return 'Failed'
      case 'no-answer':
        return 'No Answer'
      case 'busy':
        return 'Busy'
      case 'canceled':
        return 'Canceled'
      case 'initiated':
        return 'Initiated'
      case 'ringing':
        return 'Ringing'
      default:
        return status.toUpperCase()
    }
  }

  // Format date for display
  static formatDate(date: Date): string {
    const now = new Date()
    const difference = now.getTime() - date.getTime()
    const daysDifference = Math.floor(difference / (1000 * 60 * 60 * 24))
    
    if (daysDifference === 0) {
      const hour = date.getHours()
      const minute = date.getMinutes().toString().padStart(2, '0')
      const period = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour)
      return `${displayHour}:${minute} ${period}`
    } else if (daysDifference === 1) {
      return 'Yesterday'
    } else if (daysDifference < 7) {
      return `${daysDifference} days ago`
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
    }
  }
} 