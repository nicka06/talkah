import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;
import '../config/supabase_config.dart';
import '../models/usage_model.dart';
import '../models/text_conversation_model.dart';
import './subscription_service.dart';

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

  // Start text conversation with usage checking
  static Future<String?> initiateTextChat({required String topic}) async {
    try {
      // Check if user can start a text conversation
      final canStartText = await _subscriptionService.canPerformAction('text_chain');
      if (!canStartText) {
        throw UsageLimitException(
          'You have reached your text conversation limit for this billing period. Please upgrade your plan to start more conversations.',
          'text_chain'
        );
      }

      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$_baseUrl/initiate-text-chat'),
        headers: headers,
        body: json.encode({'topic': topic}),
      );

      if (response.statusCode == 200) {
        // Increment text chain usage after successful chat start
        await _subscriptionService.incrementUsage('text_chain');
        final data = json.decode(response.body);
        return data['conversation_id'];
      } else {
        print('Error starting text chat: ${response.body}');
        return null;
      }
    } catch (e) {
      print('Error starting text chat: $e');
      rethrow; // Re-throw so UI can handle UsageLimitException
    }
  }

  // Send text message and get AI response
  static Future<Map<String, dynamic>?> sendTextMessage({
    required String conversationId,
    required String message,
  }) async {
    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$_baseUrl/send-text-message'),
        headers: headers,
        body: json.encode({
          'conversation_id': conversationId,
          'message': message,
        }),
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        print('Error sending message: ${response.body}');
        return null;
      }
    } catch (e) {
      print('Error sending message: $e');
      return null;
    }
  }

  // Send email with usage checking
  static Future<Map<String, dynamic>?> sendEmail({
    required String recipientEmail,
    required String subject,
    String? content,
    String? type,
    String? topic,
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
      // Supabase automatically sends verification email when updating email
      final response = await SupabaseConfig.auth.updateUser(
        supabase.UserAttributes(email: newEmail),
      );
      
      if (response.user != null) {
        return true;
      } else {
        print('Error initiating email change: No user returned');
        return false;
      }
    } catch (e) {
      print('Error initiating email change: $e');
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
} 