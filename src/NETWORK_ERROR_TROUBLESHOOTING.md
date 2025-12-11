# 🔧 NetworkError Troubleshooting Guide

## What is a NetworkError?

A "NetworkError when attempting to fetch resource" error occurs when your browser cannot reach the Supabase backend servers. This prevents the app from loading data, authenticating users, or performing any database operations.

## Quick Fixes (Try These First!)

### 1. ✅ Check Internet Connection
```
- Open another website to verify internet is working
- Try loading: https://supabase.com (should load)
- Check WiFi/Ethernet connection is active
```

### 2. 🔧 Disable Browser Extensions
```
Common culprits:
- Ad blockers (uBlock Origin, AdBlock Plus)
- Privacy tools (Privacy Badger, Ghostery)
- Security extensions (NoScript, ScriptSafe)
- VPN extensions

Steps:
1. Open browser extensions (chrome://extensions or about:addons)
2. Temporarily disable ALL extensions
3. Refresh the ShopEasy app
4. If it works, re-enable extensions one by one to find the culprit
```

### 3. 🕵️ Try Incognito/Private Mode
```
Chrome: Ctrl+Shift+N (Cmd+Shift+N on Mac)
Firefox: Ctrl+Shift+P (Cmd+Shift+P on Mac)
Edge: Ctrl+Shift+N
Safari: Cmd+Shift+N

This bypasses extensions and cache issues.
```

### 4. 🧹 Clear Browser Cache
```
Chrome/Edge:
1. Press Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
2. Select "All time"
3. Check "Cached images and files" and "Cookies"
4. Click "Clear data"

Firefox:
1. Press Ctrl+Shift+Delete
2. Select "Everything"
3. Check "Cookies" and "Cache"
4. Click "Clear Now"
```

### 5. 🔄 Hard Refresh
```
Windows/Linux: Ctrl + F5
Mac: Cmd + Shift + R

This forces the browser to reload everything fresh.
```

## Diagnostic Tools

### Run Built-in Diagnostics
1. Add `?diagnostic-network=true` to the URL
2. Click "Run Diagnostics"
3. Review the test results
4. Follow the suggestions provided

Example: `https://your-app-url.com/?diagnostic-network=true`

### Check Browser Console
1. Press F12 (or right-click → Inspect)
2. Click "Console" tab
3. Look for red error messages
4. Look for these specific errors:
   - `NetworkError`
   - `Failed to fetch`
   - `CORS error`
   - `ERR_BLOCKED_BY_CLIENT`
   - `ERR_CONNECTION_REFUSED`

### Check Network Tab
1. Press F12
2. Click "Network" tab
3. Refresh the page
4. Look for failed requests (red)
5. Click on failed requests to see details

## Common Causes & Solutions

### 🚫 Browser Extension Blocking

**Symptoms:**
- Console shows `ERR_BLOCKED_BY_CLIENT`
- Requests to supabase.co domains fail
- Works in incognito mode

**Solution:**
1. Disable ad blocker/privacy extensions
2. Add `*.supabase.co` to extension whitelist
3. Or use incognito mode

### 🔒 Corporate Firewall/Network

**Symptoms:**
- Works at home but not at work
- All Supabase requests timeout
- Other cloud services also blocked

**Solution:**
1. Contact IT department
2. Request whitelist for: `*.supabase.co`
3. May need to use personal hotspot temporarily
4. Consider VPN (if allowed by company policy)

### 🌐 CORS Issues

**Symptoms:**
- Console shows "CORS" or "Cross-Origin" errors
- `No 'Access-Control-Allow-Origin' header`
- Running in iframe

**Solution:**
1. Check if app is in iframe: `window.self !== window.top`
2. If yes, open in new tab/window
3. Check Supabase project settings for allowed origins

### ⏱️ Timeout Errors

**Symptoms:**
- Requests take forever then fail
- Console shows timeout errors
- Slow internet connection

**Solution:**
1. Check internet speed
2. Try again with better connection
3. Check Supabase status: https://status.supabase.com

### 🔧 Invalid Credentials

**Symptoms:**
- All requests fail immediately
- Console shows authentication errors
- 401 Unauthorized errors

**Solution:**
1. Check `/utils/supabase/info.ts` file
2. Verify `projectId` and `publicAnonKey` are set
3. Verify credentials match Supabase dashboard
4. Try regenerating anon key in Supabase

### 📱 Mobile/Tablet Issues

**Symptoms:**
- Works on desktop but not mobile
- Mobile data works but WiFi doesn't

**Solution:**
1. Check mobile data vs WiFi separately
2. Try different WiFi network
3. Disable VPN on mobile
4. Clear mobile browser cache
5. Try different mobile browser

## Advanced Troubleshooting

### Test Supabase Directly
```javascript
// Open browser console and paste:
fetch('https://pkzpifdocmmzowvjopup.supabase.co/rest/v1/', {
  method: 'HEAD',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrenBpZmRvY21tem93dmpvcHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNjA0NjcsImV4cCI6MjA3NTkzNjQ2N30.qntjPjuuF8jzrqunjYZDpmQFECKw0gQMllUF8ugPQyk'
  }
})
.then(r => console.log('✅ Supabase reachable:', r.status))
.catch(e => console.error('❌ Cannot reach Supabase:', e));
```

If this works, the issue is in the app code, not network.
If this fails, it's a network/browser issue.

### Check DNS Resolution
```
1. Open Command Prompt/Terminal
2. Run: ping pkzpifdocmmzowvjopup.supabase.co
3. Should resolve to an IP address
4. If "cannot resolve hostname", DNS issue
```

### Try Different Browser
```
Test in:
- Chrome
- Firefox
- Edge
- Safari
- Brave

If works in one but not others, browser-specific issue.
```

### Check System Proxy Settings
```
Windows:
1. Settings → Network & Internet → Proxy
2. Ensure "Automatically detect settings" is ON
3. Turn OFF manual proxy if not needed

Mac:
1. System Preferences → Network
2. Advanced → Proxies
3. Uncheck all unless needed
```

## Environment-Specific Issues

### Running in Figma Make

**Symptoms:**
- Works locally but not in Figma Make
- Iframe-related errors

**Solution:**
```
Figma Make runs in an iframe which may have restrictions:
1. Check browser console for iframe errors
2. Try clicking "Open in new tab" if available
3. May need to adjust Supabase CORS settings
4. Some features may be limited in iframe environment
```

### Development vs Production

**Symptoms:**
- Works in development, fails in production
- Different domains

**Solution:**
```
1. Check Supabase project URL is correct
2. Verify API keys are for correct environment
3. Check CORS settings in Supabase dashboard
4. Ensure production domain is whitelisted
```

## Still Not Working?

### Collect Diagnostic Information

1. **Browser Info:**
   - Browser name and version
   - Operating system

2. **Console Errors:**
   - Screenshot of console errors (F12)
   - Copy full error messages

3. **Network Tab:**
   - Screenshot of failed requests
   - Request/response headers

4. **Diagnostic Results:**
   - Run `?diagnostic-network=true`
   - Screenshot results

### Contact Support

Email: support@borderpos.com

Include:
- Description of the problem
- What you've tried
- Diagnostic information above
- Screenshots of errors

## Prevention Tips

1. **Keep browser updated** - Use latest version
2. **Regularly clear cache** - Once per week
3. **Monitor extensions** - Remove unused ones
4. **Stable internet** - Use wired connection when possible
5. **Whitelist domains** - Add `*.supabase.co` to security tools

## Success Indicators

When everything works, you should see:
```
✅ Supabase client initializing: https://pkzpifdocmmzowvjopup.supabase.co
✅ Supabase connection test: SUCCESS
✅ Session check complete: [status]
```

If you don't see these in console, there's a network issue.

---

**Last Updated:** December 2024  
**App Version:** ShopEasy POS v2.0
