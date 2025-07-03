# Web Payment Implementation Checklist

## **Step-by-Step Implementation Tasks**

### **STEP 1: Comment Out Stripe Import (5 minutes)**
- [x] Comment out `flutter_stripe` import in `lib/screens/subscription/payment_screen.dart`
- [x] Add import for `web_payment_service.dart`

### **STEP 2: Create Web Payment Service (30 minutes)**
- [x] Create file `lib/services/web_payment_service.dart`
- [x] Add imports for `url_launcher`, `supabase_flutter`, `dart:developer`
- [x] Create `WebPaymentService` class
- [x] Add `openStripeCheckout()` method for upgrades
- [x] Add `openStripeCustomerPortal()` method for downgrades/cancels
- [x] Add `hasActiveSubscription()` method
- [x] Add pricing helper methods (`getPricing()`, `getYearlySavings()`, etc.)
- [x] Add comprehensive documentation

### **STEP 3: Comment Out Stripe UI Components (15 minutes)**
- [x] Comment out `PlatformPayButton` in payment screen
- [x] Comment out `PlatformButtonType` references
- [x] Comment out any other Stripe UI components causing linter errors
- [x] Verify no linter errors remain

### **STEP 4: Replace Payment Processing Method (30 minutes)**
- [x] Find `_processPayment()` method in `lib/screens/subscription/payment_screen.dart`
- [x] Comment out existing Stripe payment logic
- [x] Replace with `WebPaymentService.openStripeCheckout()` call
- [x] Add proper error handling
- [x] Add loading state management
- [x] Test that method compiles without errors

### **STEP 5: Update Subscription Screen for Downgrades/Cancels (30 minutes)**
- [x] Find subscription management buttons in `lib/screens/subscription/subscription_screen.dart`
- [x] Replace downgrade logic with `WebPaymentService.openStripeCustomerPortal()`
- [x] Replace cancel logic with `WebPaymentService.openStripeCustomerPortal()`
- [x] Add proper error handling for portal access

### **STEP 6: Add Pull-to-Refresh to Subscription Screen (20 minutes)**
- [x] Wrap subscription screen content with `RefreshIndicator`
- [x] Add `_onRefresh()` method that calls subscription status refresh
- [x] Test pull-to-refresh functionality
- [x] Verify subscription status updates after refresh

### **STEP 7: Update Supabase Functions (30 minutes)**
- [x] Check `create-stripe-subscription` function returns proper URLs
- [x] Check `create-customer-portal-session` function works correctly
- [x] Test both functions return valid Stripe URLs
- [x] Verify functions handle mobile platform parameter

### **STEP 8: Test Web Payment Flow (45 minutes)**
- [ ] Test upgrade flow on iOS simulator
- [ ] Test upgrade flow on Android emulator
- [ ] Test downgrade flow (Customer Portal)
- [ ] Test cancel flow (Customer Portal)
- [ ] Verify URLs open in browser correctly
- [ ] Test return to app after payment

### **STEP 9: Test Subscription Status Sync (20 minutes)**
- [ ] Test pull-to-refresh after successful payment
- [ ] Verify subscription status updates correctly
- [ ] Test subscription status after cancellation
- [ ] Verify database reflects correct subscription state

### **STEP 10: Clean Up Stripe Dependencies (15 minutes)**
- [ ] Remove `flutter_stripe` from `pubspec.yaml` (optional)
- [ ] Remove Stripe initialization from `main.dart` (optional)
- [ ] Clean up any unused Stripe imports
- [ ] Run `flutter pub get` to update dependencies

### **STEP 11: Final Testing (30 minutes)**
- [ ] Test complete payment flow on real iOS device
- [ ] Test complete payment flow on real Android device
- [ ] Test error scenarios (network issues, cancelled payments)
- [ ] Verify no crashes or errors in app
- [ ] Test subscription status persistence

### **STEP 12: Documentation (15 minutes)**
- [ ] Update code comments explaining web payment approach
- [ ] Document any new methods added
- [ ] Update README if needed
- [ ] Note any configuration changes required

---

## **Files to Modify**

### **Flutter Files:**
- [ ] `lib/screens/subscription/payment_screen.dart` - Replace payment logic
- [ ] `lib/screens/subscription/subscription_screen.dart` - Add pull-to-refresh, update downgrade/cancel
- [ ] `lib/main.dart` - Remove Stripe initialization (optional)
- [ ] `pubspec.yaml` - Remove flutter_stripe (optional)

### **New Files:**
- [ ] `lib/services/web_payment_service.dart` - Web payment service

### **Backend Functions (Verify):**
- [ ] `supabase/functions/create-stripe-subscription/index.ts` - Returns Stripe Checkout URLs
- [ ] `supabase/functions/create-customer-portal-session/index.ts` - Returns Customer Portal URLs

---

## **Success Criteria Checklist**

### **Functionality:**
- [ ] iOS users can upgrade via Stripe Checkout
- [ ] Android users can upgrade via Stripe Checkout
- [ ] Users can downgrade via Stripe Customer Portal
- [ ] Users can cancel via Stripe Customer Portal
- [ ] Pull-to-refresh updates subscription status
- [ ] No crashes or linter errors

### **User Experience:**
- [ ] Payment buttons work as expected
- [ ] Loading states show correctly
- [ ] Error messages are clear
- [ ] Success states are handled properly
- [ ] App returns to correct state after payment

### **Technical:**
- [ ] All URLs open in external browser
- [ ] Subscription status syncs correctly
- [ ] Database updates properly
- [ ] No memory leaks or performance issues
- [ ] Code is well-documented

---

## **Notes**

- **Total Estimated Time:** 4-5 hours
- **Critical Path:** Steps 1-6 (core functionality)
- **Optional Steps:** Steps 10-12 (cleanup and documentation)
- **Testing:** Steps 8-9 and 11 (comprehensive testing)

---

## **Progress Tracking**

**Started:** ___________  
**Completed:** ___________  
**Total Time:** ___________  

**Steps Completed:** 7 / 12  
**Files Modified:** ___ / 4  
**Success Criteria Met:** ___ / 15 