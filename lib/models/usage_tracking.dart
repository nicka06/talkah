/// UsageTracking - Comprehensive usage monitoring and limit enforcement
/// 
/// This model represents detailed usage tracking for a user including:
/// - Current usage counts for all communication types
/// - Usage limits based on subscription plan
/// - Billing period tracking and calculations
/// - Progress indicators and remaining usage
/// 
/// USAGE: Used throughout the app in:
/// - usage_bloc.dart: Usage state management and calculations
/// - usage_display_widget.dart: Display usage statistics
/// - usage_limit_modal.dart: Show limits and remaining usage
/// - dashboard_screen.dart: Usage overview display
/// - api_service.dart: Usage data operations
/// 
/// This model is CRITICAL for subscription enforcement and provides
/// the foundation for usage-based feature access control.
import 'package:equatable/equatable.dart';

/// Represents comprehensive usage tracking for a user
class UsageTracking extends Equatable {
  /// User ID for this usage tracking
  final String userId;
  
  /// Number of phone calls used in current billing period
  final int phoneCallsUsed;
  
  /// Number of text conversations used in current billing period
  final int textChainsUsed;
  
  /// Number of emails used in current billing period
  final int emailsUsed;
  
  /// Maximum phone calls allowed (-1 = unlimited)
  final int phoneCallsLimit;
  
  /// Maximum text conversations allowed (-1 = unlimited)
  final int textChainsLimit;
  
  /// Maximum emails allowed (-1 = unlimited)
  final int emailsLimit;
  
  /// Start of current billing period
  final DateTime billingPeriodStart;
  
  /// End of current billing period
  final DateTime billingPeriodEnd;

  const UsageTracking({
    required this.userId,
    required this.phoneCallsUsed,
    required this.textChainsUsed,
    required this.emailsUsed,
    required this.phoneCallsLimit,
    required this.textChainsLimit,
    required this.emailsLimit,
    required this.billingPeriodStart,
    required this.billingPeriodEnd,
  });

  // Helper getters for checking limits
  
  /// Whether user has phone calls remaining
  bool get hasPhoneCallsRemaining => phoneCallsLimit == -1 || phoneCallsUsed < phoneCallsLimit;
  
  /// Whether user has text conversations remaining
  bool get hasTextChainsRemaining => textChainsLimit == -1 || textChainsUsed < textChainsLimit;
  
  /// Whether user has emails remaining
  bool get hasEmailsRemaining => emailsLimit == -1 || emailsUsed < emailsLimit;

  /// Number of phone calls remaining (-1 = unlimited)
  int get phoneCallsRemaining => phoneCallsLimit == -1 ? -1 : (phoneCallsLimit - phoneCallsUsed).clamp(0, phoneCallsLimit);
  
  /// Number of text conversations remaining (-1 = unlimited)
  int get textChainsRemaining => textChainsLimit == -1 ? -1 : (textChainsLimit - textChainsUsed).clamp(0, textChainsLimit);
  
  /// Number of emails remaining (-1 = unlimited)
  int get emailsRemaining => emailsLimit == -1 ? -1 : (emailsLimit - emailsUsed).clamp(0, emailsLimit);

  // Display helpers for UI formatting
  
  /// Formatted display string for phone calls (e.g., "5 used" or "5 / 10")
  String get phoneCallsDisplay => phoneCallsLimit == -1 ? '$phoneCallsUsed used' : '$phoneCallsUsed / $phoneCallsLimit';
  
  /// Formatted display string for text conversations
  String get textChainsDisplay => textChainsLimit == -1 ? '$textChainsUsed used' : '$textChainsUsed / $textChainsLimit';
  
  /// Formatted display string for emails
  String get emailsDisplay => emailsLimit == -1 ? '$emailsUsed used' : '$emailsUsed / $emailsLimit';

  // Progress helpers for UI indicators (0.0 to 1.0)
  
  /// Progress percentage for phone calls (0.0 to 1.0)
  double get phoneCallsProgress => phoneCallsLimit == -1 ? 0.0 : (phoneCallsUsed / phoneCallsLimit).clamp(0.0, 1.0);
  
  /// Progress percentage for text conversations (0.0 to 1.0)
  double get textChainsProgress => textChainsLimit == -1 ? 0.0 : (textChainsUsed / textChainsLimit).clamp(0.0, 1.0);
  
  /// Progress percentage for emails (0.0 to 1.0)
  double get emailsProgress => emailsLimit == -1 ? 0.0 : (emailsUsed / emailsLimit).clamp(0.0, 1.0);

  // Billing period helpers
  
  /// Time remaining in current billing period
  Duration get timeRemainingInBillingPeriod {
    final now = DateTime.now();
    if (now.isAfter(billingPeriodEnd)) return Duration.zero;
    return billingPeriodEnd.difference(now);
  }

  /// Whether current time is within billing period
  bool get isInCurrentBillingPeriod {
    final now = DateTime.now();
    return now.isAfter(billingPeriodStart) && now.isBefore(billingPeriodEnd);
  }

  /// Formatted billing period display string
  String get billingPeriodDisplay {
    final formatter = (DateTime date) {
      return '${date.month}/${date.day}/${date.year}';
    };
    return '${formatter(billingPeriodStart)} - ${formatter(billingPeriodEnd)}';
  }

  /// Create UsageTracking from JSON data
  /// Expects data from usage tracking API or database
  factory UsageTracking.fromJson(Map<String, dynamic> json) {
    return UsageTracking(
      userId: json['user_id'] as String? ?? '',
      phoneCallsUsed: json['phone_calls_used'] as int? ?? 0,
      textChainsUsed: json['text_chains_used'] as int? ?? 0,
      emailsUsed: json['emails_used'] as int? ?? 0,
      phoneCallsLimit: json['phone_calls_limit'] as int? ?? 0,
      textChainsLimit: json['text_chains_limit'] as int? ?? 0,
      emailsLimit: json['emails_limit'] as int? ?? 0,
      billingPeriodStart: DateTime.parse(json['billing_period_start'] as String),
      billingPeriodEnd: DateTime.parse(json['billing_period_end'] as String),
    );
  }

  /// Convert to JSON for storage
  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'phone_calls_used': phoneCallsUsed,
      'text_chains_used': textChainsUsed,
      'emails_used': emailsUsed,
      'phone_calls_limit': phoneCallsLimit,
      'text_chains_limit': textChainsLimit,
      'emails_limit': emailsLimit,
      'billing_period_start': billingPeriodStart.toIso8601String(),
      'billing_period_end': billingPeriodEnd.toIso8601String(),
    };
  }

  @override
  List<Object?> get props => [
    userId,
    phoneCallsUsed,
    textChainsUsed,
    emailsUsed,
    phoneCallsLimit,
    textChainsLimit,
    emailsLimit,
    billingPeriodStart,
    billingPeriodEnd,
  ];
} 