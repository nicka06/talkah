import 'package:equatable/equatable.dart';

class SmsRecord extends Equatable {
  final String id;
  final String? userId;
  final String phoneNumber;
  final String messageText;
  final String direction; // inbound, outbound
  final String type; // single, ai_conversation
  final String status; // sent, failed, pending
  final String? twilioMessageSid;
  final String? conversationId;
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

  // Helper getters
  bool get wasSuccessful => status == 'sent';
  bool get isOutbound => direction == 'outbound';
  bool get isAiConversation => type == 'ai_conversation';
  
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

  String get shortMessage {
    if (messageText.length <= 50) return messageText;
    return '${messageText.substring(0, 47)}...';
  }

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