/// SmsRecord - SMS/text message activity tracking and management
/// 
/// This model represents individual SMS records including:
/// - SMS metadata (ID, user, phone number, message text)
/// - Message direction (inbound, outbound)
/// - Message type classification (single, ai_conversation)
/// - Twilio integration (message SID, status tracking)
/// - SMS status throughout delivery lifecycle
/// 
/// USAGE: Used throughout the app in:
/// - sms_screen.dart: SMS composition and sending
/// - activity_history_screen.dart: SMS history display
/// - activity_record.dart: Unified activity tracking
/// - api_service.dart: SMS data operations
/// - usage_tracking.dart: SMS usage calculations
/// 
/// This model is CRITICAL for SMS functionality and provides
/// detailed tracking of message attempts, delivery status, and usage metrics.
import 'package:equatable/equatable.dart';

/// Represents an SMS record with complete delivery tracking
class SmsRecord extends Equatable {
  /// Unique SMS identifier
  final String id;
  
  /// User ID who sent/received the SMS
  final String? userId;
  
  /// Phone number for the SMS
  final String phoneNumber;
  
  /// SMS message content
  final String messageText;
  
  /// Message direction (inbound, outbound)
  final String direction;
  
  /// Message type (single, ai_conversation)
  final String type;
  
  /// Current SMS status (sent, failed, pending)
  final String status;
  
  /// Twilio message SID for external service integration
  final String? twilioMessageSid;
  
  /// Conversation ID for multi-message conversations
  final String? conversationId;
  
  /// When the SMS was created/sent
  final DateTime createdAt;

  const SmsRecord({
    required this.id,
    this.userId,
    required this.phoneNumber,
    required this.messageText,
    required this.direction,
    required this.type,
    required this.status,
    this.twilioMessageSid,
    this.conversationId,
    required this.createdAt,
  });

  // Helper getters for SMS status
  
  /// Whether the SMS was successfully sent
  bool get wasSuccessful => status == 'sent';
  
  /// Whether the SMS was outbound (sent by user)
  bool get isOutbound => direction == 'outbound';
  
  /// Whether the SMS was part of an AI conversation
  bool get isAiConversation => type == 'ai_conversation';
  
  /// Helper getter for formatted phone number display
  String get formattedPhoneNumber {
    // Format phone number as (XXX) XXX-XXXX for US numbers
    final cleanNumber = phoneNumber.replaceAll(RegExp(r'[^\d]'), '');
    if (cleanNumber.length == 11 && cleanNumber.startsWith('1')) {
      final areaCode = cleanNumber.substring(1, 4);
      final firstThree = cleanNumber.substring(4, 7);
      final lastFour = cleanNumber.substring(7);
      return '($areaCode) $firstThree-$lastFour';
    } else if (cleanNumber.length == 10) {
      final areaCode = cleanNumber.substring(0, 3);
      final firstThree = cleanNumber.substring(3, 6);
      final lastFour = cleanNumber.substring(6);
      return '($areaCode) $firstThree-$lastFour';
    }
    return phoneNumber; // Return original if formatting fails
  }
  
  /// Helper getter for human-readable status
  String get displayStatus {
    switch (status) {
      case 'sent':
        return 'Sent';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return status.toUpperCase();
    }
  }

  /// Helper getter for formatted date display
  String get formattedDate {
    final now = DateTime.now();
    final difference = now.difference(createdAt);
    
    if (difference.inDays == 0) {
      final hour = createdAt.hour;
      final minute = createdAt.minute.toString().padLeft(2, '0');
      final period = hour >= 12 ? 'PM' : 'AM';
      final displayHour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour);
      return '$displayHour:$minute $period';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} days ago';
    } else {
      return '${createdAt.month}/${createdAt.day}/${createdAt.year}';
    }
  }

  /// Helper getter for shortened message display
  String get shortMessage {
    if (messageText.length <= 50) return messageText;
    return '${messageText.substring(0, 47)}...';
  }

  /// Create SmsRecord from JSON data
  /// Expects data from the sms_records table
  factory SmsRecord.fromJson(Map<String, dynamic> json) {
    return SmsRecord(
      id: json['id'].toString(),
      userId: json['user_id']?.toString(),
      phoneNumber: json['phone_number'] as String,
      messageText: json['message_text'] as String,
      direction: json['direction'] as String,
      type: json['type'] as String,
      status: json['status'] as String,
      twilioMessageSid: json['twilio_message_sid'] as String?,
      conversationId: json['conversation_id']?.toString(),
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  /// Convert to JSON for storage
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'phone_number': phoneNumber,
      'message_text': messageText,
      'direction': direction,
      'type': type,
      'status': status,
      'twilio_message_sid': twilioMessageSid,
      'conversation_id': conversationId,
      'created_at': createdAt.toIso8601String(),
    };
  }

  @override
  List<Object?> get props => [
    id,
    userId,
    phoneNumber,
    messageText,
    direction,
    type,
    status,
    twilioMessageSid,
    conversationId,
    createdAt,
  ];
} 