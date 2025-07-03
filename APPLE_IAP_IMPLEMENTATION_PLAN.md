# Apple In-App Purchase Integration - Complete Implementation Plan

## **Current State Analysis**

### **Existing Payment Infrastructure:**
- ✅ **Stripe Integration**: Fully implemented with Platform Pay (Apple Pay/Google Pay)
- ✅ **Web Payments**: Stripe Checkout for web platform
- ✅ **Mobile Payments**: Stripe Platform Pay for iOS/Android
- ✅ **Backend**: Supabase Edge Functions for payment processing
- ✅ **Database**: Subscription tracking in users table

### **Current Dependencies:**
```yaml
# Already installed:
flutter_stripe: ^11.1.0  # Stripe Platform Pay
url_launcher: ^6.2.5     # For opening web pages
```

### **Current Payment Flow:**
1. User selects plan in Flutter app
2. `SubscriptionService.createMobileSubscriptionAndGetClientSecret()` calls Supabase function
3. `create-stripe-subscription` function creates Stripe subscription
4. `SubscriptionService.processPlatformPay()` handles Apple Pay/Google Pay
5. Payment success updates subscription status

---

## **Implementation Plan**

### **PHASE 1: App Store Connect Setup (1-2 hours)**

#### **Step 1.1: Create In-App Purchase Products**
1. **Log into App Store Connect**
   - Go to https://appstoreconnect.apple.com
   - Select your Talkah app

2. **Navigate to In-App Purchases**
   - Go to Features → In-App Purchases
   - Click "+" to create new products

3. **Create Subscription Products**
   ```
   Product ID: pro_monthly
   Type: Auto-Renewable Subscription
   Price: $8.99 USD
   Subscription Group: Pro
   
   Product ID: pro_yearly  
   Type: Auto-Renewable Subscription
   Price: $79.99 USD
   Subscription Group: Pro
   
   Product ID: premium_monthly
   Type: Auto-Renewable Subscription
   Price: $14.99 USD
   Subscription Group: Premium
   
   Product ID: premium_yearly
   Type: Auto-Renewable Subscription
   Price: $119.99 USD
   Subscription Group: Premium
   ```

4. **Configure Subscription Groups**
   - Create "Pro" group for pro_monthly and pro_yearly
   - Create "Premium" group for premium_monthly and premium_yearly
   - Set subscription duration and renewal rules

5. **Submit for Review**
   - Submit all products for App Store review
   - Review typically takes 1-3 days

#### **Step 1.2: App Store Server API Setup**
1. **Generate API Key**
   - Go to Users and Access → Keys → In-App Purchase
   - Generate new API key
   - Download .p8 file and note Key ID

2. **Configure Webhook Endpoints**
   - Set up webhook URL: `https://kfzowoyrnjajkgezxijq.supabase.co/functions/v1/apple-subscription-webhook`
   - Configure for subscription events

---

### **PHASE 2: Flutter App Integration (4-6 hours)**

#### **Step 2.1: Add Apple IAP Dependencies**
```yaml
# pubspec.yaml - Add to dependencies section:
dependencies:
  in_app_purchase: ^3.1.13
  in_app_purchase_storekit: ^0.3.6+1
```

**Run:** `flutter pub get`

#### **Step 2.2: Create Apple IAP Service**
**File:** `lib/services/apple_iap_service.dart`

```dart
import 'dart:async';
import 'dart:io';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:in_app_purchase_storekit/in_app_purchase_storekit.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:developer' as dev;

class AppleIAPService {
  static const Set<String> _productIds = {
    'pro_monthly',
    'pro_yearly', 
    'premium_monthly',
    'premium_yearly',
  };

  static final InAppPurchase _inAppPurchase = InAppPurchase.instance;
  static StreamSubscription<List<PurchaseDetails>>? _subscription;

  /// Initialize Apple IAP
  static Future<void> initialize() async {
    if (!Platform.isIOS) return;
    
    final bool available = await _inAppPurchase.isAvailable();
    if (!available) {
      dev.log('❌ Apple IAP: Store not available');
      return;
    }

    // Listen to purchase updates
    _subscription = _inAppPurchase.purchaseStream.listen(
      _onPurchaseUpdate,
      onDone: () => _subscription?.cancel(),
      onError: (error) => dev.log('❌ Apple IAP: Purchase stream error: $error'),
    );

    dev.log('✅ Apple IAP: Initialized');
  }

  /// Fetch available products
  static Future<List<ProductDetails>> getProducts() async {
    if (!Platform.isIOS) return [];
    
    try {
      final ProductDetailsResponse response = 
          await _inAppPurchase.queryProductDetails(_productIds);
      
      if (response.notFoundIDs.isNotEmpty) {
        dev.log('⚠️ Apple IAP: Products not found: ${response.notFoundIDs}');
      }
      
      dev.log('✅ Apple IAP: Found ${response.productDetails.length} products');
      return response.productDetails;
    } catch (e) {
      dev.log('❌ Apple IAP: Error fetching products: $e');
      return [];
    }
  }

  /// Purchase a subscription
  static Future<bool> purchaseSubscription(String productId) async {
    if (!Platform.isIOS) return false;
    
    try {
      final ProductDetailsResponse response = 
          await _inAppPurchase.queryProductDetails({productId});
      
      if (response.productDetails.isEmpty) {
        throw Exception('Product not found: $productId');
      }
      
      final PurchaseParam purchaseParam = 
          PurchaseParam(productDetails: response.productDetails.first);
      
      final bool success = await _inAppPurchase.buyNonConsumable(
        purchaseParam: purchaseParam,
      );
      
      dev.log('🔄 Apple IAP: Purchase initiated: $success');
      return success;
    } catch (e) {
      dev.log('❌ Apple IAP: Purchase error: $e');
      return false;
    }
  }

  /// Handle purchase updates
  static void _onPurchaseUpdate(List<PurchaseDetails> purchaseDetailsList) {
    for (final PurchaseDetails purchaseDetails in purchaseDetailsList) {
      if (purchaseDetails.status == PurchaseStatus.pending) {
        dev.log('🔄 Apple IAP: Purchase pending');
      } else if (purchaseDetails.status == PurchaseStatus.purchased ||
                 purchaseDetails.status == PurchaseStatus.restored) {
        dev.log('✅ Apple IAP: Purchase successful');
        _handleSuccessfulPurchase(purchaseDetails);
      } else if (purchaseDetails.status == PurchaseStatus.error) {
        dev.log('❌ Apple IAP: Purchase error: ${purchaseDetails.error}');
      }
      
      if (purchaseDetails.pendingCompletePurchase) {
        _inAppPurchase.completePurchase(purchaseDetails);
      }
    }
  }

  /// Handle successful purchase
  static Future<void> _handleSuccessfulPurchase(PurchaseDetails purchase) async {
    try {
      // Send receipt to backend for validation
      final success = await _validateReceipt(purchase);
      if (success) {
        dev.log('✅ Apple IAP: Receipt validated successfully');
      } else {
        dev.log('❌ Apple IAP: Receipt validation failed');
      }
    } catch (e) {
      dev.log('❌ Apple IAP: Error handling purchase: $e');
    }
  }

  /// Validate receipt with backend
  static Future<bool> _validateReceipt(PurchaseDetails purchase) async {
    try {
      final response = await Supabase.instance.client.functions.invoke(
        'validate-apple-receipt',
        body: {
          'receiptData': purchase.verificationData.serverVerificationData,
          'productId': purchase.productID,
          'transactionId': purchase.purchaseID,
        },
      );

      return response.data?['success'] == true;
    } catch (e) {
      dev.log('❌ Apple IAP: Receipt validation error: $e');
      return false;
    }
  }

  /// Restore purchases
  static Future<bool> restorePurchases() async {
    if (!Platform.isIOS) return false;
    
    try {
      await _inAppPurchase.restorePurchases();
      dev.log('✅ Apple IAP: Purchases restored');
      return true;
    } catch (e) {
      dev.log('❌ Apple IAP: Restore error: $e');
      return false;
    }
  }

  /// Dispose resources
  static void dispose() {
    _subscription?.cancel();
  }
}
```

#### **Step 2.3: Update Subscription Service**
**File:** `lib/services/subscription_service.dart`

**Add imports:**
```dart
import 'apple_iap_service.dart';
```

**Add platform detection method:**
```dart
/// Determine which payment method to use based on platform
static String getPaymentMethod() {
  if (Platform.isIOS) {
    return 'apple_iap';
  } else if (Platform.isAndroid) {
    return 'stripe';
  } else {
    return 'stripe';
  }
}
```

**Add unified subscription method:**
```dart
/// Unified subscription creation method
static Future<bool> createSubscription({
  required String email,
  required String userId,
  required String planType,
  required bool isYearly,
}) async {
  final paymentMethod = getPaymentMethod();
  
  if (paymentMethod == 'apple_iap') {
    // Use Apple IAP for iOS
    final productId = '${planType}_${isYearly ? 'yearly' : 'monthly'}';
    return await AppleIAPService.purchaseSubscription(productId);
  } else {
    // Use Stripe for other platforms
    try {
      final clientSecret = await createMobileSubscriptionAndGetClientSecret(
        email: email,
        userId: userId,
        planType: planType,
        isYearly: isYearly,
      );
      
      final amount = getPricing()['${planType}_${isYearly ? 'yearly' : 'monthly'}'] ?? 0.0;
      final planName = '${planType.toUpperCase()} ${isYearly ? 'Yearly' : 'Monthly'}';
      
      return await processPlatformPay(
        clientSecret: clientSecret,
        amount: amount,
        planName: planName,
      );
    } catch (e) {
      dev.log('❌ Stripe payment failed: $e');
      return false;
    }
  }
}
```

#### **Step 2.4: Update Payment Screen**
**File:** `lib/screens/subscription/payment_screen.dart`

**Add Apple IAP initialization:**
```dart
@override
void initState() {
  super.initState();
  _initializePayment();
}

Future<void> _initializePayment() async {
  // Initialize Apple IAP if on iOS
  if (Platform.isIOS) {
    await AppleIAPService.initialize();
  }
  
  // Check platform pay support for Stripe
  _platformPaySupported = await SubscriptionService.isPlatformPaySupported();
  
  // Set up pricing
  _setupPricing();
}
```

**Update payment processing:**
```dart
Future<void> _processPayment() async {
  if (_isProcessing || _amount == null) return;

  setState(() {
    _isProcessing = true;
  });

  try {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      throw Exception('User not authenticated');
    }

    // Use unified subscription method
    final success = await SubscriptionService.createSubscription(
      email: user.email ?? '',
      userId: user.id,
      planType: widget.planType,
      isYearly: widget.isYearly,
    );

    if (mounted) {
      if (success) {
        await SubscriptionService().getSubscriptionStatus();
        _showSuccessDialog();
      }
    }
  } catch (e) {
    if (mounted) {
      _showErrorDialog('Payment failed: ${e.toString()}');
    }
  } finally {
    if (mounted) {
      setState(() {
        _isProcessing = false;
      });
    }
  }
}
```

#### **Step 2.5: Update Main App**
**File:** `lib/main.dart`

**Add Apple IAP initialization:**
```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Supabase
  await Supabase.initialize(/* your config */);
  
  // Initialize Stripe
  await SubscriptionService.initStripe();
  
  // Initialize Apple IAP
  await AppleIAPService.initialize();
  
  runApp(const MyApp());
}
```

---

### **PHASE 3: Backend Integration (3-4 hours)**

#### **Step 3.1: Create Apple Receipt Validation Function**
**File:** `supabase/functions/validate-apple-receipt/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { receiptData, productId, transactionId } = await req.json()
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Validate receipt with Apple
    const validationResult = await validateAppleReceipt(receiptData)
    
    if (validationResult.valid) {
      // Update user subscription in database
      await updateUserSubscription(supabase, validationResult, productId, transactionId)
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    } else {
      return new Response(JSON.stringify({ success: false, error: 'Invalid receipt' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})

async function validateAppleReceipt(receiptData: string) {
  // Use App Store Server API to validate receipt
  const response = await fetch('https://api.storekit.itunes.apple.com/inApps/v1/lookup/order/lookup', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${await getAppStoreToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderId: receiptData,
    }),
  })
  
  const result = await response.json()
  return {
    valid: result.status === 0,
    data: result,
  }
}

async function getAppStoreToken() {
  // Implement JWT token generation for App Store Server API
  // This requires your App Store Connect API key
  // Implementation details: https://developer.apple.com/documentation/appstoreserverapi/generating_tokens_for_api_requests
}

async function updateUserSubscription(supabase: any, validationResult: any, productId: string, transactionId: string) {
  // Extract subscription data from validation result
  const subscriptionData = validationResult.data.signedPayload
  
  // Update user subscription in database
  await supabase
    .from('users')
    .update({
      subscription_plan_id: getPlanIdFromProductId(productId),
      subscription_status: 'active',
      apple_subscription_id: transactionId,
      payment_provider: 'apple_iap',
      billing_cycle_start: new Date().toISOString(),
      billing_cycle_end: calculateBillingCycleEnd(productId),
    })
    .eq('id', subscriptionData.accountToken)
}
```

#### **Step 3.2: Create Apple Subscription Webhook**
**File:** `supabase/functions/apple-subscription-webhook/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    
    // Verify webhook signature from Apple
    const isValid = await verifyWebhookSignature(req, payload)
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }
    
    // Handle different event types
    await handleSubscriptionEvent(payload)
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})

async function handleSubscriptionEvent(payload: any) {
  const eventType = payload.notificationType
  
  switch (eventType) {
    case 'SUBSCRIBED':
      await handleSubscriptionRenewed(payload)
      break
    case 'DID_FAIL_TO_RENEW':
      await handleSubscriptionFailed(payload)
      break
    case 'EXPIRED':
      await handleSubscriptionExpired(payload)
      break
    case 'REFUND':
      await handleSubscriptionRefunded(payload)
      break
  }
}

async function handleSubscriptionRenewed(payload: any) {
  // Update subscription status to active
  // Implementation details...
}

async function handleSubscriptionFailed(payload: any) {
  // Update subscription status to past_due
  // Implementation details...
}

async function handleSubscriptionExpired(payload: any) {
  // Update subscription status to canceled
  // Implementation details...
}

async function handleSubscriptionRefunded(payload: any) {
  // Handle refund and update subscription
  // Implementation details...
}
```

#### **Step 3.3: Update Subscription Status Function**
**File:** `supabase/functions/get-subscription-status/index.ts`

**Add Apple IAP status checking:**
```typescript
// Add to existing function
async function getAppleSubscriptionStatus(userId: string) {
  // Query Apple subscription status using App Store Server API
  // Return subscription details
}
```

---

### **PHASE 4: Database Updates (1 hour)**

#### **Step 4.1: Add Apple IAP Fields**
```sql
-- Add to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_subscription_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_original_transaction_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'stripe';

-- Create Apple subscription events table
CREATE TABLE IF NOT EXISTS apple_subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  original_transaction_id TEXT,
  subscription_id TEXT,
  event_type TEXT,
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_apple_subscription_events_user_id ON apple_subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_apple_subscription_events_transaction_id ON apple_subscription_events(original_transaction_id);
```

---

### **PHASE 5: Testing & Validation (2-3 hours)**

#### **Step 5.1: Sandbox Testing**
1. **Create Sandbox Test Accounts**
   - Go to App Store Connect → Users and Access → Sandbox Testers
   - Create test accounts for different scenarios

2. **Test Product Fetching**
   ```dart
   // Test in Flutter app
   final products = await AppleIAPService.getProducts();
   print('Found products: ${products.length}');
   ```

3. **Test Purchase Flow**
   - Use sandbox account to make test purchases
   - Verify receipt validation works
   - Check database updates

4. **Test Subscription Events**
   - Test renewal, expiration, refund scenarios
   - Verify webhook handling

#### **Step 5.2: Integration Testing**
1. **Platform Detection**
   - Test on iOS simulator and device
   - Verify Apple IAP is used on iOS
   - Verify Stripe is used on Android/web

2. **Subscription Status Sync**
   - Verify subscription status is consistent
   - Test upgrades/downgrades
   - Test cancellations

#### **Step 5.3: Error Handling**
1. **Network Failures**
   - Test with poor network conditions
   - Verify graceful error handling

2. **Invalid Receipts**
   - Test with tampered receipt data
   - Verify validation fails appropriately

---

### **PHASE 6: Production Deployment (1 hour)**

#### **Step 6.1: App Store Submission**
1. **Update App Store Connect**
   - Ensure all IAP products are approved
   - Configure production webhook endpoints

2. **Submit App Update**
   - Include Apple IAP integration
   - Test with real App Store accounts

#### **Step 6.2: Production Monitoring**
1. **Set Up Error Tracking**
   - Monitor Apple IAP errors
   - Track subscription sync success rates

2. **Performance Monitoring**
   - Monitor receipt validation performance
   - Track webhook processing times

---

### **PHASE 7: Maintenance & Optimization (Ongoing)**

#### **Step 7.1: Regular Tasks**
- Monitor App Store Server API changes
- Update receipt validation logic as needed
- Handle Apple policy updates

#### **Step 7.2: Analytics & Reporting**
- Track conversion rates by platform
- Monitor subscription retention
- Analyze payment method preferences

---

## **File Summary**

### **New Files to Create:**
1. `lib/services/apple_iap_service.dart` - Apple IAP service
2. `supabase/functions/validate-apple-receipt/index.ts` - Receipt validation
3. `supabase/functions/apple-subscription-webhook/index.ts` - Webhook handler
4. `APPLE_IAP_IMPLEMENTATION_PLAN.md` - This plan

### **Files to Modify:**
1. `pubspec.yaml` - Add Apple IAP dependencies
2. `lib/services/subscription_service.dart` - Add platform detection
3. `lib/screens/subscription/payment_screen.dart` - Update payment flow
4. `lib/main.dart` - Initialize Apple IAP
5. `supabase/functions/get-subscription-status/index.ts` - Add Apple status

### **Database Changes:**
1. Add Apple IAP fields to users table
2. Create apple_subscription_events table

---

## **Timeline Estimate**
- **Total Development Time:** 12-18 hours
- **App Store Review:** 1-3 days
- **Testing:** 2-3 hours
- **Production Deployment:** 1 hour

## **Success Criteria**
- [ ] iOS users can purchase via Apple IAP
- [ ] Web/Android users can purchase via Stripe
- [ ] Subscription status syncs correctly
- [ ] Receipt validation works reliably
- [ ] App Store compliance met
- [ ] Error handling covers edge cases

---

## **Next Steps**
1. Start with Phase 1 (App Store Connect setup)
2. Add dependencies and create Apple IAP service
3. Test with sandbox accounts
4. Deploy backend functions
5. Submit for App Store review

This plan provides a complete roadmap for implementing Apple IAP while maintaining your existing Stripe integration for other platforms. 