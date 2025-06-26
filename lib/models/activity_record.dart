/// ActivityRecord - Unified activity tracking across all communication types
/// 
/// This model provides a unified interface for displaying user activity
/// across different communication types (calls, emails, SMS). It includes:
/// - Common activity metadata (ID, type, timestamps, status)
/// - Type-specific data through optional record references
/// - Formatted display information for UI
/// 
/// USAGE: Used throughout the app in:
/// - activity_history_screen.dart: Display unified activity feed
/// - activity_bloc.dart: Activity state management
/// - dashboard_screen.dart: Recent activity display
/// - api_service.dart: Activity data operations
/// 
/// This model is USEFUL for providing a consistent activity experience
/// across different communication types in the UI.
import 'package:equatable/equatable.dart';
import 'call_record.dart';
import 'email_record.dart';
import 'sms_record.dart';

/// Enumeration of activity types for categorization
enum ActivityType { 
  /// Phone call activities
  call, 
  /// Email activities
  email, 
  /// SMS/text activities
  sms 
}

/// Unified activity record for displaying user communication history
class ActivityRecord extends Equatable {
  /// Unique activity identifier
  final String id;
  
  /// Type of activity (call, email, sms)
  final ActivityType type;
  
  /// When the activity occurred
  final DateTime createdAt;
  
  /// Activity status (success, failed, pending)
  final String status;
  
  /// Primary display text (phone number, email address)
  final String mainText;
  
  /// Secondary display text (topic, subject, message preview)
  final String secondaryText;
  
  /// Detailed call record (if type is call)
  final CallRecord? callRecord;
  
  /// Detailed email record (if type is email)
  final EmailRecord? emailRecord;
  
  /// Detailed SMS record (if type is sms)
  final SmsRecord? smsRecord;

  const ActivityRecord({
    required this.id,
    required this.type,
    required this.createdAt,
    required this.status,
    required this.mainText,
    required this.secondaryText,
    this.callRecord,
    this.emailRecord,
    this.smsRecord,
  });

  /// Helper getter to check if activity was successful
  bool get wasSuccessful {
    switch (type) {
      case ActivityType.call:
        return callRecord?.isSuccessful ?? false;
      case ActivityType.email:
        return emailRecord?.wasSuccessful ?? false;
      case ActivityType.sms:
        return smsRecord?.wasSuccessful ?? false;
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

  /// Helper getter for display status
  String get displayStatus {
    switch (type) {
      case ActivityType.call:
        return callRecord?.displayStatus ?? status;
      case ActivityType.email:
        return emailRecord?.displayStatus ?? status;
      case ActivityType.sms:
        return smsRecord?.displayStatus ?? status;
    }
  }

  /// Helper getter for detail text
  String get detailText {
    switch (type) {
      case ActivityType.call:
        return callRecord?.formattedDuration ?? '--:--';
      case ActivityType.email:
        return emailRecord?.displayFromEmail ?? '';
      case ActivityType.sms:
        return smsRecord?.isOutbound == true ? 'Outbound' : 'Inbound';
    }
  }

  // Factory constructors for each type
  
  /// Create ActivityRecord from CallRecord
  factory ActivityRecord.fromCall(CallRecord call) {
    return ActivityRecord(
      id: call.id,
      type: ActivityType.call,
      createdAt: call.createdAt,
      status: call.status,
      mainText: call.formattedPhoneNumber,
      secondaryText: call.topic,
      callRecord: call,
    );
  }

  /// Create ActivityRecord from EmailRecord
  factory ActivityRecord.fromEmail(EmailRecord email) {
    return ActivityRecord(
      id: email.id,
      type: ActivityType.email,
      createdAt: email.createdAt,
      status: email.status,
      mainText: email.recipientEmail,
      secondaryText: email.shortSubject,
      emailRecord: email,
    );
  }

  /// Create ActivityRecord from SmsRecord
  factory ActivityRecord.fromSms(SmsRecord sms) {
    return ActivityRecord(
      id: sms.id,
      type: ActivityType.sms,
      createdAt: sms.createdAt,
      status: sms.status,
      mainText: sms.formattedPhoneNumber,
      secondaryText: sms.shortMessage,
      smsRecord: sms,
    );
  }

  @override
  List<Object?> get props => [
    id,
    type,
    createdAt,
    status,
    mainText,
    secondaryText,
    callRecord,
    emailRecord,
    smsRecord,
  ];
} 