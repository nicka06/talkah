/// SubscriptionPlan - Defines available subscription plans and their features
/// 
/// This model represents the configuration of subscription plans including:
/// - Plan details (name, description, pricing)
/// - Usage limits for each feature type
/// - Stripe price IDs for payment processing
/// - Feature lists and plan status
/// 
/// USAGE: Used extensively throughout the app in:
/// - subscription_bloc.dart: Plan management and selection
/// - subscription_screen.dart: Display available plans
/// - payment_screen.dart: Plan selection and pricing
/// - subscription_service.dart: Stripe integration
/// - api_service.dart: Plan data operations
/// 
/// This model is CRITICAL for the subscription system as it defines
/// what plans are available and their associated limits and pricing.
import 'package:equatable/equatable.dart';

/// Represents a subscription plan with all its features and pricing
class SubscriptionPlan extends Equatable {
  /// Unique plan identifier (free, pro, premium)
  final String id;
  
  /// Human-readable plan name
  final String name;
  
  /// Plan description for UI display
  final String description;
  
  /// Stripe price ID for monthly billing
  final String? stripePriceIdMonthly;
  
  /// Stripe price ID for yearly billing
  final String? stripePriceIdYearly;
  
  /// Maximum phone calls allowed (-1 = unlimited)
  final int phoneCallsLimit;
  
  /// Maximum text conversations allowed (-1 = unlimited)
  final int textChainsLimit;
  
  /// Maximum emails allowed (-1 = unlimited)
  final int emailsLimit;
  
  /// Monthly subscription price
  final double priceMonthly;
  
  /// Yearly subscription price
  final double priceYearly;
  
  /// List of features included in this plan
  final List<String> features;
  
  /// Whether this plan is currently available for purchase
  final bool isActive;
  
  /// Sort order for display in UI
  final int sortOrder;
  
  /// Plan creation timestamp
  final DateTime createdAt;
  
  /// Last plan update timestamp
  final DateTime updatedAt;

  const SubscriptionPlan({
    required this.id,
    required this.name,
    required this.description,
    this.stripePriceIdMonthly,
    this.stripePriceIdYearly,
    required this.phoneCallsLimit,
    required this.textChainsLimit,
    required this.emailsLimit,
    required this.priceMonthly,
    required this.priceYearly,
    required this.features,
    required this.isActive,
    required this.sortOrder,
    required this.createdAt,
    required this.updatedAt,
  });

  // Helper getters for plan identification
  bool get isFree => id == 'free';
  bool get isPro => id == 'pro';
  bool get isPremium => id == 'premium';
  
  /// Helper getters to check if features are unlimited
  bool get hasUnlimitedPhoneCalls => phoneCallsLimit == -1;
  bool get hasUnlimitedTextChains => textChainsLimit == -1;
  bool get hasUnlimitedEmails => emailsLimit == -1;

  /// Helper getters for display formatting
  String get displayPhoneCallsLimit => hasUnlimitedPhoneCalls ? 'Unlimited' : '$phoneCallsLimit';
  String get displayTextChainsLimit => hasUnlimitedTextChains ? 'Unlimited' : '$textChainsLimit';
  String get displayEmailsLimit => hasUnlimitedEmails ? 'Unlimited' : '$emailsLimit';

  /// Pricing helpers for yearly savings calculations
  double get yearlyMonthlySavings => (priceMonthly * 12) - priceYearly;
  int get yearlyMonthlySavingsPercent => 
    priceMonthly > 0 ? ((yearlyMonthlySavings / (priceMonthly * 12)) * 100).round() : 0;

  /// Create SubscriptionPlan from JSON data
  /// Expects data from the subscription_plans table
  factory SubscriptionPlan.fromJson(Map<String, dynamic> json) {
    return SubscriptionPlan(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String? ?? '',
      stripePriceIdMonthly: json['stripe_price_id_monthly'] as String?,
      stripePriceIdYearly: json['stripe_price_id_yearly'] as String?,
      phoneCallsLimit: json['phone_calls_limit'] as int,
      textChainsLimit: json['text_chains_limit'] as int,
      emailsLimit: json['emails_limit'] as int,
      priceMonthly: (json['price_monthly'] as num).toDouble(),
      priceYearly: (json['price_yearly'] as num).toDouble(),
      features: (json['features'] as List<dynamic>?)
          ?.map((e) => e.toString())
          .toList() ?? [],
      isActive: json['is_active'] as bool? ?? true,
      sortOrder: json['sort_order'] as int? ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  /// Convert to JSON for storage
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'stripe_price_id_monthly': stripePriceIdMonthly,
      'stripe_price_id_yearly': stripePriceIdYearly,
      'phone_calls_limit': phoneCallsLimit,
      'text_chains_limit': textChainsLimit,
      'emails_limit': emailsLimit,
      'price_monthly': priceMonthly,
      'price_yearly': priceYearly,
      'features': features,
      'is_active': isActive,
      'sort_order': sortOrder,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  @override
  List<Object?> get props => [
    id,
    name,
    description,
    stripePriceIdMonthly,
    stripePriceIdYearly,
    phoneCallsLimit,
    textChainsLimit,
    emailsLimit,
    priceMonthly,
    priceYearly,
    features,
    isActive,
    sortOrder,
    createdAt,
    updatedAt,
  ];
} 