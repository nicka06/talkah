/// EmailRecord - Email activity tracking and management
/// 
/// This model represents individual email records including:
/// - Email metadata (ID, user, recipient, subject, content)
/// - Email type classification (AI-generated vs custom)
/// - SendGrid integration (message ID, status tracking)
/// - Email status throughout delivery lifecycle
/// 
/// USAGE: Used throughout the app in:
/// - email_screen.dart: Email composition and sending
/// - activity_history_screen.dart: Email history display
/// - activity_record.dart: Unified activity tracking
/// - api_service.dart: Email data operations
/// - usage_tracking.dart: Email usage calculations
/// 
/// This model is CRITICAL for email functionality and provides
/// detailed tracking of email attempts, delivery status, and usage metrics.
import 'package:equatable/equatable.dart';

/// Represents an email record with complete delivery tracking
class EmailRecord extends Equatable {
  /// Unique email identifier
  final String id;
  
  /// User ID who sent the email
  final String? userId;
  
  /// Recipient email address
  final String recipientEmail;
  
  /// Email subject line
  final String subject;
  
  /// Email content/body (optional for display)
  final String? content;
  
  /// Email type (ai_generated, custom)
  final String type;
  
  /// Topic/subject for AI-generated emails
  final String? topic;
  
  /// Current email status (sent, failed, pending)
  final String status;
  
  /// From email address (defaults to app email)
  final String? fromEmail;
  
  /// SendGrid message ID for external service integration
  final String? sendgridMessageId;
  
  /// When the email was created/sent
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

  // Helper getters for email status
  
  /// Whether the email was successfully sent
  bool get wasSuccessful => status == 'sent';
  
  /// Whether the email was AI-generated
  bool get isAiGenerated => type == 'ai_generated';
  
  /// Helper getter for display from email address
  String get displayFromEmail => fromEmail ?? 'hello@talkah.com';
  
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

  /// Helper getter for shortened subject display
  String get shortSubject {
    if (subject.length <= 30) return subject;
    return '${subject.substring(0, 27)}...';
  }

  /// Create EmailRecord from JSON data
  /// Expects data from the email_records table
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

  /// Convert to JSON for storage
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