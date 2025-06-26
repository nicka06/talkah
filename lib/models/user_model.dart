/// UserModel - Core user profile and account information
/// 
/// This model represents the essential user data including:
/// - Basic profile information (ID, email)
/// - Subscription tier and Stripe integration
/// - Email verification status
/// - Account timestamps
/// 
/// USAGE: Used extensively throughout the app in:
/// - auth_bloc.dart: User authentication and profile management
/// - account_info_screen.dart: Display and edit user profile
/// - api_service.dart: User data operations and updates
/// - subscription_bloc.dart: Subscription tier information
/// - dashboard_screen.dart: User information display
/// 
/// This is a CORE model that represents the user's identity and basic
/// account information throughout the application.
class UserModel {
  /// Unique user identifier from Supabase Auth
  final String id;
  
  /// User's email address (primary contact method)
  final String email;
  
  /// Current subscription tier (free, pro, premium)
  final String subscriptionTier;
  
  /// Stripe customer ID for payment processing
  final String? stripeCustomerId;
  
  /// Pending email for verification (if email change requested)
  final String? pendingEmail;
  
  /// Account creation timestamp
  final DateTime createdAt;
  
  /// Last account update timestamp
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

  /// Create UserModel from JSON data
  /// Expects data from the users table in Supabase
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

  /// Convert to JSON for storage
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

  /// Create a copy with updated fields
  /// Useful for immutable updates in BLoC state management
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

  /// Helper getter to check if email verification is pending
  /// Used to determine if user needs to verify email change
  bool get hasEmailVerificationPending => pendingEmail != null;
} 