/// CallRecord - Phone call activity tracking and management
/// 
/// This model represents individual phone call records including:
/// - Call metadata (ID, user, phone number, topic)
/// - Twilio integration (call SID, status tracking)
/// - Call timing (initiation, answer, completion, duration)
/// - Status tracking throughout call lifecycle
/// 
/// USAGE: Used throughout the app in:
/// - phone_screen.dart: Call initiation and management
/// - activity_history_screen.dart: Call history display
/// - activity_record.dart: Unified activity tracking
/// - api_service.dart: Call data operations
/// - usage_tracking.dart: Call usage calculations
/// 
/// This model is CRITICAL for phone call functionality and provides
/// detailed tracking of call attempts, success rates, and usage metrics.
import 'package:equatable/equatable.dart';

/// Represents a phone call record with complete lifecycle tracking
class CallRecord extends Equatable {
  /// Unique call identifier
  final String id;
  
  /// User ID who initiated the call
  final String? userId;
  
  /// Phone number that was called
  final String userPhoneNumber;
  
  /// Topic/subject of the call conversation
  final String topic;
  
  /// Twilio call SID for external service integration
  final String twilioCallSid;
  
  /// Current call status (initiated, ringing, answered, completed, failed, etc.)
  final String status;
  
  /// When the call was initiated
  final DateTime createdAt;
  
  /// When the call was answered (if successful)
  final DateTime? answeredTime;
  
  /// When the call was completed (if successful)
  final DateTime? completedTime;
  
  /// Call duration in seconds (if completed)
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

  // Helper getters for call status
  
  /// Whether the call was answered by the recipient
  bool get wasAnswered => answeredTime != null;
  
  /// Whether the call was successfully completed
  bool get wasCompleted => completedTime != null && status == 'completed';
  
  /// Whether the call was successful (answered and completed)
  bool get isSuccessful => wasAnswered && wasCompleted;
  
  /// Helper getter for formatted duration display
  String get formattedDuration {
    if (durationSeconds == null || durationSeconds! <= 0) return '--:--';
    final minutes = durationSeconds! ~/ 60;
    final seconds = durationSeconds! % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  /// Helper getter for human-readable status
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

  /// Helper getter for formatted phone number display
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

  /// Create CallRecord from JSON data
  /// Expects data from the call_records table
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

  /// Convert to JSON for storage
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