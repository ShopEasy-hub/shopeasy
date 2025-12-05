/**
 * Application Configuration
 * 
 * ⚠️ IMPORTANT: Update PRODUCTION_URL before deploying to production!
 * 
 * This file controls where password reset emails redirect users.
 * In development, it uses localhost automatically.
 * In production, it uses the URL you specify below.
 */

// ================================================================
// 🔧 CONFIGURE THIS: Your production URL
// ================================================================
// 
// UPDATE THIS BEFORE DEPLOYING TO PRODUCTION!
//
// Examples:
// - Vercel: 'https://shopeasy-pos.vercel.app'
// - Netlify: 'https://shopeasy-pos.netlify.app'
// - Custom domain: 'https://pos.yourbusiness.com'
// - Custom domain: 'https://yourdomain.com'
//
// ⚠️ Important:
// - Must start with https:// (not http://)
// - No trailing slash at the end
// - Must match your deployed site exactly
//
<<<<<<< HEAD
const PRODUCTION_URL = 'https://your-production-domain.com';
=======
const PRODUCTION_URL = 'https://shopeasy-lemon.vercel.app';
>>>>>>> beff73edb9b900dd348647610707c57653a62d28
// ================================================================

// Automatically detect if we're in production or development
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';

// Use the appropriate URL based on environment
export const SITE_URL = isDevelopment ? window.location.origin : PRODUCTION_URL;

// App Configuration
export const APP_CONFIG = {
  name: 'ShopEasy',
  companyName: 'ShopEasy POS',
  supportEmail: 'support@shopeasy.com', // Update this!
  supportPhone: '+234 800 000 0000', // Update this!
  siteUrl: SITE_URL,
  
  // Password Reset Configuration
  passwordReset: {
    // Where users are redirected after clicking email link
    redirectUrl: `${SITE_URL}?reset-password=true`,
    // How long reset links are valid (Supabase default: 1 hour)
    expiryHours: 1,
  },
  
  // Email Configuration
  email: {
    fromName: 'ShopEasy Support',
    fromEmail: 'noreply@shopeasy.com', // Update this!
    replyTo: 'support@shopeasy.com', // Update this!
  },
};

// Log the configuration (helpful for debugging)
console.log('🔧 App Configuration:', {
  environment: isDevelopment ? 'Development' : 'Production',
  siteUrl: SITE_URL,
  passwordResetUrl: APP_CONFIG.passwordReset.redirectUrl,
});

// Warn if production URL not configured
if (!isDevelopment && PRODUCTION_URL === 'https://your-production-domain.com') {
  console.warn('⚠️ WARNING: Production URL not configured!');
  console.warn('📝 Please update PRODUCTION_URL in /lib/config.ts');
  console.warn('🔗 Current: ' + PRODUCTION_URL);
  console.warn('📖 See: /SETUP_PRODUCTION_URL.md for instructions');
}
