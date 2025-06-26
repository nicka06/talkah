import 'dart:async';
import 'dart:developer' as dev;
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/subscription_service.dart';
import '../../models/usage_tracking.dart';
import '../../models/subscription_status.dart';
import 'subscription_event.dart';
import 'subscription_state.dart';

/// Business Logic Component for subscription management
/// Handles loading subscription data, plan changes, billing switches, and customer portal access
class SubscriptionBloc extends Bloc<SubscriptionEvent, SubscriptionState> {
  final SubscriptionService _subscriptionService = SubscriptionService();
  StreamSubscription<AuthState>? _authStateSubscription;

  SubscriptionBloc() : super(const SubscriptionInitial()) {
    // Register event handlers
    on<LoadSubscriptionData>(_onLoadSubscriptionData);
    on<UpdateSubscriptionPlan>(_onUpdateSubscriptionPlan);
    on<SwitchBillingInterval>(_onSwitchBillingInterval);
    on<CancelSubscription>(_onCancelSubscription);
    on<RefreshSubscriptionData>(_onRefreshSubscriptionData);
    on<DowngradeToFreeRequested>(_onDowngradeToFreeRequested);

    // Listen to auth state changes to reload subscription data when user changes
    _authStateSubscription = Supabase.instance.client.auth.onAuthStateChange.listen((data) {
      if (data.session != null) {
        // User is authenticated, load subscription data
        add(const LoadSubscriptionData());
      } else {
        // User is not authenticated, reset to initial state
        add(const LoadSubscriptionData()); // This will handle the reset in the event handler
      }
    });
  }

  /// Load comprehensive subscription data for the current user
  Future<void> _onLoadSubscriptionData(
    LoadSubscriptionData event,
    Emitter<SubscriptionState> emit,
  ) async {
    dev.log('🔄 SubscriptionBloc: Loading subscription data...');
    emit(const SubscriptionLoading());

    try {
      // Get current user
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) {
        emit(const SubscriptionError(message: 'User not authenticated'));
        return;
      }

      // Load all subscription data in parallel
      final results = await Future.wait([
        _subscriptionService.getCurrentUsage(),
        _subscriptionService.getCurrentPlanId(),
        _subscriptionService.getCurrentBillingInterval(),
        _subscriptionService.getSubscriptionStatus(),
        _subscriptionService.getPendingPlanChange(),
      ]);

      final usage = results[0] as UsageTracking?;
      final currentPlanId = results[1] as String? ?? 'free';
      final billingInterval = results[2] as String? ?? 'monthly';
      final subscriptionStatusData = results[3] as Map<String, dynamic>?;
      final pendingPlanChangeData = results[4] as Map<String, dynamic>?;

      // Create SubscriptionStatus object from the raw data
      final subscriptionStatus = SubscriptionStatus.fromJson({
        'subscription_plan_id': currentPlanId,
        'subscription_status': subscriptionStatusData?['subscription_status'] ?? 'active',
        'billing_cycle_start': subscriptionStatusData?['billing_cycle_start'],
        'billing_cycle_end': subscriptionStatusData?['billing_cycle_end'],
        'billing_interval': billingInterval,
        'stripe_customer_id': subscriptionStatusData?['stripe_customer_id'],
        // Include pending plan change data if it exists
        if (pendingPlanChangeData != null) ...pendingPlanChangeData,
      });

      dev.log('✅ SubscriptionBloc: Subscription data loaded successfully');
      dev.log('   Plan: ${subscriptionStatus.planId}, Billing: ${subscriptionStatus.billingInterval}, Status: ${subscriptionStatus.status}');

      emit(SubscriptionLoaded(
        usage: usage,
        subscriptionStatus: subscriptionStatus,
      ));

    } catch (e) {
      dev.log('❌ SubscriptionBloc: Error loading subscription data: $e');
      emit(SubscriptionError(
        message: 'Failed to load subscription data',
        details: e.toString(),
      ));
    }
  }

  /// Handle downgrade to the 'Free' plan
  Future<void> _onDowngradeToFreeRequested(
    DowngradeToFreeRequested event,
    Emitter<SubscriptionState> emit,
  ) async {
    dev.log('🔄 SubscriptionBloc: Downgrading subscription to Free...');

    emit(SubscriptionUpdating(
      updatingMessage: 'Downgrading to Free plan...',
    ));

    try {
      // Call the update-subscription-plan Edge Function to cancel at period end
      final response = await Supabase.instance.client.functions.invoke(
        'update-subscription-plan',
        body: {
          'planId': 'free',
          'isYearly': false,
          'changeType': 'downgrade',
        },
      );

      if (response.data?['success'] == true) {
        dev.log('✅ SubscriptionBloc: Subscription downgrade to free successful');
        
        // Reload subscription data to get updated information
        add(const LoadSubscriptionData());
      } else {
        dev.log('❌ SubscriptionBloc: Failed to downgrade subscription');
        emit(SubscriptionError(
          message: 'Failed to downgrade to Free plan',
          details: response.data?['error'] ?? 'Unknown error',
        ));
      }

    } catch (e) {
      dev.log('❌ SubscriptionBloc: Error downgrading subscription: $e');
      emit(SubscriptionError(
        message: 'Failed to downgrade to Free plan',
        details: e.toString(),
      ));
    }
  }

  /// Update subscription plan (upgrade, downgrade, or billing switch)
  Future<void> _onUpdateSubscriptionPlan(
    UpdateSubscriptionPlan event,
    Emitter<SubscriptionState> emit,
  ) async {
    dev.log('🔄 SubscriptionBloc: Updating subscription plan...');
    dev.log('   Plan: ${event.planId}, Yearly: ${event.isYearly}, Type: ${event.changeType}');

    emit(SubscriptionUpdating(
      updatingMessage: 'Updating your subscription...',
    ));

    try {
      // Call the update-subscription-plan Edge Function
      final response = await Supabase.instance.client.functions.invoke(
        'update-subscription-plan',
        body: {
          'planId': event.planId,
          'isYearly': event.isYearly,
          'changeType': event.changeType,
        },
      );

      if (response.data?['success'] == true) {
        dev.log('✅ SubscriptionBloc: Subscription updated successfully');
        
        // Reload subscription data to get updated information
        add(const LoadSubscriptionData());
      } else {
        dev.log('❌ SubscriptionBloc: Failed to update subscription');
        emit(SubscriptionError(
          message: 'Failed to update subscription',
          details: response.data?['error'] ?? 'Unknown error',
        ));
      }

    } catch (e) {
      dev.log('❌ SubscriptionBloc: Error updating subscription: $e');
      emit(SubscriptionError(
        message: 'Failed to update subscription',
        details: e.toString(),
      ));
    }
  }

  /// Switch billing interval (monthly to yearly or vice versa)
  Future<void> _onSwitchBillingInterval(
    SwitchBillingInterval event,
    Emitter<SubscriptionState> emit,
  ) async {
    dev.log('🔄 SubscriptionBloc: Switching billing interval...');
    dev.log('   To yearly: ${event.isYearly}');

    // Get current state
    final currentState = state;
    if (currentState is! SubscriptionLoaded) {
      emit(const SubscriptionError(message: 'Subscription data not loaded'));
      return;
    }

    // Determine the new plan ID (same plan, different billing)
    final newPlanId = currentState.currentPlanId;

    // Update the subscription with the new billing interval
    add(UpdateSubscriptionPlan(
      planId: newPlanId,
      isYearly: event.isYearly,
      changeType: 'switch',
    ));
  }

  /// Cancel subscription (redirects to customer portal)
  Future<void> _onCancelSubscription(
    CancelSubscription event,
    Emitter<SubscriptionState> emit,
  ) async {
    dev.log('🔄 SubscriptionBloc: Canceling subscription...');

    try {
      // Create customer portal session for cancellation
      final portalUrl = await _subscriptionService.createCustomerPortalSession();
      
      if (portalUrl != null) {
        dev.log('✅ SubscriptionBloc: Customer portal URL created');
        // The UI will handle opening the portal URL
        // We don't emit a new state here as the user will be redirected
      } else {
        dev.log('❌ SubscriptionBloc: Failed to create customer portal session');
        emit(const SubscriptionError(
          message: 'Failed to open subscription management',
        ));
      }

    } catch (e) {
      dev.log('❌ SubscriptionBloc: Error canceling subscription: $e');
      emit(SubscriptionError(
        message: 'Failed to cancel subscription',
        details: e.toString(),
      ));
    }
  }

  /// Refresh subscription data (after returning from customer portal)
  Future<void> _onRefreshSubscriptionData(
    RefreshSubscriptionData event,
    Emitter<SubscriptionState> emit,
  ) async {
    dev.log('🔄 SubscriptionBloc: Refreshing subscription data...');
    add(const LoadSubscriptionData());
  }

  @override
  Future<void> close() {
    _authStateSubscription?.cancel();
    return super.close();
  }
} 