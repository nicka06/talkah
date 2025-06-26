/// UsageModel - User usage tracking and limits management
/// 
/// This model represents the current usage statistics for a user including:
/// - Usage counts (calls, texts, emails used)
/// - Current subscription tier
/// - Usage limits based on subscription plan
/// - Remaining usage calculations
/// 
/// USAGE: Used extensively throughout the app in:
/// - usage_bloc.dart: Usage state management and API calls
/// - usage_display_widget.dart: Display usage statistics in UI
/// - usage_limit_modal.dart: Show usage limits and remaining quotas
/// - dashboard_screen.dart: Display usage overview
/// - api_service.dart: Fetch usage data from backend
/// 
/// This model is CRITICAL for subscription enforcement and user experience.
/// It provides the data needed to enforce usage limits and show users
/// their current usage status.
class UsageModel {
  /// Number of calls used in current billing period
  final int callsUsed;
  
  /// Number of text messages sent in current billing period
  final int textsUsed;
  
  /// Number of emails sent in current billing period
  final int emailsUsed;
  
  /// Current subscription tier (free, pro, premium)
  final String tier;
  
  /// Usage limits for current subscription plan
  final UsageLimits limits;
  
  /// Remaining usage for current billing period
  final UsageRemaining remaining;

  UsageModel({
    required this.callsUsed,
    required this.textsUsed,
    required this.emailsUsed,
    required this.tier,
    required this.limits,
    required this.remaining,
  });

  /// Create UsageModel from JSON response
  /// Expects nested structure with usage, limits, and remaining data
  factory UsageModel.fromJson(Map<String, dynamic> json) {
    final usage = json['usage'];
    final limits = json['limits'];
    final remaining = json['remaining'];
    
    return UsageModel(
      callsUsed: usage['calls_used'] ?? 0,
      textsUsed: usage['texts_used'] ?? 0,
      emailsUsed: usage['emails_used'] ?? 0,
      tier: json['tier'] ?? 'free',
      limits: UsageLimits.fromJson(limits),
      remaining: UsageRemaining.fromJson(remaining),
    );
  }
}

/// UsageLimits - Defines usage limits for a subscription plan
/// 
/// Represents the maximum allowed usage for each feature type.
/// -1 indicates unlimited usage for that feature.
/// 
/// USAGE: Used within UsageModel to define plan limits and check
/// if features are unlimited or have specific quotas.
class UsageLimits {
  /// Maximum calls allowed (-1 = unlimited)
  final int calls;
  
  /// Maximum text messages allowed (-1 = unlimited)
  final int texts;
  
  /// Maximum emails allowed (-1 = unlimited)
  final int emails;

  UsageLimits({
    required this.calls,
    required this.texts,
    required this.emails,
  });

  /// Create UsageLimits from JSON data
  factory UsageLimits.fromJson(Map<String, dynamic> json) {
    return UsageLimits(
      calls: json['calls'],
      texts: json['texts'],
      emails: json['emails'],
    );
  }

  /// Helper getters to check if features are unlimited
  bool get hasUnlimitedCalls => calls == -1;
  bool get hasUnlimitedTexts => texts == -1;
  bool get hasUnlimitedEmails => emails == -1;
}

/// UsageRemaining - Calculates remaining usage for current billing period
/// 
/// Represents how much usage is left before hitting plan limits.
/// -1 indicates unlimited usage remaining.
/// 
/// USAGE: Used within UsageModel to show users how much they have left
/// and determine if they can perform actions without hitting limits.
class UsageRemaining {
  /// Remaining calls (-1 = unlimited)
  final int calls;
  
  /// Remaining text messages (-1 = unlimited)
  final int texts;
  
  /// Remaining emails (-1 = unlimited)
  final int emails;

  UsageRemaining({
    required this.calls,
    required this.texts,
    required this.emails,
  });

  /// Create UsageRemaining from JSON data
  factory UsageRemaining.fromJson(Map<String, dynamic> json) {
    return UsageRemaining(
      calls: json['calls'],
      texts: json['texts'],
      emails: json['emails'],
    );
  }

  /// Helper getters to check if usage is available
  bool get hasCallsRemaining => calls > 0 || calls == -1;
  bool get hasTextsRemaining => texts > 0 || texts == -1;
  bool get hasEmailsRemaining => emails > 0 || emails == -1;
} 