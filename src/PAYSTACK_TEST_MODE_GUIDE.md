# PayStack Test Mode Payment Guide

## 🎯 Current Issue
When using PayStack in test mode, after clicking "I have paid", the popup doesn't automatically redirect or confirm the payment.

## ✅ What We've Fixed

### 1. **Edge Function Updated** (`payments-simple`)
- ✅ Removed double kobo conversion (was 100x too high)
- ✅ Added proper callback URL with reference parameter
- ✅ Frontend amount conversion working correctly

### 2. **Payment Callback Detection**
- ✅ App.tsx detects multiple callback parameters:
  - `?reference=xxx` (PayStack)
  - `?trxref=xxx` (PayStack alternative)
  - `?tx_ref=xxx` (Flutterwave)
  - `?transaction_id=xxx` (Flutterwave)
  - `?status=xxx` (Flutterwave)

### 3. **User Instructions Added**
- ✅ Added clear test mode instructions on payment page
- ✅ Console logging for debugging

## 🧪 How PayStack Test Mode Works

### Expected Behavior:
1. User clicks "Continue to Payment"
2. PayStack opens in popup/redirect
3. User selects test card
4. User clicks "I have paid"
5. **PayStack should redirect to:** `https://your-app.com?payment-callback=true&reference=SUB_xxx`

### Current Behavior (Test Mode):
PayStack test mode sometimes **doesn't auto-redirect**. Instead:
1. Shows "Transaction Successful" message
2. Popup stays open
3. User must manually close it

## 🔧 Solutions

### Solution 1: Manual Redirect (Current Implementation)
After clicking "I have paid" and seeing success:
1. Close the PayStack popup manually
2. The app should detect the payment via URL params
3. Navigate to payment verification page

### Solution 2: Use PayStack Inline (Recommended for Production)
Instead of redirect, use PayStack's inline/popup mode with JavaScript SDK:

```typescript
// In BillingCycle.tsx - Alternative implementation
const handleConfirm = () => {
  const handler = PaystackPop.setup({
    key: 'pk_test_xxx',
    email: userEmail,
    amount: amount,
    ref: reference,
    onClose: function(){
      alert('Payment window closed');
    },
    callback: function(response){
      // Payment successful
      window.location.href = `/?payment-callback=true&reference=${response.reference}`;
    }
  });
  
  handler.openIframe();
};
```

### Solution 3: Server-Side Webhook (Best for Production)
Configure PayStack webhook in dashboard:
1. Go to PayStack Dashboard → Settings → Webhooks
2. Add URL: `https://pkzpifdocmmzowvjopup.supabase.co/functions/v1/payments-simple/webhook`
3. PayStack will POST payment events to this endpoint
4. Backend auto-updates payment status

## 📱 Current Workaround

### For Testing Now:
1. Click "Continue to Payment"
2. Select any test card in PayStack popup
3. Click "I have paid"
4. **Wait 3-5 seconds** - PayStack may auto-redirect
5. If not redirected, **manually close the popup**
6. Check browser console for payment callback logs
7. If stuck, refresh the page and check subscription status

### Debugging in Console:
```
🔄 Payment callback received: { reference: 'SUB_xxx', ... }
📦 Pending payment from storage: { reference: 'SUB_xxx', provider: 'paystack', ... }
```

## 🚀 Testing the Fix

### Step 1: Redeploy Edge Function
Go to Supabase Dashboard → Functions → `payments-simple` → Update with latest code

### Step 2: Test Payment
1. Login to ShopEasy
2. Go to Subscribe page
3. Select a plan
4. Choose billing cycle
5. Click "Continue to Payment"
6. Use PayStack test card
7. Click "I have paid"

### Step 3: Expected Result
- ✅ Redirected back to app
- ✅ Shows "Processing Payment" message
- ✅ Auto-verifies with PayStack API
- ✅ Shows success/failure message
- ✅ Subscription activated

## 🐛 If Still Not Working

### Check:
1. **Browser Console** - Any errors?
2. **Supabase Edge Function Logs** - Any 404s or errors?
3. **Network Tab** - Is `/payments-simple/paystack/initialize` returning 200?
4. **SessionStorage** - Check if `pendingPayment` is stored:
   ```javascript
   console.log(sessionStorage.getItem('pendingPayment'));
   ```

### Common Issues:
| Issue | Solution |
|-------|----------|
| 404 on `/paystack/initialize` | Edge function not deployed or wrong name |
| Double kobo (10x price) | Edge function needs update (remove `* 100`) |
| Popup doesn't close | Normal in test mode - close manually |
| No redirect after close | Check URL for `?reference=xxx` parameter |
| "Unauthorized" error | Session expired - logout and login again |

## 📝 Production Checklist

Before going live:
- [ ] Switch to PayStack live keys
- [ ] Configure webhook URL in PayStack dashboard
- [ ] Implement server-side webhook handler
- [ ] Add proper error handling
- [ ] Test with real cards (start with small amounts)
- [ ] Set up email notifications for successful payments
- [ ] Add payment history page
- [ ] Implement refund functionality

## 🔗 Resources

- [PayStack API Docs](https://paystack.com/docs/api/)
- [PayStack Test Cards](https://paystack.com/docs/payments/test-payments/)
- [PayStack Inline Documentation](https://paystack.com/docs/payments/accept-payments/#popup)
- [PayStack Webhooks](https://paystack.com/docs/payments/webhooks/)

---

**Last Updated:** December 2, 2024
**Status:** ✅ Amount calculation fixed, callback detection improved, instructions added
