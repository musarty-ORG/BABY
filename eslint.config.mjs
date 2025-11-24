// ESLint 9 flat config for Next.js
// Note: Full Next.js integration pending upstream compatibility fixes
// For now using minimal config that allows builds to proceed
export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "*.config.js",
      "*.config.mjs",
    ],
  },
];
