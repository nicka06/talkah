import 'package:equatable/equatable.dart';

class SubscriptionPlan extends Equatable {
  final String id;
  final String name;
  final String description;
  final String? stripePriceIdMonthly;
  final String? stripePriceIdYearly;
  final int phoneCallsLimit;  // -1 = unlimited
  final int textChainsLimit;  // -1 = unlimited
  final int emailsLimit;      // -1 = unlimited
  final double priceMonthly;
  final double priceYearly;
  final List<String> features;
  final bool isActive;
  final int sortOrder;
  final DateTime createdAt;
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

  // Helper getters
  bool get isFree => id == 'free';
  bool get isPro => id == 'pro';
  bool get isPremium => id == 'premium';
  
  bool get hasUnlimitedPhoneCalls => phoneCallsLimit == -1;
  bool get hasUnlimitedTextChains => textChainsLimit == -1;
  bool get hasUnlimitedEmails => emailsLimit == -1;

  String get displayPhoneCallsLimit => hasUnlimitedPhoneCalls ? 'Unlimited' : '$phoneCallsLimit';
  String get displayTextChainsLimit => hasUnlimitedTextChains ? 'Unlimited' : '$textChainsLimit';
  String get displayEmailsLimit => hasUnlimitedEmails ? 'Unlimited' : '$emailsLimit';

  // Pricing helpers
  double get yearlyMonthlySavings => (priceMonthly * 12) - priceYearly;
  int get yearlyMonthlySavingsPercent => 
    priceMonthly > 0 ? ((yearlyMonthlySavings / (priceMonthly * 12)) * 100).round() : 0;

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