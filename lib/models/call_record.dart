import 'package:equatable/equatable.dart';

class CallRecord extends Equatable {
  final String id;
  final String? userId;
  final String userPhoneNumber;
  final String topic;
  final String twilioCallSid;
  final String status; // initiated, ringing, answered, completed, failed, no-answer, busy, canceled
  final DateTime createdAt;
  final DateTime? answeredTime;
  final DateTime? completedTime;
  final int? durationSeconds;

  const CallRecord({
    required this.id,
    this.userId,
    required this.userPhoneNumber,
    required this.topic,
    required this.twilioCallSid,
    required this.status,
    required this.createdAt,
    this.answeredTime,
    this.completedTime,
    this.durationSeconds,
  });

  // Helper getters
  bool get wasAnswered => answeredTime != null;
  bool get wasCompleted => completedTime != null && status == 'completed';
  bool get isSuccessful => wasAnswered && wasCompleted;
  
  String get formattedDuration {
    if (durationSeconds == null || durationSeconds! <= 0) return '--:--';
    final minutes = durationSeconds! ~/ 60;
    final seconds = durationSeconds! % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  String get displayStatus {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'answered':
        return 'Answered';
      case 'failed':
        return 'Failed';
      case 'no-answer':
        return 'No Answer';
      case 'busy':
        return 'Busy';
      case 'canceled':
        return 'Canceled';
      case 'initiated':
        return 'Initiated';
      case 'ringing':
        return 'Ringing';
      default:
        return status.toUpperCase();
    }
  }

  String get formattedPhoneNumber {
    // Format phone number as (XXX) XXX-XXXX for US numbers
    final cleanNumber = userPhoneNumber.replaceAll(RegExp(r'[^\d]'), '');
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
    return userPhoneNumber; // Return original if formatting fails
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

  factory CallRecord.fromJson(Map<String, dynamic> json) {
    return CallRecord(
      id: json['id'].toString(),
      userId: json['user_id']?.toString(),
      userPhoneNumber: json['user_phone_number'] as String,
      topic: json['topic'] as String,
      twilioCallSid: json['twilio_call_sid'] as String,
      status: json['status'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      answeredTime: json['answered_time'] != null 
          ? DateTime.parse(json['answered_time'] as String) 
          : null,
      completedTime: json['completed_time'] != null 
          ? DateTime.parse(json['completed_time'] as String) 
          : null,
      durationSeconds: json['duration_seconds'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'user_phone_number': userPhoneNumber,
      'topic': topic,
      'twilio_call_sid': twilioCallSid,
      'status': status,
      'created_at': createdAt.toIso8601String(),
      'answered_time': answeredTime?.toIso8601String(),
      'completed_time': completedTime?.toIso8601String(),
      'duration_seconds': durationSeconds,
    };
  }

  @override
  List<Object?> get props => [
    id,
    userId,
    userPhoneNumber,
    topic,
    twilioCallSid,
    status,
    createdAt,
    answeredTime,
    completedTime,
    durationSeconds,
  ];
} 