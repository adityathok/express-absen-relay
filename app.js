'use strict';

const path = require('path');
const http = require('http');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const { Server } = require('socket.io');

const config = require('./config');
const db = require('./config/database');
const routes = require('./routes');
const realtime = require('./services/realtime');
const retryService = require('./services/retryService');
const { requestLogger } = require('./middleware/logger');
const { globalLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ---------------------------------------------------------------------------
// View engine & static assets
// ---------------------------------------------------------------------------
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
        fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'data:'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.static(path.join(__dirname, 'public')));
app.use(requestLogger);

// ---------------------------------------------------------------------------
// Session & flash
// ---------------------------------------------------------------------------
app.use(
  session({
    name: 'connect.sid',
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.env === 'production',
      maxAge: 8 * 60 * 60 * 1000,
    },
  })
);
app.use(flash());

// ---------------------------------------------------------------------------
// Body parsers
// ---------------------------------------------------------------------------
// The fingerprint protocol posts raw text; the dashboard uses form/JSON bodies.
app.use('/iclock', express.text({ type: '*/*', limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(methodOverride('_method'));

// Values shared with every rendered view.
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.flash = { success: req.flash('success'), error: req.flash('error') };
  // Build a URL for the current page with the `page` query param replaced.
  res.locals.buildPageUrl = (page) => {
    const [base, qs] = req.originalUrl.split('?');
    const params = new URLSearchParams(qs || '');
    params.set('page', page);
    return `${base}?${params.toString()}`;
  };
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use(globalLimiter);
app.use(routes);

app.use(notFound);
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------
realtime.init(io);
io.on('connection', (socket) => {
  console.log(`[socket] dashboard client connected (${socket.id})`);
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
async function start() {
  try {
    await db.ping();
    console.log(`[db] Connected to MySQL database "${config.db.database}".`);
  } catch (error) {
    console.error(`[db] Cannot reach MySQL: ${error.message}`);
    console.error('[db] Run "npm run setup" after configuring your .env file.');
  }

  retryService.start();

  server.listen(config.port, () => {
    console.log(`[server] Fingerprint relay running at http://localhost:${config.port}`);
    console.log(`[server] Device listener: /iclock/cdata?SN=<serial>`);
  });
}

function shutdown(signal) {
  console.log(`\n[server] Received ${signal}, shutting down...`);
  retryService.stop();
  server.close(async () => {
    await db.close().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

if (require.main === module) {
  start();
}

module.exports = { app, server, start };
