/**
 * Knowledge base for code generation
 * Contains best practices and patterns for modern web development
 */

export interface KnowledgeEntry {
  text: string
  embedding: number[]
  category: string
  keywords: string[]
}

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    text: `Modern Development Patterns 2025:
- Use React 19+ with concurrent features and automatic batching
- Implement Server Components and streaming SSR for optimal performance
- Use TypeScript 5.5+ with latest type inference improvements
- Leverage Web Components and custom elements for framework-agnostic solutions
- Implement micro-frontends with Module Federation or single-spa
- Use Vite 6+ or Turbopack for ultra-fast development builds
- Adopt CSS Container Queries and modern layout techniques
- Implement Progressive Web Apps with latest service worker patterns
- Use WebAssembly for performance-critical computations
- Leverage Edge Computing and serverless functions at the edge`,
    embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
    category: 'modern-dev',
    keywords: [
      'react',
      'typescript',
      'vite',
      'webassembly',
      'pwa',
      'edge',
      '2025',
    ],
  },
  {
    text: `Security Best Practices 2025:
- Implement Zero Trust Architecture with continuous verification
- Use Content Security Policy Level 3 with strict-dynamic
- Adopt Passkeys and WebAuthn for passwordless authentication
- Implement Supply Chain Security with SLSA framework
- Use OWASP Top 10 2025 guidelines for web application security
- Leverage Security Headers with latest recommendations
- Implement Runtime Application Self-Protection (RASP)
- Use AI-powered threat detection and response systems
- Adopt Privacy-by-Design principles with data minimization
- Implement Quantum-resistant cryptography preparation`,
    embedding: [0.2, 0.3, 0.4, 0.5, 0.6],
    category: 'security-2025',
    keywords: [
      'security',
      'zero-trust',
      'webauthn',
      'owasp',
      'quantum',
      'privacy',
      '2025',
    ],
  },
  {
    text: `Performance Optimization 2025:
- Use Core Web Vitals 2025 metrics (INP, CLS, LCP improvements)
- Implement Streaming SSR with React 19 concurrent features
- Leverage HTTP/3 and QUIC protocol optimizations
- Use Advanced Image Formats (AVIF, WebP, JPEG XL)
- Implement Predictive Prefetching with ML algorithms
- Use Service Workers with Background Sync and Push API
- Leverage WebCodecs API for media processing
- Implement Virtual DOM alternatives like Solid.js patterns
- Use Web Streams API for efficient data processing
- Adopt Edge-Side Includes (ESI) for dynamic content`,
    embedding: [0.3, 0.4, 0.5, 0.6, 0.7],
    category: 'performance-2025',
    keywords: [
      'performance',
      'web-vitals',
      'http3',
      'streaming',
      'webcodecs',
      'edge',
      '2025',
    ],
  },
  {
    text: `Full-Stack Development 2025:
- Use Next.js 15+ with Turbopack and enhanced App Router
- Implement tRPC or GraphQL with real-time subscriptions
- Use Prisma 6+ with edge database support
- Leverage Serverless databases (PlanetScale, Neon, Supabase)
- Implement Event-Driven Architecture with message queues
- Use Docker containers with multi-stage builds
- Adopt Infrastructure as Code with Terraform or Pulumi
- Implement CI/CD with GitHub Actions and automated testing
- Use Monitoring with OpenTelemetry and distributed tracing
- Leverage AI/ML integration with TensorFlow.js or ONNX`,
    embedding: [0.4, 0.5, 0.6, 0.7, 0.8],
    category: 'fullstack-2025',
    keywords: [
      'nextjs',
      'trpc',
      'prisma',
      'serverless',
      'docker',
      'ai',
      'ml',
      '2025',
    ],
  },
  {
    text: `Multi-Platform Development 2025:
- Use React Native 0.75+ with New Architecture and Fabric
- Implement Flutter 3.24+ with Impeller rendering engine
- Use Tauri 2.0 for lightweight desktop applications
- Leverage Electron alternatives like Wails or Neutralino
- Implement Progressive Web Apps with advanced capabilities
- Use Capacitor for hybrid mobile development
- Adopt WebAssembly for cross-platform native performance
- Implement Universal Apps with Expo Router and file-based routing
- Use Kotlin Multiplatform for shared business logic
- Leverage .NET MAUI for Microsoft ecosystem integration`,
    embedding: [0.5, 0.6, 0.7, 0.8, 0.9],
    category: 'multiplatform-2025',
    keywords: [
      'react-native',
      'flutter',
      'tauri',
      'electron',
      'pwa',
      'webassembly',
      'kotlin',
      '2025',
    ],
  },
]
