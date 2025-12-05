# Copilot Instructions for Code Homie

## Repository Overview

**Code Homie** is an AI-powered web development platform that generates production-ready code using multiple AI models. It's a Next.js 15 application built with React 19, TypeScript, and Tailwind CSS, featuring a sophisticated multi-agent code generation pipeline.

**Repository Stats (as of Dec 2024):**
- ~23,000+ lines of TypeScript/JavaScript code across 150+ files
- Main technologies: Next.js 15.2.4, React 19, TypeScript 5, Tailwind CSS 3.4
- Key dependencies: Vercel AI SDK, Groq, OpenAI, Anthropic Claude, Neon PostgreSQL, Upstash Redis
- Primary runtime: Node.js 20.x (tested with v20.19.6) and npm 10.x

## Critical Build Requirements

### Environment Setup (ALWAYS REQUIRED)

**IMPORTANT**: The build WILL FAIL without proper environment variables. Before running any build or dev commands, you MUST create a `.env.local` file with at minimum these variables:

```bash
# Required for build to succeed
NEON_NEON_DATABASE_URL=postgresql://placeholder:placeholder@placeholder/placeholder
KV_REST_API_URL=https://placeholder
KV_REST_API_TOKEN=placeholder
API_SECRET_KEY=placeholder
GROQ_API_KEY=placeholder
OPENAI_API_KEY=placeholder
ANTHROPIC_API_KEY=placeholder
```

**Note**: The variable name is `NEON_NEON_DATABASE_URL` (double "NEON") - this is intentional.

### Build Commands (TESTED AND VERIFIED)

**1. Install Dependencies:**
```bash
npm install
```
- Takes ~25-30 seconds on typical hardware
- May show npm security warnings (typically low severity, non-blocking)
- Installs 600+ packages

**2. Production Build:**
```bash
npm run build
```
- Takes ~60-90 seconds
- TypeScript errors are ignored (`ignoreBuildErrors: true` in next.config.mjs)
- ESLint is ignored during builds (`ignoreDuringBuilds: true`)
- Will show warnings about Upstash Redis env vars (non-blocking)
- Success generates `.next/` directory with static/server bundles

**3. Development Server:**
```bash
npm run dev
```
- Starts in ~1.5-2 seconds
- Runs on http://localhost:3000
- Hot reload is fully functional
- Loads `.env.local` automatically

**4. Linting:**
```bash
npm run lint
```
- Takes ~10-15 seconds
- Uses Next.js built-in ESLint
- Shows warning about Next.js plugin not detected (known issue, non-blocking)
- Typically shows "No ESLint warnings or errors"

## Project Architecture

### Directory Structure

```
/app/                   # Next.js App Router pages and API routes
  /api/                 # 48+ API endpoints
    /multi-agent/       # Core code generation pipeline
    /admin/             # Admin dashboard routes
    /auth/              # OTP-based authentication
    /crawl/             # Web scraping engine
    /deploy/            # Deployment service
    /predictive/        # Predictive analysis features
    /paypal/            # Payment integration
  /multi-agent/         # Main code generation UI (43 KB bundle)
  /page.tsx             # Landing page with chat interface
  /layout.tsx           # Root layout with theme provider
  /globals.css          # Global Tailwind styles

/lib/                   # Core business logic (29 modules)
  pipeline-orchestrator.ts (1058 lines) # Main code generation engine
  predictive-evolution.ts  (990 lines)  # Predictive AI features
  database-service.ts      (683 lines)  # Neon PostgreSQL wrapper
  multi-modal-engine.ts    (672 lines)  # Image/voice processing
  contextual-assistant.ts  (587 lines)  # Context-aware suggestions
  crawl-engine.ts          (541 lines)  # Web scraping logic
  paypal-service.ts        (528 lines)  # Payment processing

/components/            # React components
  /ui/                  # 50+ shadcn/ui components
  site-header.tsx       # Shared header (extracted from pages)
  auth-login.tsx        # OTP login component
  voice-interface.tsx   # Speech interaction
  predictive-insights-panel.tsx

/types/                 # TypeScript definitions
  pipeline.ts           # Core pipeline types

/hooks/                 # React custom hooks
/utils/                 # Utility functions
/public/                # Static assets
/scripts/               # Setup/utility scripts
  verify-setup.ts       # Environment validation script

/docs/                  # Documentation
  api-security.md       # API authentication guide
```

### Key Configuration Files

- **next.config.mjs**: Ignores TypeScript/ESLint errors, disables image optimization
- **tsconfig.json**: Path aliases (`@/*`), ES6 target, bundler module resolution
- **eslint.config.mjs**: Minimal ESLint 9 flat config (known limitation - see KNOWN_ISSUES.md)
- **tailwind.config.js**: Tailwind configuration with custom theme
- **postcss.config.js** / **postcss.config.mjs**: Both exist; .js includes autoprefixer, .mjs is newer ESM format
- **components.json**: shadcn/ui component configuration
- **.gitignore**: Excludes `.env*`, `.next/`, `node_modules/`, `out/`, `build/`

## Build Workflow & Best Practices

### Standard Development Workflow

```bash
# 1. ALWAYS start by creating .env.local (if not exists)
cat > .env.local << 'EOF'
NEON_NEON_DATABASE_URL=postgresql://placeholder:placeholder@placeholder/placeholder
KV_REST_API_URL=https://placeholder
KV_REST_API_TOKEN=placeholder
API_SECRET_KEY=placeholder
GROQ_API_KEY=placeholder
OPENAI_API_KEY=placeholder
ANTHROPIC_API_KEY=placeholder
EOF

# 2. Install dependencies
npm install

# 3. Run development server
npm run dev

# 4. Make changes to code

# 5. Test with production build before committing
npm run build

# 6. Run lint check
npm run lint
```

### Known Issues & Workarounds

**1. Build Failures Without Environment Variables**
- **Error**: "No database connection string was provided to `neon()`"
- **Fix**: ALWAYS create `.env.local` with required variables before building
- **Note**: Placeholder values work for builds; real values needed for runtime functionality

**2. ESLint Configuration Limitations**
- **Issue**: ESLint 9 flat config has limited Next.js integration
- **Impact**: Missing some Next.js-specific linting rules
- **Workaround**: Current minimal config allows builds to proceed
- **Status**: Waiting for `eslint-config-next` upstream fixes

**3. TypeScript Strict Mode Disabled**
- **Reason**: `ignoreBuildErrors: true` in next.config.mjs
- **Impact**: Type errors don't block builds
- **Rationale**: Intentional for faster iteration

**4. React 19 Peer Dependency Warnings**
- **Issue**: Many packages don't officially support React 19 yet
- **Fix**: `overrides` in package.json forces React 19 for all dependencies
- **Impact**: Warnings during install but packages work correctly

**5. Clean Build Required After Major Changes**
- If you encounter strange build errors, run: `rm -rf .next && npm run build`
- The `.next/` cache can sometimes cause issues with large refactors

## Testing & Validation

**No Automated Tests**: This project currently has no test suite. Validation must be done manually:

1. **Build validation**: `npm run build` must succeed
2. **Runtime check**: `npm run dev` and verify localhost:3000 loads
3. **Code changes**: Test affected pages/API routes in browser
4. **API routes**: Use curl/Postman to verify endpoints still respond

## Common Development Scenarios

### Adding a New API Route

1. Create route file: `app/api/your-route/route.ts`
2. Use existing patterns from `app/api/multi-agent/route.ts`
3. Import required middleware: `requireAuth`, `checkRateLimit`, `withErrorHandler`
4. Use validation schemas from `lib/validation-schemas.ts`
5. Export handlers: `export const POST = async (req: NextRequest) => { ... }`
6. Set timeout if needed: `export const maxDuration = 60`

### Modifying the Code Generation Pipeline

- **Main file**: `lib/pipeline-orchestrator.ts` (1058 lines)
- **Knowledge base**: `lib/knowledge-base.ts` (extracted constants)
- **Entry point**: `app/api/multi-agent/route.ts`
- **Types**: `types/pipeline.ts`
- **Dual model feature**: Lines 19-100 in multi-agent route (Claude + Llama in parallel)

### Adding UI Components

- Use shadcn/ui components from `components/ui/`
- Reference existing patterns in `app/page.tsx` or `app/multi-agent/page.tsx`
- Import shared header: `import { SiteHeader } from "@/components/site-header"`
- Theme support via `next-themes` is pre-configured

### Modifying Styles

- Global styles: `app/globals.css`
- Tailwind config: `tailwind.config.js`
- PostCSS: `postcss.config.js` (or `.mjs` variant)
- Component styles: Use Tailwind utility classes

## GitHub Actions CI

**Current CI**: `.github/workflows/blank.yml` - Basic template workflow
- Triggers on push/PR to main branch
- Currently only runs echo commands (placeholder)
- No automated testing, linting, or build verification in CI

**Recommendation**: If adding real CI checks, include:
```yaml
- npm install
- npm run build
- npm run lint
```

## Important Notes for Copilot Agents

1. **ALWAYS create .env.local before any build/dev commands** - This is the #1 cause of build failures
2. **Trust the existing configurations** - TypeScript/ESLint ignore settings are intentional
3. **The build succeeds despite warnings** - Upstash Redis warnings are expected and non-blocking
4. **No tests exist** - Manual verification is required for all changes
5. **Large files**: `pipeline-orchestrator.ts` and `predictive-evolution.ts` are intentionally large monolithic modules
6. **Dual model generation**: This is a key feature - both Claude and Llama run in parallel for speed
7. **Path aliases**: Use `@/` for imports (e.g., `import { foo } from "@/lib/utils"`)
8. **Environment variable naming**: Note the double "NEON" in `NEON_NEON_DATABASE_URL`

## Reference: Complete File List (Root Level)

```
.github/             # GitHub workflows and configs
.gitignore           # Git ignore rules
CHANGELOG.md         # Project history and modernization notes (November 2024)
KNOWN_ISSUES.md      # Documented issues and workarounds
app/                 # Next.js app directory
components/          # React components
components.json      # shadcn/ui configuration
docs/                # Documentation files
eslint.config.mjs    # ESLint 9 flat config
hooks/               # Custom React hooks
improved_analysis.py # Python utility script
lib/                 # Core business logic
next.config.mjs      # Next.js configuration
package.json         # Dependencies and scripts
package-lock.json    # Locked dependency versions
postcss.config.js    # PostCSS config (includes autoprefixer)
postcss.config.mjs   # PostCSS ESM config (Tailwind only, newer format)
public/              # Static assets
scripts/             # Utility scripts
styles/              # Additional stylesheets
tailwind.config.js   # Tailwind CSS configuration
tsconfig.json        # TypeScript configuration
types/               # TypeScript type definitions
utils/               # Utility functions
```

## Final Checklist for Code Changes

- [ ] Created/verified `.env.local` exists
- [ ] Ran `npm install` (if dependencies changed)
- [ ] Ran `npm run build` successfully
- [ ] Ran `npm run lint` (verify no new errors)
- [ ] Tested changes with `npm run dev` and manual browser verification
- [ ] Verified no new security vulnerabilities were introduced
- [ ] Updated this file if adding new critical build steps or discovering new issues

**When in doubt, refer to CHANGELOG.md and KNOWN_ISSUES.md for historical context and current limitations.**
