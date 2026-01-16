# NEXUS - AI Agent

Elite AI Agent powered by Llama 4 Scout

## Authentication

This application uses **Neon Auth** exclusively for all authentication needs. Neon Auth handles:

- User authentication (email/password, OAuth, magic links)
- OTP verification
- Email service
- Rate limiting
- Row Level Security (RLS)
- Token management
- Database session management

## Setup

### Prerequisites

- Node.js 20+ 
- A Neon account with Neon Auth enabled
- API keys for Groq, OpenAI, Anthropic (optional)
- Upstash Redis (optional)

### Enable Neon Auth

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project in the Neon Console
3. Go to your project settings
4. Enable **Neon Auth**
5. Copy your Auth URL (format: `https://ep-xxx.neonauth.c-2.us-east-2.aws.neon.build/dbname/auth`)

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

**Required variables:**
- `NEON_NEON_DATABASE_URL`: Your Neon Postgres connection string
- `NEXT_PUBLIC_NEON_AUTH_URL`: Your Neon Auth URL (required - from Neon Console)

See `.env.example` for all available configuration options.

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

### Production

```bash
npm run start
```

## Features

- AI-powered coding assistant
- Multi-language support
- Real-time assistance
- Neon Auth integration
- Modern dark theme UI

## Authentication Routes

- `/auth/sign-in` - Sign in page
- `/auth/sign-up` - Sign up page
- `/auth/forgot-password` - Password reset
- `/account/profile` - User profile management
- `/account/settings` - Account settings

For more information about Neon Auth, visit: https://neon.com/docs/auth/overview

## License

MIT
