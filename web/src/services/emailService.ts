import { createClient } from '@/lib/supabase'

export interface SendEmailParams {
  recipientEmail: string
  subject: string
  topic: string
  fromEmail?: string
}

export class EmailService {
  private static supabase = createClient()

  static async sendEmail(params: SendEmailParams): Promise<any> {
    try {
      const { data, error } = await this.supabase.functions.invoke('send-email', {
        body: {
          recipient_email: params.recipientEmail,
          subject: params.subject,
          type: 'ai_generated',
          topic: params.topic,
          from_email: params.fromEmail || 'hello@talkah.com'
        }
      })

      if (error) {
        console.error('Error sending email:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in sendEmail:', error)
      throw error
    }
  }

  // Check if user can send an email
  static async canSendEmail(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.functions.invoke('check-usage-limit', {
        body: { action_type: 'email' }
      })

      if (error) {
        console.error('Error checking email permission:', error)
        return false
      }

      return data?.can_perform || false
    } catch (error) {
      console.error('Error in canSendEmail:', error)
      return false
    }
  }

  // Validate email address
  static validateEmail(email: string): boolean {
    return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)
  }

  // Format from email with talkah.com domain
  static formatFromEmail(localPart: string): string {
    // Remove any existing domain and clean the local part
    const cleanLocalPart = localPart.split('@')[0].toLowerCase().trim()
    
    // Basic validation for local part
    if (!cleanLocalPart || !/^[a-zA-Z0-9._-]+$/.test(cleanLocalPart)) {
      return 'hello@talkah.com'
    }
    
    return `${cleanLocalPart}@talkah.com`
  }
} 