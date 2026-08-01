// Must run before app modules import config.
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET || 'test-session-secret-min-16-chars';
process.env.ANTHROPIC_API_KEY =
  process.env.ANTHROPIC_API_KEY || 'test-anthropic-key-not-real';
process.env.CORS_ORIGINS =
  process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000';
process.env.PORT = process.env.PORT || '8787';
// Disable production guard during tests.
process.env.NODE_ENV = 'test';
