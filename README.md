# Add2Cart Authentication Pages

A modern, responsive login and signup page built with Next.js, Tailwind CSS, and Framer Motion.

## Features

- ✨ Smooth animations with Framer Motion
- 🎨 Clean white background with red accents
- 📱 Fully responsive design
- 🔄 Smooth transitions between login and signup
- 🔐 Password visibility toggle
- 🔑 Social login buttons (Google & Apple)
- ✅ Form validation and success messages
- 🎯 Production-ready code structure

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000/login](http://localhost:3000/login) or [http://localhost:3000/signup](http://localhost:3000/signup) in your browser.

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout
│   ├── globals.css         # Global styles
│   ├── login/
│   │   └── page.tsx        # Login page
│   └── signup/
│       └── page.tsx        # Signup page
├── components/
│   └── AuthScreen.tsx       # Main authentication component
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

## Next Steps

To integrate with Supabase authentication:

1. Install Supabase client:
```bash
npm install @supabase/supabase-js
```

2. Create a Supabase client utility:
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

3. Update the `handleSubmit` function in `AuthScreen.tsx` to use Supabase:
```typescript
import { supabase } from '@/lib/supabase'

// For signup:
const { data, error } = await supabase.auth.signUp({
  email: formData.email,
  password: formData.password,
})

// For login:
const { data, error } = await supabase.auth.signInWithPassword({
  email: formData.email,
  password: formData.password,
})
```

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **Framer Motion** - Animation library

## License

MIT

