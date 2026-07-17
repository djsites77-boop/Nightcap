// Vitest runs in plain Node, not Next.js's bundler, so the real `server-only`
// package's unconditional throw would fail every test that imports a module
// guarded by it. Next.js itself no-ops this package server-side; this stub
// does the same for the test environment.
export {};
