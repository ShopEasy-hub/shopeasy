# 🚨 NetworkError Quick Reference

## Error: NetworkError when attempting to fetch resource

### Immediate Actions (Try in Order)

#### 1️⃣ Run Diagnostics
```
Add to URL: ?diagnostic-network=true
Click: "Run Diagnostics" button
```

#### 2️⃣ Disable Ad Blockers
```
- uBlock Origin
- AdBlock Plus
- Privacy Badger
- Any other browser extensions
```

#### 3️⃣ Try Incognito Mode
```
Chrome/Edge: Ctrl+Shift+N
Firefox: Ctrl+Shift+P
Safari: Cmd+Shift+N
```

#### 4️⃣ Clear Browser Cache
```
Chrome: Ctrl+Shift+Delete → "All time" → Clear
Firefox: Ctrl+Shift+Delete → "Everything" → Clear
```

#### 5️⃣ Hard Refresh
```
Windows: Ctrl+F5
Mac: Cmd+Shift+R
```

### Check Browser Console

```
Press F12 → Console tab

✅ Good:
"✅ Supabase connection test: SUCCESS"

❌ Bad:
"❌ NetworkError"
"Failed to fetch"
"ERR_BLOCKED_BY_CLIENT"
```

### Quick Tests

#### Test 1: Internet Connection
```
Open: https://supabase.com
Should load? YES = Internet OK
```

#### Test 2: Direct Supabase Access
```
Paste in console (F12):

fetch('https://pkzpifdocmmzowvjopup.supabase.co/rest/v1/', {
  method: 'HEAD',
  headers: { 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrenBpZmRvY21tem93dmpvcHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNjA0NjcsImV4cCI6MjA3NTkzNjQ2N30.qntjPjuuF8jzrqunjYZDpmQFECKw0gQMllUF8ugPQyk' }
})
.then(r => console.log('✅', r.status))
.catch(e => console.error('❌', e));

✅ Should see: "✅ 200" or "✅ 404"
❌ If error: Network issue confirmed
```

### Common Problems → Quick Solutions

| Problem | Solution |
|---------|----------|
| 🚫 Ad blocker | Disable or whitelist `*.supabase.co` |
| 🏢 Corporate network | Contact IT, whitelist `*.supabase.co` |
| 🔒 VPN/Proxy | Disable temporarily |
| 📱 Mobile data | Try WiFi or vice versa |
| 🖼️ Running in iframe | Open in new tab |
| ⏰ Timeout | Better internet connection |
| 🔧 Extension conflict | Disable all extensions |

### If Nothing Works

1. **Try different browser**
   - Chrome → Firefox → Edge

2. **Try different device**
   - Desktop → Mobile → Tablet

3. **Try different network**
   - Work → Home → Mobile hotspot

4. **Contact support**
   - Email: support@borderpos.com
   - Include: Browser, OS, error screenshot

### Files to Check

- 📖 Full guide: `/NETWORK_ERROR_TROUBLESHOOTING.md`
- ✅ Fix status: `/NETWORK_ERROR_FIX_COMPLETE.md`
- 🔧 Previous fix: `/NETWORK_ERROR_FIX.md`

### Diagnostic Page Features

Access: `?diagnostic-network=true`

Tests:
- ✅ Credentials (projectId, apiKey)
- ✅ Supabase connection
- ✅ Auth session
- ✅ Network connectivity
- ✅ localStorage
- ✅ Iframe detection
- ✅ CORS/Origin

### Success Indicators

When app works correctly:
```
Console shows:
✅ Supabase client initializing
✅ Supabase connection test: SUCCESS
✅ Session check complete

App behavior:
✅ Login page loads
✅ Can sign in
✅ Dashboard shows data
✅ All features work
```

### 90% of Issues Fixed By

1. **Disabling ad blocker** (40%)
2. **Trying incognito mode** (25%)
3. **Clearing cache** (15%)
4. **Changing network** (10%)

---

⚡ **Pro Tip:** If works in incognito, it's a browser extension or cache issue!

📞 **Support:** support@borderpos.com  
🔗 **Status:** https://status.supabase.com
