import 'package:equatable/equatable.dart';

/// Base class for all subscription-related events
abstract class SubscriptionEvent extends Equatable {
  const SubscriptionEvent();

  @override
  List<Object?> get props => [];
}

/// Event to load subscription data (current plan, usage, billing interval, pending changes)
class LoadSubscriptionData extends SubscriptionEvent {
  const LoadSubscriptionData();
}

/// Event to update subscription plan (upgrade, downgrade, or billing interval switch)
class UpdateSubscriptionPlan extends SubscriptionEvent {
  final String planId;
  final bool isYearly;
  final String changeType; // 'upgrade', 'downgrade', 'switch'

  const UpdateSubscriptionPlan({
    required this.planId,
    required this.isYearly,
    required this.changeType,
  });

  @override
  List<Object?> get props => [planId, isYearly, changeType];
}

/// Event to switch billing interval (monthly to yearly or vice versa)
class SwitchBillingInterval extends SubscriptionEvent {
  final bool isYearly;

  const SwitchBillingInterval({required this.isYearly});

  @override
  List<Object?> get props => [isYearly];
}

/// Event to cancel subscription
class CancelSubscription extends SubscriptionEvent {
  const CancelSubscription();
}

/// Event to refresh subscription data (after returning from customer portal)
class RefreshSubscriptionData extends SubscriptionEvent {
  const RefreshSubscriptionData();
} 