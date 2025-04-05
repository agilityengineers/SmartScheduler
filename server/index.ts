import './loadEnv'; // Load environment variables first
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseConnection } from "./db";
import { initializeDatabase } from "./initDB";
import { pool } from "./db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure session store
const PgStore = pgSession(session);
const usePostgres = process.env.USE_POSTGRES === 'true' || process.env.NODE_ENV === 'production';

// Configure session middleware
const sessionSecret = process.env.SESSION_SECRET || 'smart-scheduler-session-secret';
const isProduction = process.env.NODE_ENV === 'production';

// Log session configuration details
console.log('📋 Session Configuration:');
console.log(`- Storage: ${usePostgres ? 'PostgreSQL' : 'Memory (not persistent)'}`);
console.log(`- Secure cookies: ${isProduction ? 'Yes (requires HTTPS)' : 'No (development mode)'}`);
console.log(`- Using custom secret: ${sessionSecret !== 'smart-scheduler-session-secret' ? 'Yes' : 'No (default)'}`);

// If using default secret in production, give a warning
if (isProduction && sessionSecret === 'smart-scheduler-session-secret') {
  console.warn('⚠️ WARNING: Using default session secret in production is not secure!');
  console.warn('   Set SESSION_SECRET environment variable to a unique random value.');
}

app.use(session({
  store: usePostgres ? new PgStore({
    pool,
    tableName: 'session', // Optional. Default is "session"
    createTableIfMissing: true
  }) : undefined, // Use memory store for development
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Setting to false to make it work in development environment
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Check for database connectivity
const useDatabase = process.env.USE_POSTGRES === 'true' || process.env.NODE_ENV === 'production';
if (useDatabase) {
  checkDatabaseConnection()
    .then(connected => {
      if (connected) {
        console.log('✅ Connected to PostgreSQL database');
        // Initialize the database with tables and default data if needed
        initializeDatabase()
          .then(() => console.log('✅ Database initialization complete'))
          .catch(err => console.error('❌ Database initialization failed:', err));
      } else {
        console.error('❌ Failed to connect to PostgreSQL database');
        console.log('⚠️ Using in-memory storage instead');
      }
    })
    .catch(err => {
      console.error('❌ Database connection error:', err);
      console.log('⚠️ Using in-memory storage instead');
    });
} else {
  console.log('📊 Using in-memory storage (database disabled)');
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
