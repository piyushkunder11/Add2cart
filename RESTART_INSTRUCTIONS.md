# Fix Razorpay Configuration Error

## The Problem
The error "Razorpay is not configured" appears because Next.js hasn't loaded the environment variables from `.env.local`.

## Solution: Restart Dev Server

### Step 1: Stop the Current Server
1. Go to the terminal where `npm run dev` is running
2. Press `Ctrl+C` to stop it
3. Wait for it to fully stop

### Step 2: Clear Next.js Cache (Optional but Recommended)
```bash
# Delete the .next folder
rm -rf .next

# Or on Windows PowerShell:
Remove-Item -Recurse -Force .next
```

### Step 3: Restart the Server
```bash
npm run dev
```

### Step 4: Hard Refresh Browser
- Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Or close and reopen the browser tab

## Verify Environment Variables

Your `.env.local` file should contain:
```
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_RxmPZiwRq35bGo
RAZORPAY_KEY_SECRET=oesQ70L1ahoeqBnMizxOfIZu
```

## Why This Happens

Next.js only reads `.env.local` when the server starts. If you:
- Created/updated `.env.local` after starting the server
- Modified the file while the server was running

You MUST restart the server for changes to take effect.

## Still Not Working?

1. Check `.env.local` is in the project root (same folder as `package.json`)
2. Ensure no extra spaces around the `=` sign
3. Make sure the file is named exactly `.env.local` (not `.env.local.txt`)
4. Try deleting `.next` folder and restarting

