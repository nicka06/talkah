import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;
import '../config/supabase_config.dart';
import '../models/usage_model.dart';
import '../models/text_conversation_model.dart';

class ApiService {
  static String get _baseUrl => '${SupabaseConfig.supabaseUrl}/functions/v1';
  
  static Future<Map<String, String>> _getHeaders() async {
    final session = SupabaseConfig.auth.currentSession;
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${session?.accessToken}',
    };
  }

  // Get user usage and limits
  static Future<UsageModel?> getUserUsage() async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$_baseUrl/get-user-usage'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return UsageModel.fromJson(data);
      } else {
        print('Error getting usage: ${response.body}');
        return null;
      }
    } catch (e) {
      print('Error getting usage: $e');
      return null;
    }
  }

  // Initiate phone call
  static Future<Map<String, dynamic>?> initiateCall({
    required String phoneNumber,
    required String topic,
  }) async {
    try {
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
        return json.decode(response.body);
      } else {
        print('Error initiating call: ${response.body}');
        return null;
      }
    } catch (e) {
      print('Error initiating call: $e');
      return null;
    }
  }

  // Start text conversation
  static Future<String?> initiateTextChat({required String topic}) async {
    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$_baseUrl/initiate-text-chat'),
        headers: headers,
        body: json.encode({'topic': topic}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['conversation_id'];
      } else {
        print('Error starting text chat: ${response.body}');
        return null;
      }
    } catch (e) {
      print('Error starting text chat: $e');
      return null;
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

  // Send email
  static Future<Map<String, dynamic>?> sendEmail({
    required String recipientEmail,
    required String subject,
    String? content,
    String? type,
    String? topic,
  }) async {
    try {
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
        return json.decode(response.body);
      } else {
        print('Error sending email: ${response.body}');
        return null;
      }
    } catch (e) {
      print('Error sending email: $e');
      return null;
    }
  }
} 