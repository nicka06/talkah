import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;
import '../config/supabase_config.dart';
import '../models/usage_model.dart';
import '../models/call_record.dart';
import '../models/email_record.dart';
import '../models/sms_record.dart';
import '../models/activity_record.dart';
import '../models/user_model.dart';
import '../models/app_error.dart';
import './subscription_service.dart';
import './error_handler_service.dart';

// Exception class for usage limit errors
class UsageLimitException implements Exception {
  final String message;
  final String actionType;
  UsageLimitException(this.message, this.actionType);
  
  @override
  String toString() => message;
}

class ApiService {
  static String get _baseUrl => '${SupabaseConfig.supabaseUrl}/functions/v1';
  static final SubscriptionService _subscriptionService = SubscriptionService();
  
  static Future<Map<String, String>> _getHeaders() async {
    final session = SupabaseConfig.auth.currentSession;
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${session?.accessToken}',
    };
  }

  // Get user usage and limits (updated to use new subscription service)
  static Future<UsageModel?> getUserUsage() async {
    try {
      final usage = await _subscriptionService.getCurrentUsage();
      if (usage == null) return null;
      
      // Convert to old UsageModel format for backward compatibility
      return UsageModel(
        callsUsed: usage.phoneCallsUsed,
        textsUsed: usage.textChainsUsed,
        emailsUsed: usage.emailsUsed,
        tier: 'unknown', // We'll determine this based on limits
        limits: UsageLimits(
          calls: usage.phoneCallsLimit,
          texts: usage.textChainsLimit,
          emails: usage.emailsLimit,
        ),
        remaining: UsageRemaining(
          calls: usage.phoneCallsRemaining,
          texts: usage.textChainsRemaining,
          emails: usage.emailsRemaining,
        ),
      );
    } catch (e) {
      print('Error getting usage: $e');
      return null;
    }
  }

  // Initiate phone call with usage checking
  static Future<Map<String, dynamic>?> initiateCall({
    required String phoneNumber,
    required String topic,
  }) async {
    try {
      // Check if user can make a phone call
      final canMakeCall = await _subscriptionService.canPerformAction('phone_call');
      if (!canMakeCall) {
        throw UsageLimitException(
          'You have reached your phone call limit for this billing period. Please upgrade your plan to make more calls.',
          'phone_call'
        );
      }

      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$_baseUrl/initiate-call'),
        headers: headers,
        body: json.encode({
          'user_phone_number': phoneNumber,
          'topic': topic,
        }),
      );

      if (response.statusCode == 200) {
        // Increment phone call usage after successful call
        await _subscriptionService.incrementUsage('phone_call');
        return json.decode(response.body);
      } else {
        print('Error initiating call: ${response.body}');
        return null;
      }
    } catch (e) {
      print('Error initiating call: $e');
      rethrow; // Re-throw so UI can handle UsageLimitException
    }
  }

  // Initiate SMS conversation with AI (multiple exchanges)
  static Future<Map<String, dynamic>?> initiateSmsConversation({
    required String phoneNumber,
    required String topic,
    required int messageCount,
  }) async {
    try {
      // Check if user can start an SMS conversation
      final canStartSms = await _subscriptionService.canPerformAction('text_chain');
      if (!canStartSms) {
        throw UsageLimitException(
          'You have reached your SMS conversation limit for this billing period. Please upgrade your plan to start more conversations.',
          'text_chain'
        );
      }

      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$_baseUrl/initiate-sms-conversation'),
        headers: headers,
        body: json.encode({
          'phone_number': phoneNumber,
          'topic': topic,
          'message_count': messageCount,
        }),
      );

      if (response.statusCode == 200) {
        // Increment SMS usage after successful initiation
        await _subscriptionService.incrementUsage('text_chain');
        return json.decode(response.body);
      } else {
        print('Error initiating SMS conversation: ${response.body}');
        return null;
      }
    } catch (e) {
      print('Error initiating SMS conversation: $e');
      rethrow; // Re-throw so UI can handle UsageLimitException
    }
  }

  // Send single SMS message
  static Future<Map<String, dynamic>?> sendSingleSms({
    required String phoneNumber,
    required String message,
  }) async {
    try {
      // Check if user can send an SMS
      final canSendSms = await _subscriptionService.canPerformAction('text_chain');
      if (!canSendSms) {
        throw UsageLimitException(
          'You have reached your SMS limit for this billing period. Please upgrade your plan to send more messages.',
          'text_chain'
        );
      }

      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$_baseUrl/send-single-sms'),
        headers: headers,
        body: json.encode({
          'phone_number': phoneNumber,
          'message': message,
        }),
      );

      if (response.statusCode == 200) {
        // Increment SMS usage after successful send
        await _subscriptionService.incrementUsage('text_chain');
        return json.decode(response.body);
      } else {
        print('Error sending SMS: ${response.body}');
        return null;
      }
    } catch (e) {
      print('Error sending SMS: $e');
      rethrow; // Re-throw so UI can handle UsageLimitException
    }
  }

  // Send email with usage checking
  static Future<Map<String, dynamic>?> sendEmail({
    required String recipientEmail,
    required String subject,
    String? content,
    String? type,
    String? topic,
    String? fromEmail,
  }) async {
    try {
      // Check if user can send an email
      final canSendEmail = await _subscriptionService.canPerformAction('email');
      if (!canSendEmail) {
        throw UsageLimitException(
          'You have reached your email limit for this billing period. Please upgrade your plan to send more emails.',
          'email'
        );
      }

      final headers = await _getHeaders();
      final body = {
        'recipient_email': recipientEmail,
        'subject': subject,
      };

      if (content != null) body['content'] = content;
      if (type != null) body['type'] = type;
      if (topic != null) body['topic'] = topic;
      if (fromEmail != null) body['from_email'] = fromEmail;

      final response = await http.post(
        Uri.parse('$_baseUrl/send-email'),
        headers: headers,
        body: json.encode(body),
      );

      if (response.statusCode == 200) {
        // Increment email usage after successful send
        await _subscriptionService.incrementUsage('email');
        return json.decode(response.body);
      } else {
        print('Error sending email: ${response.body}');
        return null;
      }
    } catch (e) {
      print('Error sending email: $e');
      rethrow; // Re-throw so UI can handle UsageLimitException
    }
  }

  // Update user email
  static Future<bool> updateUserEmail({required String newEmail}) async {
    try {
      final response = await SupabaseConfig.auth.updateUser(
        supabase.UserAttributes(email: newEmail),
      );
      
      if (response.user != null) {
        return true;
      } else {
        print('Error updating email: No user returned');
        return false;
      }
    } catch (e) {
      print('Error updating email: $e');
      return false;
    }
  }

  // Initiate email change with verification
  static Future<bool> initiateEmailChange({required String newEmail}) async {
    try {
      final user = SupabaseConfig.client.auth.currentUser;
      if (user == null) {
        ErrorHandlerService().logError(
          AppError.withTimestamp(
            type: ErrorType.authentication,
            code: 'AUTH_REQUIRED',
            title: 'User Not Authenticated',
            message: 'User must be authenticated to change their email.',
            technicalDetails: 'Attempted to change email while user was null.'
          )
        );
        return false;
      }

      // Step 1: Store the pending email in the public.users table FIRST.
      // Our RLS policy (set in Supabase dashboard) must allow this.
      await SupabaseConfig.client
          .from('users')
          .update({'pending_email': newEmail})
          .eq('id', user.id);

      // Step 2: Trigger the Supabase auth email change process.
      // This sends the verification link to the user's OLD email address.
      await SupabaseConfig.client.auth.updateUser(
        supabase.UserAttributes(email: newEmail),
      );

      return true;
    } catch (e, st) {
      ErrorHandlerService().logError(
        AppError.withTimestamp(
          type: ErrorType.serverError,
          code: 'EMAIL_CHANGE_FAILED',
          title: 'Email Change Failed',
          message: 'An error occurred while trying to initiate the email change.',
          technicalDetails: 'Error: $e\nContext: ApiService.initiateEmailChange\nStack: $st',
        ),
      );
      return false;
    }
  }

  // Update user password
  static Future<bool> updateUserPassword({required String newPassword}) async {
    try {
      final response = await SupabaseConfig.auth.updateUser(
        supabase.UserAttributes(password: newPassword),
      );
      
      if (response.user != null) {
        return true;
      } else {
        print('Error updating password: No user returned');
        return false;
      }
    } catch (e) {
      print('Error updating password: $e');
      return false;
    }
  }

  // Initiate password change with verification
  static Future<bool> initiatePasswordChange({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      // First verify current password by signing in
      final currentUser = SupabaseConfig.auth.currentUser;
      if (currentUser?.email == null) {
        return false;
      }

      // Verify current password
      final signInResponse = await SupabaseConfig.auth.signInWithPassword(
        email: currentUser!.email!,
        password: currentPassword,
      );

      if (signInResponse.user == null) {
        print('Current password verification failed');
        return false;
      }

      // For now, directly update the password since Supabase doesn't have 
      // built-in email verification for password changes
      final response = await SupabaseConfig.auth.updateUser(
        supabase.UserAttributes(password: newPassword),
      );
      
      if (response.user != null) {
        return true;
      } else {
        print('Error updating password: No user returned');
        return false;
      }
    } catch (e) {
      print('Error initiating password change: $e');
      return false;
    }
  }

  // Helper methods for checking specific action availability
  static Future<bool> canMakePhoneCall() async {
    return await _subscriptionService.canPerformAction('phone_call');
  }

  static Future<bool> canStartTextChat() async {
    return await _subscriptionService.canPerformAction('text_chain');
  }

  static Future<bool> canSendEmail() async {
    return await _subscriptionService.canPerformAction('email');
  }

  // Get call history for current user
  static Future<List<CallRecord>> getCallHistory({int limit = 50, int offset = 0}) async {
    try {
      final userId = SupabaseConfig.auth.currentUser?.id;
      if (userId == null) {
        print('No authenticated user');
        return [];
      }

      // Query calls table directly using Supabase client
      final response = await SupabaseConfig.client
          .from('calls')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(limit)
          .range(offset, offset + limit - 1);

      if (response == null) return [];

      return (response as List<dynamic>)
          .map((json) => CallRecord.fromJson(json))
          .toList();
    } catch (e) {
      print('Error getting call history: $e');
      return [];
    }
  }

  // Re-call with same topic (for call history screen)
  static Future<Map<String, dynamic>?> redialCall({
    required String phoneNumber,
    required String topic,
  }) async {
    // Use the same initiate call method
    return await initiateCall(phoneNumber: phoneNumber, topic: topic);
  }

  // Get email history
  static Future<List<EmailRecord>> getEmailHistory({int limit = 50, int offset = 0}) async {
    try {
      final userId = SupabaseConfig.auth.currentUser?.id;
      if (userId == null) {
        print('No authenticated user');
        return [];
      }

      // Query emails table using Supabase client
      final response = await SupabaseConfig.client
          .from('emails')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(limit)
          .range(offset, offset + limit - 1);

      if (response == null) return [];

      return (response as List<dynamic>)
          .map((json) => EmailRecord.fromJson(json))
          .toList();
    } catch (e) {
      print('Error getting email history: $e');
      return [];
    }
  }

  // Get SMS history
  static Future<List<SmsRecord>> getSmsHistory({int limit = 50, int offset = 0}) async {
    try {
      final userId = SupabaseConfig.auth.currentUser?.id;
      if (userId == null) {
        print('No authenticated user');
        return [];
      }

      // Query sms_messages table using Supabase client
      final response = await SupabaseConfig.client
          .from('sms_messages')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(limit)
          .range(offset, offset + limit - 1);

      if (response == null) return [];

      return (response as List<dynamic>)
          .map((json) => SmsRecord.fromJson(json))
          .toList();
    } catch (e) {
      print('Error getting SMS history: $e');
      return [];
    }
  }

  // Get unified activity history
  static Future<List<ActivityRecord>> getActivityHistory({int limit = 50}) async {
    try {
      final List<ActivityRecord> activities = [];

      // Get all three types of activity in parallel
      final futures = await Future.wait([
        getCallHistory(limit: limit),
        getEmailHistory(limit: limit),
        getSmsHistory(limit: limit),
      ]);

      final calls = futures[0] as List<CallRecord>;
      final emails = futures[1] as List<EmailRecord>;
      final smsMessages = futures[2] as List<SmsRecord>;

      // Convert to ActivityRecord and combine
      activities.addAll(calls.map((call) => ActivityRecord.fromCall(call)));
      activities.addAll(emails.map((email) => ActivityRecord.fromEmail(email)));
      activities.addAll(smsMessages.map((sms) => ActivityRecord.fromSms(sms)));

      // Sort by date (newest first)
      activities.sort((a, b) => b.createdAt.compareTo(a.createdAt));

      // Return limited results
      return activities.take(limit).toList();
    } catch (e) {
      print('Error getting activity history: $e');
      return [];
    }
  }
} 