import 'package:equatable/equatable.dart';
import 'pending_plan_change.dart';

/// Represents the user's current subscription status
/// This includes their current plan, billing information, and any pending changes
class SubscriptionStatus extends Equatable {
  final String planId;
  final String status;
  final DateTime? billingCycleStart;
  final DateTime? billingCycleEnd;
  final String billingInterval;
  final String? stripeCustomerId;
  final PendingPlanChange? pendingChange;

  const SubscriptionStatus({
    required this.planId,
    required this.status,
    this.billingCycleStart,
    this.billingCycleEnd,
    required this.billingInterval,
    this.stripeCustomerId,
    this.pendingChange,
  });

  /// Create SubscriptionStatus from JSON data
  /// Expects data from the users table fields
  factory SubscriptionStatus.fromJson(Map<String, dynamic> json) {
    return SubscriptionStatus(
      planId: json['subscription_plan_id'] ?? 'free',
      status: json['subscription_status'] ?? 'active',
      billingCycleStart: json['billing_cycle_start'] != null 
        ? DateTime.parse(json['billing_cycle_start'] as String) 
        : null,
      billingCycleEnd: json['billing_cycle_end'] != null 
        ? DateTime.parse(json['billing_cycle_end'] as String) 
        : null,
      billingInterval: json['billing_interval'] ?? 'monthly',
      stripeCustomerId: json['stripe_customer_id'] as String?,
      pendingChange: json.containsKey('pending_plan_id') && json['pending_plan_id'] != null
        ? PendingPlanChange.fromJson(json) 
        : null,
    );
  }

  /// Convert to JSON for storage
  Map<String, dynamic> toJson() {
    return {
      'subscription_plan_id': planId,
      'subscription_status': status,
      'billing_cycle_start': billingCycleStart?.toIso8601String(),
      'billing_cycle_end': billingCycleEnd?.toIso8601String(),
      'billing_interval': billingInterval,
      'stripe_customer_id': stripeCustomerId,
      if (pendingChange != null) ...pendingChange!.toJson(),
    };
  }

  /// Helper getters for plan identification
  bool get isFree => planId == 'free';
  bool get isPro => planId == 'pro';
  bool get isPremium => planId == 'premium';

  /// Helper getters for subscription status
  bool get isActive => status == 'active';
  bool get isPastDue => status == 'past_due';
  bool get isCanceled => status == 'canceled';
  bool get isTrialing => status == 'trialing';

  /// Helper getters for billing interval
  bool get isMonthly => billingInterval == 'monthly';
  bool get isYearly => billingInterval == 'yearly';

  /// Helper getters for pending changes
  bool get hasPendingChange => pendingChange != null;
  bool get hasUpgradePending => pendingChange?.isUpgrade ?? false;
  bool get hasDowngradePending => pendingChange?.isDowngrade ?? false;
  bool get hasBillingSwitchPending => pendingChange?.isBillingSwitch ?? false;

  /// Helper getter for formatted billing period
  String get formattedBillingPeriod {
    if (billingCycleStart == null || billingCycleEnd == null) {
      return 'No billing period set';
    }
    return '${billingCycleStart!.month}/${billingCycleStart!.day}/${billingCycleStart!.year} - ${billingCycleEnd!.month}/${billingCycleEnd!.day}/${billingCycleEnd!.year}';
  }

  /// Helper getter for days remaining in billing cycle
  int? get daysRemainingInCycle {
    if (billingCycleEnd == null) return null;
    final now = DateTime.now();
    return billingCycleEnd!.difference(now).inDays;
  }

  /// Helper getter for billing cycle progress (0.0 to 1.0)
  double? get billingCycleProgress {
    if (billingCycleStart == null || billingCycleEnd == null) return null;
    final now = DateTime.now();
    final totalDays = billingCycleEnd!.difference(billingCycleStart!).inDays;
    final elapsedDays = now.difference(billingCycleStart!).inDays;
    return (elapsedDays / totalDays).clamp(0.0, 1.0);
  }

  /// Helper getter for human-readable status
  String get statusDisplayName {
    switch (status) {
      case 'active':
        return 'Active';
      case 'past_due':
        return 'Past Due';
      case 'canceled':
        return 'Canceled';
      case 'trialing':
        return 'Trial';
      default:
        return status.toUpperCase();
    }
  }

  /// Helper getter for human-readable billing interval
  String get billingIntervalDisplayName {
    switch (billingInterval) {
      case 'monthly':
        return 'Monthly';
      case 'yearly':
        return 'Yearly';
      default:
        return billingInterval.toUpperCase();
    }
  }

  /// Helper getter for plan display name
  String get planDisplayName {
    switch (planId) {
      case 'free':
        return 'Free';
      case 'pro':
        return 'Pro';
      case 'premium':
        return 'Premium';
      default:
        return planId.toUpperCase();
    }
  }

  /// Create a copy with updated fields
  SubscriptionStatus copyWith({
    String? planId,
    String? status,
    DateTime? billingCycleStart,
    DateTime? billingCycleEnd,
    String? billingInterval,
    String? stripeCustomerId,
    PendingPlanChange? pendingChange,
  }) {
    return SubscriptionStatus(
      planId: planId ?? this.planId,
      status: status ?? this.status,
      billingCycleStart: billingCycleStart ?? this.billingCycleStart,
      billingCycleEnd: billingCycleEnd ?? this.billingCycleEnd,
      billingInterval: billingInterval ?? this.billingInterval,
      stripeCustomerId: stripeCustomerId ?? this.stripeCustomerId,
      pendingChange: pendingChange ?? this.pendingChange,
    );
  }

  @override
  List<Object?> get props => [
    planId,
    status,
    billingCycleStart,
    billingCycleEnd,
    billingInterval,
    stripeCustomerId,
    pendingChange,
  ];

  @override
  String toString() {
    return 'SubscriptionStatus(planId: $planId, status: $status, billingInterval: $billingInterval, hasPendingChange: $hasPendingChange)';
  }
} 