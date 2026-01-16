# NEXUS - AI Agent

Elite AI Agent powered by Llama 4 Scout

## Setup

### Prerequisites

- Node.js 20+ 
- A Neon account with a project
- API keys for Groq, OpenAI, Anthropic (optional)
- Upstash Redis (optional)

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `NEON_NEON_DATABASE_URL`: Your Neon Postgres connection string
- `NEXT_PUBLIC_NEON_AUTH_URL`: Your Neon Auth URL (optional, for Neon Auth features)

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
- Neon Auth integration (optional)
- Modern dark theme UI

## Authentication

This application supports Neon Auth for user authentication. To enable:

1. Enable Neon Auth in your Neon Console
2. Copy your Auth URL to `NEXT_PUBLIC_NEON_AUTH_URL` in `.env.local`
3. Visit `/auth` to sign in
4. Visit `/account` to manage your account

If Neon Auth is not configured, the application will still work but authentication features will be disabled.

## License

MIT
