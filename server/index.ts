import './loadEnv'; // Load environment variables first
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import helmet from "helmet";
import cors from "cors";
import { suppressVerboseLogging } from "./utils/logger";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseConnection } from "./db";
import { initializeDatabase } from "./initDB";
import { pool } from "./db";
import emailTemplateManager from "./utils/emailTemplateManager";

// Suppress verbose console.log in production
suppressVerboseLogging();

const app = express();

// Security headers middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for Vite in dev
      styleSrc: ["'self'", "'unsafe-inline'"], // Needed for inline styles
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for some external resources
}));

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://mysmartscheduler.co', 'https://www.mysmartscheduler.co']
  : ['http://localhost:5000', 'http://localhost:5001', 'http://127.0.0.1:5000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

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
    secure: process.env.NODE_ENV === 'production', // Secure in production (HTTPS only), false in development
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
  // Initialize email templates
  try {
    await emailTemplateManager.initializeTemplates();
    console.log('✅ Email templates initialized successfully');
  } catch (err) {
    console.error('❌ Failed to initialize email templates:', err);
  }
  
  const server = await registerRoutes(app);

  // Global error handling middleware
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log error details
    console.error(`[ERROR] ${req.method} ${req.path}`);
    console.error(`Status: ${status}, Message: ${message}`);
    if (process.env.NODE_ENV !== 'production') {
      console.error('Stack trace:', err.stack);
    }

    // Send error response
    res.status(status).json({
      error: {
        message,
        status,
        ...(process.env.NODE_ENV !== 'production' && {
          stack: err.stack,
          details: err.details || undefined
        })
      }
    });
  });

  // Handle 404 - Route not found
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: {
        message: 'Route not found',
        status: 404,
        path: req.path
      }
    });
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
  
  // Use environment-based host selection
  // - 127.0.0.1 for CI/testing environments (fixes GitHub Actions networking issues)
  // - 0.0.0.0 for Replit and production (required for external access)
  const host = process.env.CI === 'true' || process.env.HOST === 'localhost' 
    ? '127.0.0.1' 
    : '0.0.0.0';
  
  console.log(`🌐 Server binding configuration:`);
  console.log(`- Host: ${host}`);
  console.log(`- Port: ${port}`);
  console.log(`- Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`- CI Mode: ${process.env.CI === 'true' ? 'Yes' : 'No'}`);
  
  server.listen({
    port,
    host,
    reusePort: true,
  }, () => {
    log(`serving on ${host}:${port}`);
  });
})();

// Global error handlers - catch unhandled errors to prevent crashes

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('🚨 Unhandled Promise Rejection:');
  console.error('Reason:', reason);
  console.error('Promise:', promise);

  // In production, log but don't exit
  if (process.env.NODE_ENV === 'production') {
    console.error('⚠️ Server continuing despite unhandled rejection (production mode)');
  } else {
    console.error('⚠️ Fix this unhandled rejection in development!');
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('🚨 Uncaught Exception:');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);

  // Uncaught exceptions are serious - we should exit
  console.error('❌ Server must restart due to uncaught exception');

  // Give some time for logs to flush
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM signal received: closing HTTP server');
  // Implement graceful shutdown logic here if needed
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('⚠️ SIGINT signal received: closing HTTP server');
  process.exit(0);
});
