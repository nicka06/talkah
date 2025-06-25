# Mobile Payment Management Implementation Guide

## Overview
This guide provides a detailed, step-by-step approach to implement comprehensive mobile payment management that mirrors your excellent web functionality.

## Phase 1: Foundation Setup (Week 1)

### Step 1.1: Enhanced Subscription Service
**File**: `lib/services/subscription_service.dart`

**Add these methods to SubscriptionService class:**

```dart
// Current plan detection
Future<String> getCurrentPlanId() async {
  final status = await getSubscriptionStatus();
  return status?['subscription_plan_id'] ?? 'free';
}

// Billing interval management
Future<String> getCurrentBillingInterval() async {
  final status = await getSubscriptionStatus();
  return status?['billing_interval'] ?? 'monthly';
}

// Pending plan changes
Future<Map<String, dynamic>?> getPendingPlanChange() async {
  final userId = _supabase.auth.currentUser?.id;
  if (userId == null) return null;
  
  final response = await _supabase
    .from('users')
    .select('pending_plan_id, plan_change_effective_date, plan_change_type')
    .eq('id', userId)
    .single();
    
  if (response['pending_plan_id'] == null) return null;
  
  return {
    'targetPlanId': response['pending_plan_id'],
    'effectiveDate': DateTime.parse(response['plan_change_effective_date']),
    'changeType': response['plan_change_type'],
  };
}

// Customer portal session
Future<String?> createCustomerPortalSession() async {
  try {
    final response = await _supabase.functions.invoke('create-customer-portal-session');
    return response.data?['url'];
  } catch (e) {
    dev.log('❌ Error creating portal session: $e');
    return null;
  }
}
```

### Step 1.2: New Edge Functions
**Create these files in `supabase/functions/`:**

**File**: `supabase/functions/get-subscription-status/index.ts`
```typescript
// Get comprehensive subscription status for mobile
serve(async (req) => {
  // Authentication check
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) return new Response('Unauthorized', { status: 401 });
  
  // Get user data with subscription info
  const { data: userData } = await supabase
    .from('users')
    .select(`
      subscription_plan_id,
      subscription_status,
      billing_cycle_start,
      billing_cycle_end,
      billing_interval,
      stripe_customer_id,
      pending_plan_id,
      plan_change_effective_date,
      plan_change_type
    `)
    .eq('id', user.id)
    .single();
    
  return new Response(JSON.stringify(userData), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

**File**: `supabase/functions/update-subscription-plan/index.ts`
```typescript
// Handle plan changes via Stripe API
serve(async (req) => {
  const { planId, isYearly, changeType } = await req.json();
  
  // Get user and current subscription
  const { data: { user } } = await supabase.auth.getUser(token);
  const { data: userData } = await supabase
    .from('users')
    .select('stripe_customer_id, subscription_plan_id')
    .eq('id', user.id)
    .single();
    
  // Handle different change types
  if (changeType === 'downgrade') {
    // Schedule for end of period
    await stripe.subscriptions.update(userData.stripe_subscription_id, {
      cancel_at_period_end: true
    });
  } else {
    // Immediate change
    const priceId = getPriceId(planId, isYearly);
    await stripe.subscriptions.update(userData.stripe_subscription_id, {
      items: [{ price: priceId }],
      proration_behavior: 'create_prorations'
    });
  }
  
  return new Response(JSON.stringify({ success: true }));
});
```

## Phase 2: State Management (Week 2)

### Step 2.1: Subscription BLoC
**File**: `lib/blocs/subscription/subscription_bloc.dart`

```dart
class SubscriptionBloc extends Bloc<SubscriptionEvent, SubscriptionState> {
  final SubscriptionService _subscriptionService = SubscriptionService();
  
  SubscriptionBloc() : super(SubscriptionInitial()) {
    on<LoadSubscriptionData>(_onLoadSubscriptionData);
    on<UpdateSubscriptionPlan>(_onUpdateSubscriptionPlan);
    on<SwitchBillingInterval>(_onSwitchBillingInterval);
    on<CancelSubscription>(_onCancelSubscription);
  }
  
  Future<void> _onLoadSubscriptionData(
    LoadSubscriptionData event,
    Emitter<SubscriptionState> emit,
  ) async {
    emit(SubscriptionLoading());
    
    try {
      final usage = await _subscriptionService.getCurrentUsage();
      final planId = await _subscriptionService.getCurrentPlanId();
      final billingInterval = await _subscriptionService.getCurrentBillingInterval();
      final pendingChange = await _subscriptionService.getPendingPlanChange();
      
      emit(SubscriptionLoaded(
        usage: usage,
        currentPlanId: planId,
        billingInterval: billingInterval,
        pendingPlanChange: pendingChange,
      ));
    } catch (e) {
      emit(SubscriptionError(e.toString()));
    }
  }
  
  Future<void> _onUpdateSubscriptionPlan(
    UpdateSubscriptionPlan event,
    Emitter<SubscriptionState> emit,
  ) async {
    emit(SubscriptionUpdating());
    
    try {
      // Call edge function to update subscription
      final response = await Supabase.instance.client.functions.invoke(
        'update-subscription-plan',
        body: {
          'planId': event.planId,
          'isYearly': event.isYearly,
          'changeType': event.changeType,
        },
      );
      
      if (response.data?['success'] == true) {
        add(LoadSubscriptionData());
      } else {
        emit(SubscriptionError('Failed to update subscription'));
      }
    } catch (e) {
      emit(SubscriptionError(e.toString()));
    }
  }
}
```

### Step 2.2: Subscription Events
**File**: `lib/blocs/subscription/subscription_event.dart`

```dart
abstract class SubscriptionEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class LoadSubscriptionData extends SubscriptionEvent {}

class UpdateSubscriptionPlan extends SubscriptionEvent {
  final String planId;
  final bool isYearly;
  final String changeType; // 'upgrade', 'downgrade', 'switch'
  
  UpdateSubscriptionPlan({
    required this.planId,
    required this.isYearly,
    required this.changeType,
  });
  
  @override
  List<Object?> get props => [planId, isYearly, changeType];
}

class SwitchBillingInterval extends SubscriptionEvent {
  final bool isYearly;
  
  SwitchBillingInterval({required this.isYearly});
  
  @override
  List<Object?> get props => [isYearly];
}

class CancelSubscription extends SubscriptionEvent {}
```

### Step 2.3: Subscription States
**File**: `lib/blocs/subscription/subscription_state.dart`

```dart
abstract class SubscriptionState extends Equatable {
  @override
  List<Object?> get props => [];
}

class SubscriptionInitial extends SubscriptionState {}

class SubscriptionLoading extends SubscriptionState {}

class SubscriptionLoaded extends SubscriptionState {
  final UsageTracking? usage;
  final String currentPlanId;
  final String billingInterval;
  final Map<String, dynamic>? pendingPlanChange;
  
  SubscriptionLoaded({
    this.usage,
    required this.currentPlanId,
    required this.billingInterval,
    this.pendingPlanChange,
  });
  
  @override
  List<Object?> get props => [usage, currentPlanId, billingInterval, pendingPlanChange];
}

class SubscriptionUpdating extends SubscriptionState {}

class SubscriptionError extends SubscriptionState {
  final String message;
  
  SubscriptionError(this.message);
  
  @override
  List<Object?> get props => [message];
}
```

## Phase 3: Enhanced Models (Week 2)

### Step 3.1: Extended Models
**File**: `lib/models/subscription_status.dart`

```dart
class SubscriptionStatus {
  final String planId;
  final String status;
  final DateTime? billingCycleStart;
  final DateTime? billingCycleEnd;
  final String billingInterval;
  final String? stripeCustomerId;
  final PendingPlanChange? pendingChange;
  
  SubscriptionStatus({
    required this.planId,
    required this.status,
    this.billingCycleStart,
    this.billingCycleEnd,
    required this.billingInterval,
    this.stripeCustomerId,
    this.pendingChange,
  });
  
  factory SubscriptionStatus.fromJson(Map<String, dynamic> json) {
    return SubscriptionStatus(
      planId: json['subscription_plan_id'] ?? 'free',
      status: json['subscription_status'] ?? 'active',
      billingCycleStart: json['billing_cycle_start'] != null 
        ? DateTime.parse(json['billing_cycle_start']) 
        : null,
      billingCycleEnd: json['billing_cycle_end'] != null 
        ? DateTime.parse(json['billing_cycle_end']) 
        : null,
      billingInterval: json['billing_interval'] ?? 'monthly',
      stripeCustomerId: json['stripe_customer_id'],
      pendingChange: json['pending_plan_id'] != null 
        ? PendingPlanChange.fromJson(json) 
        : null,
    );
  }
}

class PendingPlanChange {
  final String targetPlanId;
  final DateTime effectiveDate;
  final String changeType;
  
  PendingPlanChange({
    required this.targetPlanId,
    required this.effectiveDate,
    required this.changeType,
  });
  
  factory PendingPlanChange.fromJson(Map<String, dynamic> json) {
    return PendingPlanChange(
      targetPlanId: json['pending_plan_id'],
      effectiveDate: DateTime.parse(json['plan_change_effective_date']),
      changeType: json['plan_change_type'],
    );
  }
}
```

## Phase 4: UI Components (Week 3)

### Step 4.1: Current Plan Status Card
**File**: `lib/widgets/current_plan_status_card.dart`

```dart
class CurrentPlanStatusCard extends StatelessWidget {
  final SubscriptionStatus status;
  final UsageTracking? usage;
  
  const CurrentPlanStatusCard({
    super.key,
    required this.status,
    this.usage,
  });
  
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                _getPlanIcon(status.planId),
                color: _getPlanColor(status.planId),
                size: 24,
              ),
              const SizedBox(width: 12),
              Text(
                '${status.planId.toUpperCase()} PLAN',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _getStatusColor(status.status),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  status.status.toUpperCase(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (status.billingCycleStart != null && status.billingCycleEnd != null) ...[
            Text(
              'Billing Period: ${_formatDate(status.billingCycleStart!)} - ${_formatDate(status.billingCycleEnd!)}',
              style: TextStyle(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 8),
            Text(
              'Billing: ${status.billingInterval.toUpperCase()}',
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ],
          if (status.pendingChange != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.orange.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.schedule, color: Colors.orange.shade700),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Plan change to ${status.pendingChange!.targetPlanId.toUpperCase()} on ${_formatDate(status.pendingChange!.effectiveDate)}',
                      style: TextStyle(color: Colors.orange.shade700),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
  
  IconData _getPlanIcon(String planId) {
    switch (planId) {
      case 'free': return Icons.person;
      case 'pro': return Icons.star;
      case 'premium': return Icons.diamond;
      default: return Icons.person;
    }
  }
  
  Color _getPlanColor(String planId) {
    switch (planId) {
      case 'free': return Colors.grey;
      case 'pro': return Colors.blue;
      case 'premium': return Colors.purple;
      default: return Colors.grey;
    }
  }
  
  Color _getStatusColor(String status) {
    switch (status) {
      case 'active': return Colors.green;
      case 'past_due': return Colors.red;
      case 'canceled': return Colors.grey;
      default: return Colors.orange;
    }
  }
  
  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }
}
```

### Step 4.2: Plan Comparison Grid
**File**: `lib/widgets/plan_comparison_grid.dart`

```dart
class PlanComparisonGrid extends StatelessWidget {
  final List<SubscriptionPlan> plans;
  final String currentPlanId;
  final String billingInterval;
  final bool isYearly;
  final Function(String, String) onPlanAction;
  final bool isProcessing;
  
  const PlanComparisonGrid({
    super.key,
    required this.plans,
    required this.currentPlanId,
    required this.billingInterval,
    required this.isYearly,
    required this.onPlanAction,
    this.isProcessing = false,
  });
  
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Billing interval toggle
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: Colors.grey.shade200,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildToggleButton('Monthly', !isYearly),
              _buildToggleButton('Yearly', isYearly),
            ],
          ),
        ),
        const SizedBox(height: 24),
        
        // Plans grid
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: plans.length,
          itemBuilder: (context, index) {
            final plan = plans[index];
            final isCurrentPlan = plan.id == currentPlanId && 
              billingInterval == (isYearly ? 'yearly' : 'monthly');
            
            return _buildPlanCard(plan, isCurrentPlan);
          },
        ),
      ],
    );
  }
  
  Widget _buildToggleButton(String text, bool isSelected) {
    return GestureDetector(
      onTap: () {
        // Handle billing interval change
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          boxShadow: isSelected ? [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ] : null,
        ),
        child: Text(
          text,
          style: TextStyle(
            color: isSelected ? Colors.black : Colors.grey,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }
  
  Widget _buildPlanCard(SubscriptionPlan plan, bool isCurrentPlan) {
    final price = isYearly ? plan.priceYearly : plan.priceMonthly;
    final savings = isYearly ? plan.yearlyMonthlySavings : 0.0;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isCurrentPlan ? Colors.blue : Colors.grey.shade300,
          width: isCurrentPlan ? 2 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                plan.name.toUpperCase(),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (isCurrentPlan) ...[
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.blue,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    'CURRENT',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),
          Text(
            plan.description,
            style: TextStyle(color: Colors.grey.shade600),
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '\$${price.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(width: 4),
              Text(
                '/${isYearly ? 'year' : 'month'}',
                style: TextStyle(color: Colors.grey.shade600),
              ),
            ],
          ),
          if (savings > 0) ...[
            const SizedBox(height: 4),
            Text(
              'Save \$${savings.toStringAsFixed(2)} per year',
              style: const TextStyle(
                color: Colors.green,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
          const SizedBox(height: 16),
          _buildFeaturesList(plan),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: isCurrentPlan || isProcessing 
                ? null 
                : () => onPlanAction(plan.id, _getActionType(plan)),
              style: ElevatedButton.styleFrom(
                backgroundColor: _getButtonColor(plan, isCurrentPlan),
                foregroundColor: _getButtonTextColor(plan, isCurrentPlan),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: Text(
                _getButtonText(plan, isCurrentPlan),
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildFeaturesList(SubscriptionPlan plan) {
    final features = [
      '${plan.displayPhoneCallsLimit} Phone Calls',
      '${plan.displayTextChainsLimit} Text Messages',
      '${plan.displayEmailsLimit} Emails',
    ];
    
    return Column(
      children: features.map((feature) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(
          children: [
            const Icon(
              Icons.check_circle,
              color: Colors.green,
              size: 16,
            ),
            const SizedBox(width: 8),
            Text(feature),
          ],
        ),
      )).toList(),
    );
  }
  
  String _getActionType(SubscriptionPlan plan) {
    final planHierarchy = {'free': 0, 'pro': 1, 'premium': 2};
    final currentLevel = planHierarchy[currentPlanId] ?? 0;
    final planLevel = planHierarchy[plan.id] ?? 0;
    
    if (planLevel > currentLevel) return 'upgrade';
    if (planLevel < currentLevel) return 'downgrade';
    return 'switch';
  }
  
  Color _getButtonColor(SubscriptionPlan plan, bool isCurrentPlan) {
    if (isCurrentPlan) return Colors.grey.shade300;
    
    final actionType = _getActionType(plan);
    switch (actionType) {
      case 'upgrade': return Colors.blue;
      case 'downgrade': return Colors.orange;
      default: return Colors.grey;
    }
  }
  
  Color _getButtonTextColor(SubscriptionPlan plan, bool isCurrentPlan) {
    if (isCurrentPlan) return Colors.grey.shade600;
    return Colors.white;
  }
  
  String _getButtonText(SubscriptionPlan plan, bool isCurrentPlan) {
    if (isCurrentPlan) return 'CURRENT PLAN';
    
    final actionType = _getActionType(plan);
    switch (actionType) {
      case 'upgrade': return 'UPGRADE';
      case 'downgrade': return 'DOWNGRADE';
      default: return 'SWITCH';
    }
  }
}
```

## Phase 5: Plan Change Flows (Week 3-4)

### Step 5.1: Plan Change Confirmation Dialogs
**File**: `lib/widgets/plan_change_dialogs.dart`

```dart
class PlanChangeDialogs {
  static Future<bool> showUpgradeConfirmation(
    BuildContext context,
    String fromPlan,
    String toPlan,
    double price,
    bool isYearly,
  ) async {
    return await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Upgrade'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Upgrade from $fromPlan to $toPlan?'),
            const SizedBox(height: 16),
            Text(
              'You will be charged \$${price.toStringAsFixed(2)} ${isYearly ? 'annually' : 'monthly'}.',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Your new plan will be active immediately with prorated billing.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Upgrade'),
          ),
        ],
      ),
    ) ?? false;
  }
  
  static Future<bool> showDowngradeConfirmation(
    BuildContext context,
    String fromPlan,
    String toPlan,
    DateTime effectiveDate,
  ) async {
    return await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Downgrade'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Downgrade from $fromPlan to $toPlan?'),
            const SizedBox(height: 16),
            Text(
              'Your plan will change on ${DateFormat('MMM dd, yyyy').format(effectiveDate)}.',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'You\'ll keep your current plan features until then.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
            child: const Text('Downgrade'),
          ),
        ],
      ),
    ) ?? false;
  }
  
  static Future<bool> showBillingIntervalConfirmation(
    BuildContext context,
    String planName,
    bool isYearly,
    double newPrice,
    double savings,
  ) async {
    return await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Switch Billing Interval'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Switch $planName to ${isYearly ? 'yearly' : 'monthly'} billing?'),
            const SizedBox(height: 16),
            Text(
              'New price: \$${newPrice.toStringAsFixed(2)} ${isYearly ? '/year' : '/month'}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            if (savings > 0) ...[
              const SizedBox(height: 8),
              Text(
                'Save \$${savings.toStringAsFixed(2)} per year!',
                style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
              ),
            ],
            const SizedBox(height: 8),
            const Text(
              'Your billing will be adjusted immediately.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Switch'),
          ),
        ],
      ),
    ) ?? false;
  }
}
```

### Step 5.2: Payment Processing Integration
**File**: `lib/services/plan_change_service.dart`

```dart
class PlanChangeService {
  static Future<bool> processPlanChange({
    required String planId,
    required bool isYearly,
    required String changeType,
  }) async {
    try {
      // For upgrades and billing switches, process payment
      if (changeType == 'upgrade' || changeType == 'switch') {
        final user = Supabase.instance.client.auth.currentUser;
        if (user == null) throw Exception('User not authenticated');
        
        // Create payment intent
        final clientSecret = await SubscriptionService
          .createMobileSubscriptionAndGetClientSecret(
            email: user.email ?? '',
            userId: user.id,
            planType: planId,
            isYearly: isYearly,
          );
        
        // Process payment
        final pricing = SubscriptionService.getPricing();
        final key = '${planId}_${isYearly ? 'yearly' : 'monthly'}';
        final amount = pricing[key] ?? 0.0;
        final planName = '${planId.toUpperCase()} Plan';
        
        final success = await SubscriptionService.processPlatformPay(
          clientSecret: clientSecret,
          amount: amount,
          planName: planName,
        );
        
        if (!success) return false;
      }
      
      // Update subscription via edge function
      final response = await Supabase.instance.client.functions.invoke(
        'update-subscription-plan',
        body: {
          'planId': planId,
          'isYearly': isYearly,
          'changeType': changeType,
        },
      );
      
      return response.data?['success'] == true;
    } catch (e) {
      dev.log('❌ Error processing plan change: $e');
      return false;
    }
  }
}
```

## Phase 6: Customer Portal Integration (Week 4)

### Step 6.1: Deep Link Handling
**File**: `lib/services/deep_link_service.dart`

```dart
class DeepLinkService {
  static Future<void> handleCustomerPortalReturn() async {
    // Handle return from Stripe Customer Portal
    // Refresh subscription data
    // Show success/error message
  }
  
  static Future<void> openCustomerPortal() async {
    final url = await SubscriptionService().createCustomerPortalSession();
    if (url != null) {
      await launchUrl(Uri.parse(url));
    }
  }
}
```

### Step 6.2: Subscription Management Actions
**File**: `lib/widgets/subscription_management_actions.dart`

```dart
class SubscriptionManagementActions extends StatelessWidget {
  final SubscriptionStatus status;
  final VoidCallback onRefresh;
  
  const SubscriptionManagementActions({
    super.key,
    required this.status,
    required this.onRefresh,
  });
  
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ListTile(
          leading: const Icon(Icons.payment),
          title: const Text('Manage Payment Methods'),
          subtitle: const Text('Update your payment information'),
          onTap: () => DeepLinkService.openCustomerPortal(),
        ),
        ListTile(
          leading: const Icon(Icons.receipt),
          title: const Text('Billing History'),
          subtitle: const Text('View your past invoices'),
          onTap: () => DeepLinkService.openCustomerPortal(),
        ),
        if (status.status == 'active') ...[
          ListTile(
            leading: const Icon(Icons.cancel),
            title: const Text('Cancel Subscription'),
            subtitle: const Text('Cancel at the end of billing period'),
            onTap: () => _showCancelConfirmation(context),
          ),
        ],
        ListTile(
          leading: const Icon(Icons.refresh),
          title: const Text('Refresh Status'),
          subtitle: const Text('Update subscription information'),
          onTap: onRefresh,
        ),
      ],
    );
  }
  
  void _showCancelConfirmation(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Subscription'),
        content: const Text(
          'Your subscription will remain active until the end of your current billing period. You can reactivate anytime.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Keep Subscription'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              DeepLinkService.openCustomerPortal();
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Cancel Subscription'),
          ),
        ],
      ),
    );
  }
}
```

## Phase 7: Integration & Testing (Week 5)

### Step 7.1: Main Subscription Screen Update
**File**: `lib/screens/subscription/subscription_screen.dart`

**Replace the entire file with:**

```dart
class SubscriptionScreen extends StatelessWidget {
  const SubscriptionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => SubscriptionBloc()..add(LoadSubscriptionData()),
      child: const SubscriptionScreenContent(),
    );
  }
}

class SubscriptionScreenContent extends StatelessWidget {
  const SubscriptionScreenContent({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Subscription & Usage'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: BlocBuilder<SubscriptionBloc, SubscriptionState>(
        builder: (context, state) {
          if (state is SubscriptionLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          
          if (state is SubscriptionError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Error: ${state.message}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => context.read<SubscriptionBloc>()
                      .add(LoadSubscriptionData()),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }
          
          if (state is SubscriptionLoaded) {
            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // Current plan status
                  CurrentPlanStatusCard(
                    status: SubscriptionStatus(
                      planId: state.currentPlanId,
                      status: 'active', // Get from state
                      billingInterval: state.billingInterval,
                      pendingChange: state.pendingPlanChange,
                    ),
                    usage: state.usage,
                  ),
                  const SizedBox(height: 24),
                  
                  // Usage tracking
                  if (state.usage != null) ...[
                    UsageDisplayWidget(usage: state.usage!),
                    const SizedBox(height: 24),
                  ],
                  
                  // Plan comparison
                  PlanComparisonGrid(
                    plans: [], // Get from service
                    currentPlanId: state.currentPlanId,
                    billingInterval: state.billingInterval,
                    isYearly: state.billingInterval == 'yearly',
                    onPlanAction: (planId, actionType) => _handlePlanAction(
                      context, planId, actionType, state,
                    ),
                    isProcessing: false,
                  ),
                  const SizedBox(height: 24),
                  
                  // Management actions
                  SubscriptionManagementActions(
                    status: SubscriptionStatus(
                      planId: state.currentPlanId,
                      status: 'active',
                      billingInterval: state.billingInterval,
                    ),
                    onRefresh: () => context.read<SubscriptionBloc>()
                      .add(LoadSubscriptionData()),
                  ),
                ],
              ),
            );
          }
          
          return const SizedBox.shrink();
        },
      ),
    );
  }
  
  void _handlePlanAction(
    BuildContext context,
    String planId,
    String actionType,
    SubscriptionLoaded state,
  ) {
    // Handle different action types
    switch (actionType) {
      case 'upgrade':
        _handleUpgrade(context, planId, state);
        break;
      case 'downgrade':
        _handleDowngrade(context, planId, state);
        break;
      case 'switch':
        _handleBillingSwitch(context, planId, state);
        break;
    }
  }
  
  void _handleUpgrade(BuildContext context, String planId, SubscriptionLoaded state) {
    // Show upgrade confirmation and process
  }
  
  void _handleDowngrade(BuildContext context, String planId, SubscriptionLoaded state) {
    // Show downgrade confirmation and process
  }
  
  void _handleBillingSwitch(BuildContext context, String planId, SubscriptionLoaded state) {
    // Show billing switch confirmation and process
  }
}
```

### Step 7.2: Testing Checklist

**Manual Testing Steps:**

1. **Current Plan Display**
   - [ ] Shows correct current plan
   - [ ] Shows billing interval
   - [ ] Shows billing period dates
   - [ ] Shows pending plan changes

2. **Plan Comparison**
   - [ ] Displays all available plans
   - [ ] Shows correct pricing for monthly/yearly
   - [ ] Shows savings for yearly plans
   - [ ] Correct button states (current/upgrade/downgrade)

3. **Plan Changes**
   - [ ] Upgrade flow works
   - [ ] Downgrade flow works
   - [ ] Billing interval switch works
   - [ ] Payment processing works
   - [ ] Error handling works

4. **Customer Portal**
   - [ ] Opens customer portal
   - [ ] Returns to app correctly
   - [ ] Refreshes data after return

5. **State Management**
   - [ ] Real-time updates work
   - [ ] Loading states display
   - [ ] Error states handle gracefully
   - [ ] Data persists across app sessions

## Implementation Timeline

- **Week 1**: Foundation (Steps 1.1-1.2)
- **Week 2**: State Management & Models (Steps 2.1-3.1)
- **Week 3**: UI Components (Steps 4.1-4.2)
- **Week 4**: Plan Changes & Portal (Steps 5.1-6.2)
- **Week 5**: Integration & Testing (Step 7.1-7.2)

## Success Criteria

- ✅ Users can view current plan and billing status
- ✅ Users can upgrade/downgrade plans seamlessly
- ✅ Users can switch billing intervals
- ✅ Pending plan changes are clearly communicated
- ✅ Customer portal integration works smoothly
- ✅ Real-time usage tracking is accurate
- ✅ Payment flows handle all scenarios gracefully
- ✅ Error states are handled properly
- ✅ Performance is optimized for mobile

This implementation will bring mobile subscription management to full parity with your excellent web implementation while leveraging mobile-specific capabilities. 