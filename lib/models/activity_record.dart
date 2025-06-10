import 'package:equatable/equatable.dart';
import 'call_record.dart';
import 'email_record.dart';
import 'sms_record.dart';

enum ActivityType { call, email, sms }

class ActivityRecord extends Equatable {
  final String id;
  final ActivityType type;
  final DateTime createdAt;
  final String status;
  final String mainText; // Phone number, email address, or phone number for SMS
  final String secondaryText; // Topic, subject, or message preview
  final CallRecord? callRecord;
  final EmailRecord? emailRecord;
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

  // Helper getters
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