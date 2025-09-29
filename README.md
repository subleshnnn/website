# Artist Rentals

A platform for artists to find and list rental spaces - studios, galleries, and creative spaces.

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Supabase** - Database and backend
- **Clerk** - Authentication
- **Vercel** - Hosting (recommended)

## Features

- Browse rental listings from fellow artists
- User authentication (sign up/sign in)
- User dashboard to manage listings
- Create, edit, and delete listings
- Contact property owners directly
- Responsive design for mobile and desktop

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd artist-rentals
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get your keys
3. In the SQL Editor, run the schema from `supabase-schema.sql`

### 3. Set up Clerk

1. Create a new application at [clerk.dev](https://clerk.dev)
2. Get your publishable key and secret key from the dashboard

### 4. Environment Variables

Create `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Clerk Configuration  
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/page.tsx
│   │   └── sign-up/page.tsx
│   ├── dashboard/
│   │   ├── create/page.tsx
│   │   └── page.tsx
│   ├── listings/
│   │   └── [id]/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── Navigation.tsx
└── lib/
    └── supabase.ts
```

## Database Schema

The `supabase-schema.sql` file contains:
- `listings` table for rental properties
- `listing_images` table for property photos (future feature)
- Row Level Security (RLS) policies
- Proper indexes for performance

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

The app works on any platform that supports Next.js:
- Netlify
- Railway
- Digital Ocean App Platform

## Future Features

- [ ] Image uploads for listings
- [ ] Advanced search and filtering
- [ ] In-app messaging system
- [ ] Booking calendar integration
- [ ] Reviews and ratings
- [ ] Payment processing
- [ ] Email notifications
- [ ] Mobile app (React Native)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details