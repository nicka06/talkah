class UserModel {
  final String id;
  final String email;
  final String subscriptionTier;
  final String? stripeCustomerId;
  final String? pendingEmail;
  final DateTime createdAt;
  final DateTime updatedAt;

  UserModel({
    required this.id,
    required this.email,
    required this.subscriptionTier,
    this.stripeCustomerId,
    this.pendingEmail,
    required this.createdAt,
    required this.updatedAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'],
      email: json['email'],
      subscriptionTier: json['subscription_tier'] ?? 'free',
      stripeCustomerId: json['stripe_customer_id'],
      pendingEmail: json['pending_email'],
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'subscription_tier': subscriptionTier,
      'stripe_customer_id': stripeCustomerId,
      'pending_email': pendingEmail,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  UserModel copyWith({
    String? id,
    String? email,
    String? subscriptionTier,
    String? stripeCustomerId,
    String? pendingEmail,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return UserModel(
      id: id ?? this.id,
      email: email ?? this.email,
      subscriptionTier: subscriptionTier ?? this.subscriptionTier,
      stripeCustomerId: stripeCustomerId ?? this.stripeCustomerId,
      pendingEmail: pendingEmail ?? this.pendingEmail,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  // Helper getter to check if email verification is pending
  bool get hasEmailVerificationPending => pendingEmail != null;
} 