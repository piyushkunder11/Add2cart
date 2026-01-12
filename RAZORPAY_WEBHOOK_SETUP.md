# Razorpay Webhook Setup Guide

This document explains how to set up Razorpay webhooks for reliable payment processing.

## Overview

The webhook endpoint at `/api/razorpay/webhook` handles payment events from Razorpay to ensure orders are updated even if the client-side payment handler fails.

## Events Handled

- **payment.captured**: Payment successful, updates order to `paid`/`confirmed`
- **payment.failed**: Payment failed, updates order to `failed`

## Setup Instructions

### 1. Configure Webhook Secret

Add the webhook secret to your `.env.local` file:

```env
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

**Important**: This secret is different from `RAZORPAY_KEY_SECRET`. You get this from your Razorpay Dashboard.

### 2. Get Webhook Secret from Razorpay Dashboard

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to **Settings** → **Webhooks**
3. Create a new webhook or use an existing one
4. Copy the **Webhook Secret** (starts with `whsec_`)

### 3. Configure Webhook URL in Razorpay Dashboard

1. In Razorpay Dashboard → **Settings** → **Webhooks**
2. Add webhook URL: `https://yourdomain.com/api/razorpay/webhook`
3. Select events to subscribe:
   - `payment.captured`
   - `payment.failed`
4. Save the webhook

### 4. Test Webhook (Development)

For local development, use a tool like [ngrok](https://ngrok.com/) to expose your local server:

```bash
ngrok http 3000
```

Then use the ngrok URL in Razorpay webhook settings:
```
https://your-ngrok-url.ngrok.io/api/razorpay/webhook
```

## How It Works

1. **Draft Order Creation**: When user initiates payment, a draft order is created with `payment_status: 'pending'` and the Razorpay Order ID is stored in `admin_notes`.

2. **Payment Success**: 
   - Client-side handler processes payment
   - Webhook also receives `payment.captured` event
   - Webhook updates order to `paid`/`confirmed` (idempotent - safe if called multiple times)

3. **Payment Failure**:
   - Client-side handler processes failure
   - Webhook also receives `payment.failed` event
   - Webhook updates order to `failed` (idempotent)

## Idempotency

The webhook is idempotent, meaning:
- If an order is already `paid`/`confirmed`, it won't be updated again
- If an order is already `failed`, it won't be updated again
- Duplicate webhook calls are safely handled

## Security

- Webhook signature is verified using HMAC SHA256
- Only events with valid signatures are processed
- Invalid signatures return 401 Unauthorized

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook URL is correct in Razorpay Dashboard
2. Verify `RAZORPAY_WEBHOOK_SECRET` is set correctly
3. Check server logs for webhook errors
4. Ensure webhook URL is publicly accessible (not behind firewall)

### Order Not Found

- Webhook searches by `payment_id` first
- Falls back to searching by Razorpay Order ID in `admin_notes`
- If order not found, webhook acknowledges but doesn't fail (idempotent)

### Signature Verification Fails

- Verify `RAZORPAY_WEBHOOK_SECRET` matches the secret in Razorpay Dashboard
- Ensure you're using the webhook secret, not the API key secret
- Check that the raw request body is being used for signature verification

