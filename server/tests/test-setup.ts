// Set test environment
process.env.NODE_ENV = 'test';

// Set up test database URL if not already set
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_db';

// Disable WebSocket for tests
process.env.DISABLE_WS = 'true';