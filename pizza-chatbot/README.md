# 🍕 Pizza Palace WhatsApp Chatbot

## Setup Guide

### Step 1 - Install Dependencies
```
npm install
```

### Step 2 - Environment Variables
`.env` file mein yeh daalo:
```
WHATSAPP_TOKEN=apna_meta_access_token
PHONE_NUMBER_ID=1162056280327363
VERIFY_TOKEN=pizza123
GROQ_API_KEY=apni_groq_key
PORT=3000
```

### Step 3 - Local Test
```
npm run dev
```

### Step 4 - Railway Deploy
1. GitHub pe upload karo
2. Railway mein repo connect karo
3. Environment variables daalo
4. Deploy!

### Step 5 - Meta Webhook Setup
Railway URL copy karo aur Meta Developer Console mein:
- Callback URL: `https://your-app.railway.app/webhook`
- Verify Token: `pizza123`
