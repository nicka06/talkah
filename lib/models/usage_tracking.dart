import 'package:equatable/equatable.dart';

class UsageTracking extends Equatable {
  final String userId;
  final int phoneCallsUsed;
  final int textChainsUsed; 
  final int emailsUsed;
  final int phoneCallsLimit;
  final int textChainsLimit;
  final int emailsLimit;
  final DateTime billingPeriodStart;
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
  bool get hasPhoneCallsRemaining => phoneCallsLimit == -1 || phoneCallsUsed < phoneCallsLimit;
  bool get hasTextChainsRemaining => textChainsLimit == -1 || textChainsUsed < textChainsLimit;
  bool get hasEmailsRemaining => emailsLimit == -1 || emailsUsed < emailsLimit;

  int get phoneCallsRemaining => phoneCallsLimit == -1 ? -1 : (phoneCallsLimit - phoneCallsUsed).clamp(0, phoneCallsLimit);
  int get textChainsRemaining => textChainsLimit == -1 ? -1 : (textChainsLimit - textChainsUsed).clamp(0, textChainsLimit);
  int get emailsRemaining => emailsLimit == -1 ? -1 : (emailsLimit - emailsUsed).clamp(0, emailsLimit);

  // Display helpers
  String get phoneCallsDisplay => phoneCallsLimit == -1 ? '$phoneCallsUsed used' : '$phoneCallsUsed / $phoneCallsLimit';
  String get textChainsDisplay => textChainsLimit == -1 ? '$textChainsUsed used' : '$textChainsUsed / $textChainsLimit';
  String get emailsDisplay => emailsLimit == -1 ? '$emailsUsed used' : '$emailsUsed / $emailsLimit';

  // Progress helpers (0.0 to 1.0)
  double get phoneCallsProgress => phoneCallsLimit == -1 ? 0.0 : (phoneCallsUsed / phoneCallsLimit).clamp(0.0, 1.0);
  double get textChainsProgress => textChainsLimit == -1 ? 0.0 : (textChainsUsed / textChainsLimit).clamp(0.0, 1.0);
  double get emailsProgress => emailsLimit == -1 ? 0.0 : (emailsUsed / emailsLimit).clamp(0.0, 1.0);

  // Billing period helpers
  Duration get timeRemainingInBillingPeriod {
    final now = DateTime.now();
    if (now.isAfter(billingPeriodEnd)) return Duration.zero;
    return billingPeriodEnd.difference(now);
  }

  bool get isInCurrentBillingPeriod {
    final now = DateTime.now();
    return now.isAfter(billingPeriodStart) && now.isBefore(billingPeriodEnd);
  }

  String get billingPeriodDisplay {
    final formatter = (DateTime date) {
      return '${date.month}/${date.day}/${date.year}';
    };
    return '${formatter(billingPeriodStart)} - ${formatter(billingPeriodEnd)}';
  }

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