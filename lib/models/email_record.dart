import 'package:equatable/equatable.dart';

class EmailRecord extends Equatable {
  final String id;
  final String? userId;
  final String recipientEmail;
  final String subject;
  final String? content;
  final String type; // ai_generated, custom
  final String? topic;
  final String status; // sent, failed, pending
  final String? fromEmail;
  final String? sendgridMessageId;
  final DateTime createdAt;

  const EmailRecord({
    required this.id,
    this.userId,
    required this.recipientEmail,
    required this.subject,
    this.content,
    required this.type,
    this.topic,
    required this.status,
    this.fromEmail,
    this.sendgridMessageId,
    required this.createdAt,
  });

  // Helper getters
  bool get wasSuccessful => status == 'sent';
  bool get isAiGenerated => type == 'ai_generated';
  
  String get displayFromEmail => fromEmail ?? 'hello@talkah.com';
  
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

  String get shortSubject {
    if (subject.length <= 30) return subject;
    return '${subject.substring(0, 27)}...';
  }

  factory EmailRecord.fromJson(Map<String, dynamic> json) {
    return EmailRecord(
      id: json['id'].toString(),
      userId: json['user_id']?.toString(),
      recipientEmail: json['recipient_email'] as String,
      subject: json['subject'] as String,
      content: json['content'] as String?,
      type: json['type'] as String,
      topic: json['topic'] as String?,
      status: json['status'] as String,
      fromEmail: json['from_email'] as String?,
      sendgridMessageId: json['sendgrid_message_id'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'recipient_email': recipientEmail,
      'subject': subject,
      'content': content,
      'type': type,
      'topic': topic,
      'status': status,
      'from_email': fromEmail,
      'sendgrid_message_id': sendgridMessageId,
      'created_at': createdAt.toIso8601String(),
    };
  }

  @override
  List<Object?> get props => [
    id,
    userId,
    recipientEmail,
    subject,
    content,
    type,
    topic,
    status,
    fromEmail,
    sendgridMessageId,
    createdAt,
  ];
} 