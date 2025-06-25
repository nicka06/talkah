import 'package:equatable/equatable.dart';
import '../../models/usage_tracking.dart';
import '../../models/subscription_status.dart';
import '../../models/pending_plan_change.dart';

/// Base class for all subscription-related states
abstract class SubscriptionState extends Equatable {
  const SubscriptionState();

  @override
  List<Object?> get props => [];
}

/// Initial state when no subscription data has been loaded
class SubscriptionInitial extends SubscriptionState {
  const SubscriptionInitial();
}

/// State when subscription data is being loaded
class SubscriptionLoading extends SubscriptionState {
  const SubscriptionLoading();
}

/// State when subscription data has been successfully loaded
class SubscriptionLoaded extends SubscriptionState {
  final UsageTracking? usage;
  final SubscriptionStatus subscriptionStatus;

  const SubscriptionLoaded({
    this.usage,
    required this.subscriptionStatus,
  });

  @override
  List<Object?> get props => [usage, subscriptionStatus];

  // Helper getters that delegate to SubscriptionStatus for backward compatibility
  String get currentPlanId => subscriptionStatus.planId;
  String get billingInterval => subscriptionStatus.billingInterval;
  String get subscriptionStatusString => subscriptionStatus.status;
  DateTime? get billingCycleStart => subscriptionStatus.billingCycleStart;
  DateTime? get billingCycleEnd => subscriptionStatus.billingCycleEnd;
  String? get stripeCustomerId => subscriptionStatus.stripeCustomerId;
  PendingPlanChange? get pendingPlanChange => subscriptionStatus.pendingChange;

  /// Helper getter to check if user has a pending plan change
  bool get hasPendingChange => subscriptionStatus.hasPendingChange;

  /// Helper getter to get the target plan ID from pending change
  String? get pendingTargetPlanId => subscriptionStatus.pendingChange?.targetPlanId;

  /// Helper getter to get the effective date from pending change
  DateTime? get pendingEffectiveDate => subscriptionStatus.pendingChange?.effectiveDate;

  /// Helper getter to get the change type from pending change
  String? get pendingChangeType => subscriptionStatus.pendingChange?.changeType;

  /// Helper getter to check if billing interval is yearly
  bool get isYearly => subscriptionStatus.isYearly;

  /// Helper getter to check if subscription is active
  bool get isActive => subscriptionStatus.isActive;

  /// Helper getter to check if subscription is past due
  bool get isPastDue => subscriptionStatus.isPastDue;

  /// Helper getter to check if subscription is canceled
  bool get isCanceled => subscriptionStatus.isCanceled;

  SubscriptionLoaded copyWith({
    UsageTracking? usage,
    SubscriptionStatus? subscriptionStatus,
  }) {
    return SubscriptionLoaded(
      usage: usage ?? this.usage,
      subscriptionStatus: subscriptionStatus ?? this.subscriptionStatus,
    );
  }
}

/// State when subscription is being updated (plan change, billing switch, etc.)
class SubscriptionUpdating extends SubscriptionState {
  final String? updatingMessage;

  const SubscriptionUpdating({this.updatingMessage});

  @override
  List<Object?> get props => [updatingMessage];
}

/// State when an error occurs during subscription operations
class SubscriptionError extends SubscriptionState {
  final String message;
  final String? details;

  const SubscriptionError({
    required this.message,
    this.details,
  });

  @override
  List<Object?> get props => [message, details];
} 