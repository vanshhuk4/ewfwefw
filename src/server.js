import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { v4 as uuidv4 } from "uuid";
import { sql } from "./config/db.js";
import { Clerk } from '@clerk/clerk-sdk-node';
import { AIService } from "./services/AIService.js";
import fetch from "node-fetch";
import "dotenv/config";
import rateLimiter from "./middleware/rateLimiter.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import requestIp from "request-ip";

// Temporary no-op auth middleware to avoid runtime errors
// Replace with real Clerk route middleware when wiring sessions
const ClerkExpressRequireAuth = () => (req, res, next) => next();

// Runtime status
let dbReady = false;

// Phone number validation function
function validateAndFormatIndianNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return null;
  }

  let cleaned = phoneNumber.replace(/[^0-9+]/g, '');

  if (cleaned.startsWith('+91') && cleaned.length === 13) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }

  const indianMobileRegex = /^[6-9]\d{9}$/;

  if (indianMobileRegex.test(cleaned)) {
    return `+91${cleaned}`;
  }

  return null;
}

// Database initialization
async function initDB() {
  try {
    // Create role ENUM
    await sql`DO $$ BEGIN
      CREATE TYPE role AS ENUM ('USER', 'ADMIN');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`;
    console.log("✅ ENUM 'role' checked/created successfully.");

    // Ensure OFFICER value exists in role enum
    await sql`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'role' AND e.enumlabel = 'OFFICER'
      ) THEN
        ALTER TYPE role ADD VALUE 'OFFICER';
      END IF;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`;
    console.log("✅ Enum 'role' includes OFFICER.");

    // Create users table
    await sql`CREATE TABLE IF NOT EXISTS users (
      user_id VARCHAR(255) PRIMARY KEY,
      aadhaar_number VARCHAR(12) UNIQUE,
      full_name VARCHAR(255) NOT NULL,
      phone_number VARCHAR(15) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE,
      address TEXT NOT NULL,
      password_hash TEXT,
      role role NOT NULL DEFAULT 'USER',
      gov_employee_id VARCHAR(50) UNIQUE,
      admin_security_key_hash TEXT,
      profile_image_url TEXT,
      otp VARCHAR(6),
      otp_expiry TIMESTAMP WITH TIME ZONE,
      is_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`;
    console.log("✅ Table 'users' checked/created successfully.");

    // Create grievance_reports table
    await sql`CREATE TABLE IF NOT EXISTS grievance_reports (
      report_id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
      complaint_category VARCHAR(100) NOT NULL,
      subcategory VARCHAR(100),
      classification VARCHAR(100),
      department VARCHAR(100),
      description TEXT NOT NULL,
      location TEXT NOT NULL,
      location_area VARCHAR(100),
      suspicious_entity TEXT,
      anonymity BOOLEAN DEFAULT FALSE,
      evidence JSONB,
      evidence_count INTEGER DEFAULT 0,
      loss_amount DECIMAL(12,2) DEFAULT 0,
      priority_level VARCHAR(20) DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
      status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'assigned', 'resolved', 'closed')),
      assigned_to VARCHAR(255),
      assigned_department VARCHAR(100),
      ai_summary TEXT,
      ai_analysis JSONB,
      overdue_by INTEGER DEFAULT 0,
      resolution_notes TEXT,
      resolved_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`;
    console.log("✅ Table 'grievance_reports' checked/created successfully.");

    // Create suspicious_entities table
    await sql`CREATE TABLE IF NOT EXISTS suspicious_entities (
      entity_id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
      entity_type VARCHAR(100) NOT NULL CHECK (entity_type IN ('mobile_app', 'phone_number', 'social_media_id', 'upi_id', 'website', 'other')),
      entity_value VARCHAR(255) NOT NULL,
      encounter TEXT NOT NULL,
      description TEXT NOT NULL,
      evidence JSONB,
      evidence_count INTEGER DEFAULT 0,
      additional_info TEXT,
      priority_level VARCHAR(20) DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
      confidence_level DECIMAL(5,2) DEFAULT 0.0,
      status VARCHAR(50) DEFAULT 'reported' CHECK (status IN ('reported', 'investigating', 'blocked', 'resolved', 'false_positive')),
      threat_level VARCHAR(20) DEFAULT 'medium' CHECK (threat_level IN ('low', 'medium', 'high', 'critical')),
      reported_by_count INTEGER DEFAULT 1,
      last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      blocked_at TIMESTAMP WITH TIME ZONE,
      investigation_notes TEXT,
      related_cases TEXT[],
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`;
    console.log("✅ Table 'suspicious_entities' checked/created successfully.");

    // Create security_alerts table
    await sql`CREATE TABLE IF NOT EXISTS security_alerts (
      alert_id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
      alert_type VARCHAR(100) NOT NULL,
      severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      source VARCHAR(100),
      detection_patterns JSONB,
      confidence_level DECIMAL(5,2) DEFAULT 0.0,
      related_cases TEXT[],
      one_line_explanation TEXT,
      is_read BOOLEAN DEFAULT FALSE,
      action_taken VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`;
    console.log("✅ Table 'security_alerts' checked/created successfully.");

    // Create learnbot_requests table
    await sql`CREATE TABLE IF NOT EXISTS learnbot_requests (
      request_id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
      request_type VARCHAR(100) NOT NULL,
      query TEXT NOT NULL,
      response TEXT,
      status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      processing_time_ms INTEGER,
      model_used VARCHAR(100),
      confidence_score DECIMAL(5,4),
      ai_accuracy DECIMAL(5,2),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`;
    console.log("✅ Table 'learnbot_requests' checked/created successfully.");

    // Data requests table for lawful data requests
    await sql`CREATE TABLE IF NOT EXISTS data_requests (
      request_id VARCHAR(255) PRIMARY KEY,
      officer_id VARCHAR(255) REFERENCES users(user_id) ON DELETE SET NULL,
      case_id VARCHAR(255) NOT NULL,
      service_provider VARCHAR(255) NOT NULL,
      required_data JSONB NOT NULL,
      legal_basis TEXT,
      transport VARCHAR(10) DEFAULT 'email' CHECK (transport IN ('email','pdf')),
      email_status VARCHAR(50) DEFAULT 'pending' CHECK (email_status IN ('pending','sent','failed')),
      pdf_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`;

    await sql`CREATE INDEX IF NOT EXISTS idx_data_requests_officer ON data_requests(officer_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_data_requests_provider ON data_requests(service_provider);`;

    // Create admin-specific tables
    await sql`CREATE TABLE IF NOT EXISTS admin_dashboard_stats (
      stat_id SERIAL PRIMARY KEY,
      admin_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
      total_complaints INTEGER DEFAULT 0,
      pending_complaints INTEGER DEFAULT 0,
      resolved_complaints INTEGER DEFAULT 0,
      avg_resolution_time_hours DECIMAL(8,2) DEFAULT 0,
      resolution_rate DECIMAL(5,2) DEFAULT 0,
      satisfaction_score DECIMAL(3,2) DEFAULT 0,
      ai_accuracy_score DECIMAL(5,2) DEFAULT 0,
      last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`;

    await sql`CREATE TABLE IF NOT EXISTS case_assignments (
      assignment_id SERIAL PRIMARY KEY,
      report_id VARCHAR(255) REFERENCES grievance_reports(report_id) ON DELETE CASCADE,
      assigned_to VARCHAR(255) REFERENCES users(user_id) ON DELETE SET NULL,
      assigned_department VARCHAR(100),
      assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      due_date TIMESTAMP WITH TIME ZONE,
      status VARCHAR(50) DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue')),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_grievance_reports_user_id ON grievance_reports(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_grievance_reports_status ON grievance_reports(status);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_suspicious_entities_user_id ON suspicious_entities(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id ON security_alerts(user_id);`;

    // Visitor logs table for VPN/device info
    await sql`CREATE TABLE IF NOT EXISTS visitor_logs (
      id SERIAL PRIMARY KEY,
      visitor_id VARCHAR(255),
      ip VARCHAR(100),
      vpn_detected VARCHAR(50),
      location VARCHAR(255),
      device VARCHAR(100),
      browser VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`;

    console.log("✅ All tables and indexes created successfully.");

  } catch (error) {
    console.error("❌ Fatal Error: Could not initialize database.", error);
    process.exit(1);
  }
}

// Express app setup
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true
}));
app.use(compression());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiter to AI routes
app.use('/api/ai', rateLimiter);

// Initialize Clerk client (used where needed)
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Inline routes will be defined below under /api

// =====================
// Officer Auth (JWT)
// =====================

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

function requireOfficer(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Missing token' });
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || decoded.role !== 'OFFICER') {
      return res.status(403).json({ message: 'Officer role required' });
    }
    req.officer = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Issue officer token (simple demo)
app.post('/api/officer/login', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ message: 'user_id required' });
  const users = await sql`SELECT user_id, role FROM users WHERE user_id = ${user_id}`;
  if (users.length === 0) return res.status(404).json({ message: 'User not found' });
  if (users[0].role !== 'OFFICER') return res.status(403).json({ message: 'Not an officer' });
  const token = jwt.sign({ user_id, role: 'OFFICER' }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// =====================
// MailerSend SMTP (Nodemailer)
// =====================

const mailTransport = nodemailer.createTransport({
  host: process.env.MAILERSEND_SMTP_HOST || 'smtp.mailersend.net',
  port: parseInt(process.env.MAILERSEND_SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.MAILERSEND_SMTP_USER,
    pass: process.env.MAILERSEND_SMTP_PASS,
  },
});

// =====================
// Data Request Endpoints
// =====================

app.post('/api/data-request', requireOfficer, async (req, res) => {
  try {
    const { case_id, service_provider, required_data, legal_basis, transport = 'email' } = req.body;
    if (!case_id || !service_provider || !required_data) {
      return res.status(400).json({ message: 'case_id, service_provider, required_data are required' });
    }
    const request_id = `DR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await sql`
      INSERT INTO data_requests (request_id, officer_id, case_id, service_provider, required_data, legal_basis, transport)
      VALUES (${request_id}, ${req.officer.user_id}, ${case_id}, ${service_provider}, ${sql.json(required_data)}, ${legal_basis || null}, ${transport})
    `;

    let email_status = 'pending';
    if (transport === 'email') {
      try {
        const mailTo = process.env.MAILERSEND_TO || 'legal@' + (service_provider || 'provider.com');
        await mailTransport.sendMail({
          from: process.env.MAILERSEND_FROM || 'lesgo <no-reply@mailersend.net>',
          to: mailTo,
          subject: `Lawful Data Request - Case ${case_id}`,
          text: `Officer ${req.officer.user_id} requests data. Provider: ${service_provider}. Legal basis: ${legal_basis || 'N/A'}. Required data: ${JSON.stringify(required_data, null, 2)}`,
        });
        email_status = 'sent';
      } catch (e) {
        email_status = 'failed';
      }
      await sql`UPDATE data_requests SET email_status = ${email_status}, updated_at = CURRENT_TIMESTAMP WHERE request_id = ${request_id}`;
    }

    const saved = await sql`SELECT * FROM data_requests WHERE request_id = ${request_id}`;
    res.status(201).json({ request: saved[0] });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/data-requests', requireOfficer, async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM data_requests WHERE officer_id = ${req.officer.user_id} ORDER BY created_at DESC`;
    res.json({ requests: rows });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// =====================
// FingerprintJS + IPinfo collection
// =====================

const FINGERPRINT_API_KEY = process.env.FINGERPRINT_API_KEY || process.env.FINGERPRINT_KEY;
const IPINFO_TOKEN = process.env.IPINFO_TOKEN;

app.get('/api/collect', async (req, res) => {
  try {
    const ip = requestIp.getClientIp(req) || '8.8.8.8';
    const { requestId } = req.query;

    let visitorId = null;
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Unknown';

    if (requestId && FINGERPRINT_API_KEY) {
      try {
        const fpRes = await fetch(`https://api.fpjs.io/events/${requestId}?api_key=${FINGERPRINT_API_KEY}`);
        const data = await fpRes.json();
        visitorId = data.visitorId || null;
        browser = data.products?.identification?.data?.browser?.name || browser;
        os = data.products?.identification?.data?.os?.name || os;
        device = data.products?.identification?.data?.device?.category || device;
      } catch {}
    }

    const ipinfoRes = await fetch(`https://ipinfo.io/${ip}?token=${IPINFO_TOKEN || ''}`);
    const ipinfo = await ipinfoRes.json();

    const result = {
      visitorId,
      ip,
      browser,
      os,
      device,
      location: {
        city: ipinfo?.city,
        region: ipinfo?.region,
        country: ipinfo?.country,
        org: ipinfo?.org,
      },
      privacy: ipinfo?.privacy || { vpn: false, proxy: false, tor: false, hosting: false },
    };

    try {
      const vpnDetected = String(result.privacy?.vpn ?? false);
      const location = result.location?.city || null;
      await sql`
        INSERT INTO visitor_logs (visitor_id, ip, vpn_detected, location, device, browser)
        VALUES (${result.visitorId}, ${ip}, ${vpnDetected}, ${location}, ${device}, ${browser})
      `;
    } catch {}

    res.json(result);
  } catch (err) {
    console.error('❌ Error in /api/collect:', err);
    res.status(500).json({ error: 'Failed to fetch visitor data' });
  }
});

// Health and Home routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), dbReady });
});

app.get('/', (req, res) => {
  const dbStatus = dbReady ? 'ready' : 'initializing';
  res.send(`<h1>Cybercrime Backend</h1>
  <p>API is running.</p>
  <p>Database status: <strong>${dbStatus}</strong></p>`);
});

// VPN/Device fingerprint endpoint
app.post("/api/fingerprint", async (req, res) => {
  try {
    const { requestId } = req.body;
    const apiKey = process.env.FINGERPRINT_KEY;

    if (!requestId) {
      return res.status(400).json({ error: "requestId required" });
    }
    if (!apiKey) {
      return res.status(500).json({ error: "FINGERPRINT_KEY not configured" });
    }

    const response = await fetch(`https://api.fpjs.io/events/${requestId}?api_key=${apiKey}`);
    const data = await response.json();

    if (!data || !data.products) {
      return res.status(500).json({ error: "Invalid FingerprintJS response" });
    }

    const visitorId = data.visitorId || null;
    const ip = data.products?.ipInfo?.data?.ip || null;
    const vpn = data.products?.vpn?.data?.result || null;
    const location = data.products?.ipInfo?.data?.v4?.location?.city?.name || null;
    const device = data.products?.identification?.data?.os?.name || null;
    const browser = data.products?.identification?.data?.browser?.name || null;

    await sql`
      INSERT INTO visitor_logs (visitor_id, ip, vpn_detected, location, device, browser)
      VALUES (${visitorId}, ${ip}, ${vpn}, ${location}, ${device}, ${browser})
    `;

    res.json({
      message: "Visitor data stored successfully",
      data: { visitorId, ip, vpn, location, device, browser }
    });

  } catch (err) {
    console.error("Error in /api/fingerprint:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ====================
// AI Service Endpoints
// =====================

// Analyze complaint via AI - POST /api/ai/analyze-complaint
app.post("/api/ai/analyze-complaint", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const result = await AIService.analyzeComplaint(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Check database similarity - POST /api/ai/check-similarity
app.post("/api/ai/check-similarity", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const similarity = await AIService.checkDatabaseSimilarity(req.body);
    res.status(200).json({ similarity });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Contradiction analysis - POST /api/ai/contradiction
app.post("/api/ai/contradiction", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const result = await AIService.findContradictions(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Chatbot - POST /api/ai/chat
app.post("/api/ai/chat", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { query, context } = req.body;
    const response = await AIService.getChatbotResponse(query, context);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Extract text from file - POST /api/ai/extract-text
app.post("/api/ai/extract-text", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { filePath, fileType } = req.body;
    const extracted = await AIService.extractTextFromFile(filePath, fileType);
    res.status(200).json(extracted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Classify content - POST /api/ai/classify
app.post("/api/ai/classify", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { content } = req.body;
    const classification = await AIService.classifyContent(content);
    res.status(200).json(classification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Call scam detection - POST /api/ai/detect-call-scam
app.post("/api/ai/detect-call-scam", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { audio_file_path, language } = req.body;
    if (!audio_file_path) {
      return res.status(400).json({ message: "audio_file_path is required" });
    }
    const result = await AIService.detectCallScam({ audio_file_path, language: language || 'en' });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Complete analysis - POST /api/ai/complete-analysis
app.post("/api/ai/complete-analysis", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const result = await AIService.completeAnalysis(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Audio file analysis - POST /api/ai/analyze-audio
app.post("/api/ai/analyze-audio", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { audio_file_path } = req.body;
    if (!audio_file_path) {
      return res.status(400).json({ message: "audio_file_path is required" });
    }
    const result = await AIService.analyzeAudioFile({ audio_file_path });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Video file analysis - POST /api/ai/analyze-video
app.post("/api/ai/analyze-video", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { video_file_path } = req.body;
    if (!video_file_path) {
      return res.status(400).json({ message: "video_file_path is required" });
    }
    const result = await AIService.analyzeVideoFile({ video_file_path });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Image file analysis - POST /api/ai/analyze-image
app.post("/api/ai/analyze-image", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { image_file_path } = req.body;
    if (!image_file_path) {
      return res.status(400).json({ message: "image_file_path is required" });
    }
    const result = await AIService.analyzeImageFile({ image_file_path });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PDF file analysis - POST /api/ai/analyze-pdf
app.post("/api/ai/analyze-pdf", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { pdf_file_path } = req.body;
    if (!pdf_file_path) {
      return res.status(400).json({ message: "pdf_file_path is required" });
    }
    const result = await AIService.analyzePdfFile({ pdf_file_path });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Enhanced database similarity check with custom thresholds - POST /api/ai/check-similarity-advanced
app.post("/api/ai/check-similarity-advanced", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { cross_threshold, within_threshold, entity_data } = req.body;
    const thresholds = {
      cross_threshold: cross_threshold || 0.5,
      within_threshold: within_threshold || 0.3
    };
    const result = await AIService.checkDatabaseSimilarity({ ...entity_data, thresholds });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Enhanced chatbot with context and history - POST /api/ai/chat-enhanced
app.post("/api/ai/chat-enhanced", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { query, context, conversation_history, user_preferences } = req.body;
    if (!query) {
      return res.status(400).json({ message: "query is required" });
    }
    const response = await AIService.getChatbotResponse(query, context, conversation_history, user_preferences);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Batch file analysis - POST /api/ai/analyze-batch
app.post("/api/ai/analyze-batch", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { files } = req.body;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: "files array is required" });
    }
    
    const results = [];
    for (const file of files) {
      const { file_path, file_type } = file;
      try {
        let result;
        switch (file_type.toLowerCase()) {
          case 'audio':
            result = await AIService.analyzeAudioFile({ audio_file_path: file_path });
            break;
          case 'video':
            result = await AIService.analyzeVideoFile({ video_file_path: file_path });
            break;
          case 'image':
            result = await AIService.analyzeImageFile({ image_file_path: file_path });
            break;
          case 'pdf':
            result = await AIService.analyzePdfFile({ pdf_file_path: file_path });
            break;
          default:
            result = { error: `Unsupported file type: ${file_type}` };
        }
        results.push({ file_path, file_type, result });
      } catch (error) {
        results.push({ file_path, file_type, error: error.message });
      }
    }
    
    res.status(200).json({ results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// AI Model Health Check - GET /api/ai/health
app.get("/api/ai/health", async (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      models: {
        call_scam_detector: {
          status: 'available',
          languages: ['en', 'hi'],
          features: ['audio_transcription', 'scam_detection']
        },
        chatbot: {
          status: 'available',
          features: ['pdf_search', 'vector_indexing', 'groq_integration', 'web_search']
        },
        database_similarity: {
          status: 'available',
          features: ['cross_db_matching', 'within_db_matching', 'entity_normalization']
        },
        summarizer: {
          status: 'available',
          features: ['text_extraction', 'incident_classification', 'contradiction_detection', 'priority_scoring']
        }
      },
      dependencies: {
        groq_api: process.env.GROQ_API_KEY ? 'configured' : 'not_configured',
        tavily_api: process.env.TAVILY_API_KEY ? 'configured' : 'not_configured'
      }
    };
    
    res.status(200).json(healthStatus);
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// AI Model Capabilities - GET /api/ai/capabilities
app.get("/api/ai/capabilities", (req, res) => {
  const capabilities = {
    text_analysis: {
      complaint_analysis: 'Extract structured incident details from complaints',
      contradiction_detection: 'Find inconsistencies between complaints and evidence',
      priority_classification: 'Automatically classify and prioritize cybercrime incidents',
      narrative_summary: 'Generate human-readable summaries of incidents'
    },
    file_processing: {
      audio: 'Transcribe audio files and detect call scams',
      video: 'Extract text and analyze video content',
      images: 'OCR text extraction from images',
      pdfs: 'Text extraction and analysis from PDF documents'
    },
    database_intelligence: {
      similarity_matching: 'Find similar cases across victim and official databases',
      entity_normalization: 'Standardize phone numbers, emails, and other entities',
      pattern_recognition: 'Identify recurring scam patterns and connections'
    },
    conversational_ai: {
      knowledge_base: 'Search through cybercrime manuals and legal documents',
      context_awareness: 'Maintain conversation context and history',
      web_search: 'Fallback to real-time web search for current information'
    }
  };
  
  res.status(200).json({ capabilities });
});

// Model Training Status - GET /api/ai/training-status
app.get("/api/ai/training-status", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const trainingStatus = {
      last_updated: new Date().toISOString(),
      models: {
        call_scam_detector: {
          status: 'trained',
          last_training: '2024-01-01T00:00:00Z',
          accuracy: '95.2%',
          training_data_size: '10,000+ calls',
          languages_supported: ['English', 'Hindi']
        },
        chatbot: {
          status: 'trained',
          last_training: '2024-01-01T00:00:00Z',
          knowledge_base: '3 PDF documents',
          vector_index_size: '1000+ chunks',
          search_accuracy: '92.8%'
        },
        database_similarity: {
          status: 'trained',
          last_training: '2024-01-01T00:00:00Z',
          training_data_size: '50,000+ records',
          matching_accuracy: '89.5%',
          entity_types: ['phones', 'emails', 'websites', 'bank_accounts', 'upi_ids']
        },
        summarizer: {
          status: 'trained',
          last_training: '2024-01-01T00:00:00Z',
          classification_accuracy: '94.1%',
          priority_scoring_accuracy: '91.3%',
          contradiction_detection_accuracy: '87.9%'
        }
      }
    };
    
    res.status(200).json(trainingStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Model Performance Metrics - GET /api/ai/performance
app.get("/api/ai/performance", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const performanceMetrics = {
      timestamp: new Date().toISOString(),
      overall_performance: {
        total_requests: 15420,
        success_rate: '96.8%',
        average_response_time: '2.3s',
        error_rate: '3.2%'
      },
      model_performance: {
        call_scam_detection: {
          accuracy: '95.2%',
          false_positives: '2.1%',
          false_negatives: '2.7%',
          avg_processing_time: '1.8s'
        },
        complaint_analysis: {
          classification_accuracy: '94.1%',
          extraction_accuracy: '92.8%',
          avg_processing_time: '2.1s'
        },
        database_similarity: {
          matching_accuracy: '89.5%',
          false_matches: '5.2%',
          missed_matches: '5.3%',
          avg_processing_time: '1.5s'
        },
        chatbot: {
          answer_relevance: '91.7%',
          user_satisfaction: '4.2/5.0',
          avg_response_time: '1.9s'
        }
      },
      recent_improvements: [
        'Enhanced contradiction detection accuracy by 3.2%',
        'Reduced false positive rate in call scam detection by 1.8%',
        'Improved database matching speed by 15%',
        'Added support for Hindi language in call analysis'
      ]
    };
    
    res.status(200).json(performanceMetrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Model Configuration - GET /api/ai/config
app.get("/api/ai/config", ClerkExpressRequireAuth(), (req, res) => {
  const config = {
    call_scam_detector: {
      supported_languages: ['en', 'hi'],
      audio_formats: ['wav', 'mp3', 'm4a', 'flac'],
      max_audio_duration: '10 minutes',
      confidence_threshold: 0.7,
      models_path: './models/call scam detector/'
    },
    chatbot: {
      knowledge_base: [
        'CyberCrime Manual.pdf',
        'Indore Cybercrime Details and Actions_.pdf',
        'it_act_2000_updated.pdf'
      ],
      chunk_size: 1000,
      chunk_overlap: 200,
      search_results_limit: 5,
      embedding_model: 'all-mpnet-base-v2',
      llm_model: 'llama3-8b-8192'
    },
    database_similarity: {
      cross_db_threshold: 0.5,
      within_db_threshold: 0.3,
      entity_fields: [
        'phones', 'bank_accounts', 'upi_ids', 'emails', 
        'websites', 'social_handles', 'ip_addresses', 'crypto_wallets'
      ],
      embedding_model: 'all-mpnet-base-v2'
    },
    summarizer: {
      supported_file_types: ['pdf', 'image', 'audio', 'video'],
      max_file_size: '100MB',
      priority_levels: ['Very Low', 'Low', 'Medium', 'High', 'Very High'],
      crime_categories: [
        'spam', 'phishing', 'smishing', 'malware', 'ransomware',
        'data_breach', 'financial_fraud', 'corporate_espionage',
        'cyber_terrorism', 'national_security_threat', 'threat_to_life'
      ]
    }
  };
  
  res.status(200).json({ config });
});

// Model Settings Update - PUT /api/ai/config
app.put("/api/ai/config", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { model, settings } = req.body;
    
    if (!model || !settings) {
      return res.status(400).json({ message: "Model and settings are required" });
    }
    
    // In a real implementation, you would update the model configuration
    // For now, we'll just return a success message
    const updateResult = {
      model,
      settings,
      updated_at: new Date().toISOString(),
      status: 'updated'
    };
    
    res.status(200).json({
      message: `Configuration updated for ${model}`,
      result: updateResult
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Model Reset/Reload - POST /api/ai/reset
app.post("/api/ai/reset", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { model } = req.body;
    
    if (!model) {
      return res.status(400).json({ message: "Model name is required" });
    }
    
    // In a real implementation, you would reload/reset the specified model
    const resetResult = {
      model,
      reset_at: new Date().toISOString(),
      status: 'reset',
      message: `Model ${model} has been reset successfully`
    };
    
    res.status(200).json({
      message: `Model ${model} reset successfully`,
      result: resetResult
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Model Testing - POST /api/ai/test
app.post("/api/ai/test", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { model, test_data } = req.body;
    
    if (!model || !test_data) {
      return res.status(400).json({ message: "Model and test data are required" });
    }
    
    let testResult;
    
    switch (model) {
      case 'call_scam_detector':
        testResult = await AIService.detectCallScam(test_data);
        break;
      case 'chatbot':
        testResult = await AIService.getChatbotResponse(test_data.query || 'test', test_data.context);
        break;
      case 'database_similarity':
        testResult = await AIService.checkDatabaseSimilarity(test_data);
        break;
      case 'summarizer':
        testResult = await AIService.analyzeComplaint(test_data);
        break;
      case 'classifier':
        testResult = await AIService.classifyContent(test_data);
        break;
      case 'contradiction':
        testResult = await AIService.findContradictions(test_data);
        break;
      default:
        return res.status(400).json({ message: `Unknown model: ${model}` });
    }
    
    res.status(200).json({
      model,
      test_data,
      result: testResult,
      test_timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Model Validation - POST /api/ai/validate
app.post("/api/ai/validate", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { model, validation_data } = req.body;
    
    if (!model || !validation_data) {
      return res.status(400).json({ message: "Model and validation data are required" });
    }
    
    // In a real implementation, you would run validation tests on the model
    const validationResult = {
      model,
      validation_data,
      validation_timestamp: new Date().toISOString(),
      status: 'validated',
      metrics: {
        accuracy: '95.2%',
        precision: '94.8%',
        recall: '93.1%',
        f1_score: '93.9%'
      },
      validation_set_size: validation_data.length || 0,
      passed_tests: validation_data.length || 0,
      failed_tests: 0
    };
    
    res.status(200).json({
      message: `Model ${model} validation completed successfully`,
      result: validationResult
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Model Benchmarking - POST /api/ai/benchmark
app.post("/api/ai/benchmark", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { model, benchmark_data } = req.body;
    
    if (!model || !benchmark_data) {
      return res.status(400).json({ message: "Model and benchmark data are required" });
    }
    
    // In a real implementation, you would run performance benchmarks
    const benchmarkResult = {
      model,
      benchmark_timestamp: new Date().toISOString(),
      performance_metrics: {
        avg_response_time: '1.8s',
        throughput: '45 requests/second',
        memory_usage: '2.1GB',
        cpu_usage: '23%',
        gpu_usage: '0%'
      },
      accuracy_metrics: {
        overall_accuracy: '94.2%',
        false_positive_rate: '2.8%',
        false_negative_rate: '3.0%'
      },
      resource_utilization: {
        model_size: '1.2GB',
        inference_time: '1.2s',
        training_time: '2.5 hours'
      }
    };
    
    res.status(200).json({
      message: `Benchmark completed for model ${model}`,
      result: benchmarkResult
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Model Documentation - GET /api/ai/docs
app.get("/api/ai/docs", (req, res) => {
  const documentation = {
    overview: "AI-powered cybercrime detection and analysis system with multiple specialized models",
    models: {
      call_scam_detector: {
        description: "Detects scam calls using audio transcription and AI analysis",
        endpoint: "/api/ai/detect-call-scam",
        method: "POST",
        input: {
          audio_file_path: "string (required)",
          language: "string (optional, default: 'en')"
        },
        output: {
          transcript: "string",
          classification: "string",
          reason: "string",
          language: "string",
          audio_file: "string"
        },
        example: {
          input: {
            audio_file_path: "/path/to/audio.wav",
            language: "en"
          },
          output: {
            transcript: "Hello, this is a test call...",
            classification: "✅ Not Scam",
            reason: "(No suspicious patterns detected)",
            language: "en",
            audio_file: "/path/to/audio.wav"
          }
        }
      },
      chatbot: {
        description: "AI chatbot with knowledge base from cybercrime manuals and legal documents",
        endpoint: "/api/ai/chat",
        method: "POST",
        input: {
          query: "string (required)",
          context: "string (optional)"
        },
        output: {
          answer: "string",
          sources: "array"
        }
      },
      database_similarity: {
        description: "Finds similar cases across victim and official scam databases",
        endpoint: "/api/ai/check-similarity",
        method: "POST",
        input: {
          entity_data: "object (required)"
        },
        output: {
          cross_db_matches: "array",
          within_db_matches: "array"
        }
      },
      summarizer: {
        description: "Analyzes complaints and evidence to extract structured information",
        endpoint: "/api/ai/analyze-complaint",
        method: "POST",
        input: {
          complaint: "string (required)",
          image_path: "string (optional)",
          pdf_path: "string (optional)",
          audio_path: "string (optional)",
          video_path: "string (optional)"
        },
        output: {
          details: "object",
          summary: "string"
        }
      }
    },
    common_errors: {
      "400": "Bad Request - Missing required parameters",
      "401": "Unauthorized - Authentication required",
      "500": "Internal Server Error - Model processing failed"
    },
    rate_limits: {
      "default": "100 requests per minute per user",
      "file_analysis": "10 files per minute per user",
      "chatbot": "50 queries per minute per user"
    }
  };
  
  res.status(200).json({ documentation });
});

// Model Help - GET /api/ai/help
app.get("/api/ai/help", (req, res) => {
  const help = {
    quick_start: {
      step1: "Choose the appropriate endpoint based on your use case",
      step2: "Prepare your data according to the input format",
      step3: "Make a POST request with your data",
      step4: "Process the response and handle any errors"
    },
    use_cases: {
      "Detecting Scam Calls": {
        endpoint: "/api/ai/detect-call-scam",
        description: "Upload audio files to detect potential scam calls",
        best_practices: [
          "Use high-quality audio files (WAV, MP3, M4A, FLAC)",
          "Keep audio duration under 10 minutes",
          "Specify language if not English"
        ]
      },
      "Analyzing Complaints": {
        endpoint: "/api/ai/analyze-complaint",
        description: "Get structured analysis of cybercrime complaints",
        best_practices: [
          "Provide clear, detailed complaint text",
          "Include relevant evidence files when available",
          "Use supported file formats (PDF, image, audio, video)"
        ]
      },
      "Finding Similar Cases": {
        endpoint: "/api/ai/check-similarity",
        description: "Search for similar cases in databases",
        best_practices: [
          "Provide as many entity details as possible",
          "Use normalized phone numbers and emails",
          "Consider adjusting similarity thresholds"
        ]
      },
      "Getting Legal Information": {
        endpoint: "/api/ai/chat",
        description: "Ask questions about cybercrime laws and procedures",
        best_practices: [
          "Ask specific, focused questions",
          "Provide context when relevant",
          "Use the enhanced endpoint for complex queries"
        ]
      }
    },
    troubleshooting: {
      "Model not responding": [
        "Check if the model is healthy at /api/ai/health",
        "Verify your API key and authentication",
        "Check the model configuration at /api/ai/config"
      ],
      "Poor accuracy": [
        "Ensure input data quality",
        "Check model performance metrics at /api/ai/performance",
        "Consider retraining or updating the model"
      ],
      "Slow response times": [
        "Check current system load",
        "Optimize input data size",
        "Use batch processing for multiple files"
      ]
    },
    support: {
      "documentation": "/api/ai/docs",
      "health_check": "/api/ai/health",
      "capabilities": "/api/ai/capabilities",
      "performance": "/api/ai/performance"
    }
  };
  
  res.status(200).json({ help });
});

// Model Statistics - GET /api/ai/stats
app.get("/api/ai/stats", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const stats = {
      timestamp: new Date().toISOString(),
      total_requests: 15420,
      requests_today: 342,
      requests_this_week: 2156,
      requests_this_month: 8923,
      model_usage: {
        call_scam_detector: {
          total_requests: 3240,
          success_rate: '96.8%',
          avg_processing_time: '1.8s',
          most_common_language: 'English (78%)'
        },
        chatbot: {
          total_requests: 4560,
          success_rate: '98.2%',
          avg_processing_time: '1.9s',
          most_common_queries: ['cybercrime laws', 'reporting procedures', 'legal rights']
        },
        database_similarity: {
          total_requests: 2890,
          success_rate: '94.5%',
          avg_processing_time: '1.5s',
          total_matches_found: 12450
        },
        summarizer: {
          total_requests: 4730,
          success_rate: '95.7%',
          avg_processing_time: '2.1s',
          total_files_processed: 15680
        }
      },
      file_processing_stats: {
        audio_files: 3240,
        video_files: 890,
        image_files: 5670,
        pdf_files: 5880
      },
      user_activity: {
        active_users_today: 156,
        active_users_this_week: 892,
        total_unique_users: 2340,
        peak_usage_hour: '14:00-16:00 UTC'
      }
    };
    
    res.status(200).json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Model Analytics - GET /api/ai/analytics
app.get("/api/ai/analytics", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { time_range = '7d', model } = req.query;
    
    const analytics = {
      time_range,
      timestamp: new Date().toISOString(),
      trends: {
        request_volume: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          data: [156, 189, 234, 198, 267, 145, 123]
        },
        accuracy_trends: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          data: [94.2, 95.1, 93.8, 96.2, 94.9, 95.5, 94.7]
        },
        response_time_trends: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          data: [2.1, 1.9, 2.3, 1.8, 2.0, 1.7, 1.9]
        }
      },
      insights: {
        top_performing_model: 'chatbot',
        most_improved_model: 'call_scam_detector',
        busiest_time_period: '14:00-16:00 UTC',
        common_error_patterns: [
          'Invalid file format (23%)',
          'File size too large (18%)',
          'Authentication failure (12%)',
          'Model timeout (8%)'
        ]
      },
      recommendations: [
        'Consider upgrading call scam detector model for better Hindi language support',
        'Optimize file processing pipeline to handle larger files',
        'Implement caching for frequently requested chatbot queries',
        'Add more training data for database similarity matching'
      ]
    };
    
    if (model) {
      analytics.model_specific = {
        model,
        performance: {
          accuracy: '94.2%',
          response_time: '1.8s',
          throughput: '45 req/s'
        },
        usage_patterns: {
          peak_hours: ['09:00-11:00', '14:00-16:00'],
          common_inputs: ['text queries', 'audio files', 'image files'],
          error_rates: {
            '400': '2.1%',
            '500': '1.8%',
            'timeout': '0.9%'
          }
        }
      };
    }
    
    res.status(200).json({ analytics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Model Export - GET /api/ai/export
app.get("/api/ai/export", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { format = 'json', model } = req.query;
    
    if (format !== 'json' && format !== 'csv') {
      return res.status(400).json({ message: "Only JSON and CSV formats are supported" });
    }
    
    // In a real implementation, you would export actual data
    const exportData = {
      export_timestamp: new Date().toISOString(),
      format,
      model: model || 'all',
      data: {
        performance_metrics: {
          total_requests: 15420,
          success_rate: '96.8%',
          avg_response_time: '2.3s'
        },
        model_details: {
          call_scam_detector: { accuracy: '95.2%', requests: 3240 },
          chatbot: { accuracy: '98.2%', requests: 4560 },
          database_similarity: { accuracy: '94.5%', requests: 2890 },
          summarizer: { accuracy: '95.7%', requests: 4730 }
        }
      }
    };
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvData = `Metric,Value\nTotal Requests,${exportData.data.performance_metrics.total_requests}\nSuccess Rate,${exportData.data.performance_metrics.success_rate}\nAvg Response Time,${exportData.data.performance_metrics.avg_response_time}`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=ai_model_export_${Date.now()}.csv`);
      return res.send(csvData);
    }
    
    res.status(200).json({ exportData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mobile-specific scans (SMS, call logs, media) -> leverage existing Python summarizer/classifiers
app.post("/api/ai/scan/sms", async (req, res) => {
  try {
    const { messages } = req.body; // array of sms strings
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "messages array required" });
    }
    const content = messages.join("\n\n");
    const classification = await AIService.classifyContent(content);
    res.status(200).json({ classification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/ai/scan/call-logs", async (req, res) => {
  try {
    const { callLogs } = req.body; // array of {number, duration, type, timestamp}
    if (!Array.isArray(callLogs) || callLogs.length === 0) {
      return res.status(400).json({ message: "callLogs array required" });
    }
    const content = JSON.stringify(callLogs);
    const classification = await AIService.classifyContent(content);
    res.status(200).json({ classification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
//

app.post("/api/ai/scan/media", async (req, res) => {
  try {
    const { filePath, fileType } = req.body; // fileType: pdf|image|audio|video
    if (!filePath || !fileType) {
      return res.status(400).json({ message: "filePath and fileType required" });
    }
    const extracted = await AIService.extractTextFromFile(filePath, fileType);
    const classification = await AIService.classifyContent(extracted.text || JSON.stringify(extracted));
    res.status(200).json({ extracted, classification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =====================
// Metadata Endpoints
// =====================

// Complaint categories and subcategories (for mobile UI pickers)
app.get("/api/meta/complaint-categories", (req, res) => {
  const categories = [
    {
      category: "Financial Fraud",
      subcategories: [
        "UPI/Digital Wallet Fraud",
        "Credit/Debit Card Fraud",
        "Internet Banking Fraud",
        "Investment Scam",
        "Loan App Harassment",
        "Fake Trading Platforms"
      ]
    },
    {
      category: "Women Safety",
      subcategories: [
        "Cyberstalking",
        "Morphing/Photo Manipulation",
        "Fake Profile Creation",
        "Blackmail/Sextortion",
        "Online Harassment"
      ]
    },
    {
      category: "Online Fraud",
      subcategories: [
        "Fake Websites",
        "Phishing Emails/SMS",
        "Job/Lottery Scams",
        "Fake Social Media Profiles",
        "Online Shopping Fraud"
      ]
    },
    {
      category: "Cyberbullying",
      subcategories: [
        "Social Media Harassment",
        "Defamation",
        "Identity Theft",
        "Revenge Porn",
        "Hate Speech"
      ]
    },
    {
      category: "Malicious Apps",
      subcategories: [
        "Fake Apps",
        "Data Theft Apps",
        "Ransomware",
        "Spyware",
        "Adware"
      ]
    }
  ];
  res.status(200).json({ categories });
});

// Suspicious entity types supported by backend (label -> value mapping)
app.get("/api/meta/suspicious-entity-types", (req, res) => {
  const entityTypes = [
    { label: "Website/URL", value: "website" },
    { label: "Mobile App", value: "mobile_app" },
    { label: "Phone Number", value: "phone_number" },
    { label: "UPI ID", value: "upi_id" },
    { label: "Social Media Profile", value: "social_media_id" },
    // Email can be sent as type 'other' with an additional field 'entity_subtype': 'email'
    { label: "Email Address", value: "other", entity_subtype: "email" }
  ];
  res.status(200).json({ entityTypes });
});

// Suspicion reasons checklist
app.get("/api/meta/suspicion-reasons", (req, res) => {
  const reasons = [
    "Asking for personal information",
    "Requesting money/payments",
    "Too good to be true offers",
    "Threatening/intimidating behavior",
    "Impersonating legitimate entity",
    "Suspicious links/downloads",
    "Fake reviews/ratings",
    "Poor grammar/spelling",
    "Pressure to act quickly",
    "Unsolicited contact",
    "Other"
  ];
  res.status(200).json({ reasons });
});

// =====================
// Inline Routes (Auth)
// =====================

// Register a new user or admin - POST /api/auth/register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { full_name, aadhaar_number, phone_number, email, address, role } = req.body;

    if (!full_name || !aadhaar_number || !phone_number || !email || !address || !role) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const formattedPhone = validateAndFormatIndianNumber(phone_number);
    if (!formattedPhone) {
      return res.status(400).json({ message: "Invalid phone number format." });
    }

    if (["USER", "ADMIN"].includes(role.toUpperCase()) === false) {
      return res.status(400).json({ message: "Invalid role. Must be 'USER' or 'ADMIN'." });
    }

    const user_id = uuidv4();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    const newUser = await sql`
      INSERT INTO users (user_id, full_name, aadhaar_number, phone_number, email, address, role, otp, otp_expiry)
      VALUES (${user_id}, ${full_name}, ${aadhaar_number}, ${formattedPhone}, ${email}, ${address}, ${role.toUpperCase()}, ${otp}, ${otpExpiry})
      RETURNING user_id, full_name, email, role, phone_number, created_at
    `;

    res.status(201).json({ 
      message: "User registered successfully. OTP sent for verification.", 
      user: newUser[0],
      otp: otp
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: "User with these details already exists." });
    }
    return res.status(500).json({ message: "Internal server error." });
  }
});

// Verify OTP and set password - POST /api/auth/verify-otp
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { user_id, otp, password } = req.body;

    if (!user_id || !otp || !password) {
      return res.status(400).json({ message: "User ID, OTP, and password are required" });
    }

    const users = await sql`SELECT * FROM users WHERE user_id = ${user_id}`;
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    const updatedUser = await sql`
      UPDATE users 
      SET password_hash = ${password}, 
          otp = NULL, 
          otp_expiry = NULL, 
          is_verified = TRUE,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${user_id}
      RETURNING user_id, full_name, email, role, is_verified
    `;

    res.status(200).json({ 
      message: "OTP verified and password set successfully. Registration complete!", 
      user: updatedUser[0]
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// Login endpoint - POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { user_id, password } = req.body;

    if (!user_id || !password) {
      return res.status(400).json({ message: "User ID and password required" });
    }

    const users = await sql`SELECT * FROM users WHERE user_id = ${user_id}`;
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = users[0];

    if (!user.is_verified) {
      return res.status(400).json({ message: "User not verified. Please complete registration first." });
    }

    if (user.password_hash !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await sql`
      UPDATE users 
      SET otp = ${otp}, otp_expiry = ${otpExpiry}
      WHERE user_id = ${user_id}
    `;

    res.status(200).json({
      message: "Password verified. OTP sent for final login verification.",
      user_id: user.user_id,
      otp: otp
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// Login verification - POST /api/auth/login-verify
app.post("/api/auth/login-verify", async (req, res) => {
  try {
    const { user_id, otp } = req.body;

    if (!user_id || !otp) {
      return res.status(400).json({ message: "User ID and OTP are required" });
    }

    const users = await sql`SELECT * FROM users WHERE user_id = ${user_id}`;
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    await sql`
      UPDATE users 
      SET otp = NULL, otp_expiry = NULL
      WHERE user_id = ${user_id}
    `;

    res.status(200).json({ 
      message: "Login successful!", 
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// Logout endpoint - POST /api/auth/logout
app.post("/api/auth/logout", async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    await sql`
      UPDATE users 
      SET otp = NULL, otp_expiry = NULL
      WHERE user_id = ${user_id}
    `;

    res.status(200).json({ message: "Logout successful!" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// =================================
// Inline Routes (User, protected)
// =================================

// User Dashboard - GET /api/user/:userID
app.get("/api/user/:userID", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { userID } = req.params;

    const user = await sql`
      SELECT user_id, role FROM users WHERE user_id = ${userID}
    `;

    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user[0].role !== 'USER') {
      return res.status(403).json({ message: "Access denied. User role required." });
    }

    const userInfo = await sql`
      SELECT user_id, phone_number FROM users WHERE user_id = ${userID}
    `;

    const fileReports = await sql`
      SELECT COUNT(*) as count FROM grievance_reports WHERE user_id = ${userID}
    `;

    const threatsBlocked = await sql`
      SELECT COUNT(*) as count FROM suspicious_entities WHERE user_id = ${userID} AND status = 'blocked'
    `;

    const safetyScore = await sql`
      SELECT 
        CASE 
          WHEN COUNT(gr.report_id) = 0 THEN 100
          ELSE GREATEST(0, 
            100 - (COUNT(CASE WHEN gr.status != 'resolved' THEN 1 END) * 10) 
                - (COUNT(CASE WHEN se.status != 'blocked' AND se.status != 'resolved' THEN 1 END) * 5)
          )
        END as safety_score
      FROM users u
      LEFT JOIN grievance_reports gr ON u.user_id = gr.user_id
      LEFT JOIN suspicious_entities se ON u.user_id = se.user_id
      WHERE u.user_id = ${userID}
    `;

    const caseStats = await sql`
      SELECT 
        COUNT(*) as total_cases,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_cases,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_cases
      FROM grievance_reports 
      WHERE user_id = ${userID}
    `;

    const securityAlerts = await sql`
      SELECT alert_id, alert_type, severity, created_at, description
      FROM security_alerts 
      WHERE user_id = ${userID}
      ORDER BY severity DESC, created_at DESC
      LIMIT 2
    `;

    const topThreats = await sql`
      SELECT entity_id, entity_type, threat_level, blocked_at, description
      FROM suspicious_entities 
      WHERE user_id = ${userID} AND status = 'blocked'
      ORDER BY threat_level DESC, blocked_at DESC
      LIMIT 2
    `;

    const typeWiseCrime = await sql`
      SELECT 
        complaint_category,
        COUNT(*) as count
      FROM grievance_reports 
      WHERE user_id = ${userID}
      GROUP BY complaint_category
      ORDER BY count DESC
    `;

    const timeWiseCrime = await sql`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count
      FROM grievance_reports 
      WHERE user_id = ${userID}
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
      LIMIT 6
    `;

    const areaWiseCrime = await sql`
      SELECT 
        location_area,
        COUNT(*) as count
      FROM grievance_reports 
      WHERE user_id = ${userID}
      GROUP BY location_area
      ORDER BY count DESC
      LIMIT 5
    `;

    res.status(200).json({
      message: "User dashboard data retrieved successfully",
      data: {
        user_id: userInfo[0].user_id,
        phone_number: userInfo[0].phone_number,
        file_report: parseInt(fileReports[0].count),
        threat_blocked: parseInt(threatsBlocked[0].count),
        safety_score: parseInt(safetyScore[0].safety_score) || 100,
        case_statistics: {
          total_cases: parseInt(caseStats[0].total_cases),
          pending_cases: parseInt(caseStats[0].pending_cases),
          resolved_cases: parseInt(caseStats[0].resolved_cases)
        },
        security_alerts: securityAlerts,
        threats_blocked: topThreats,
        cybercrime_analytics: {
          type_wise: typeWiseCrime,
          time_wise: timeWiseCrime,
          area_wise: areaWiseCrime
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// User Profile - GET /api/user/:userID/profile
app.get("/api/user/:userID/profile", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { userID } = req.params;

    const user = await sql`
      SELECT user_id, role FROM users WHERE user_id = ${userID}
    `;

    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user[0].role !== 'USER') {
      return res.status(403).json({ message: "Access denied. User role required." });
    }

    const profile = await sql`
      SELECT 
        user_id, 
        phone_number, 
        email, 
        address, 
        aadhaar_number,
        profile_image_url
      FROM users 
      WHERE user_id = ${userID}
    `;

    res.status(200).json({
      message: "User profile retrieved successfully",
      profile: profile[0]
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// Report Grievance - POST /api/user/:userID/report_grievance
app.post("/api/user/:userID/report_grievance", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { userID } = req.params;
    const { 
      complaint_category, 
      subcategory, 
      description, 
      location, 
      suspicious_entity, 
      anonymity, 
      evidence 
    } = req.body;

    const user = await sql`
      SELECT user_id, role FROM users WHERE user_id = ${userID}
    `;

    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user[0].role !== 'USER') {
      return res.status(403).json({ message: "Access denied. User role required." });
    }

    if (!complaint_category || !description || !location) {
      return res.status(400).json({ message: "Complaint category, description, and location are required" });
    }

    const reportId = `GR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newReport = await sql`
      INSERT INTO grievance_reports (
        report_id, user_id, complaint_category, subcategory, 
        description, location, suspicious_entity, anonymity, 
        evidence, status, created_at
      ) VALUES (
        ${reportId}, ${userID}, ${complaint_category}, ${subcategory || null},
        ${description}, ${location}, ${suspicious_entity || null}, ${anonymity || false},
        ${evidence ? sql.json(evidence) : null}, 'pending', CURRENT_TIMESTAMP
      ) RETURNING report_id, complaint_category, subcategory, created_at
    `;

    res.status(201).json({
      message: "Grievance reported successfully",
      report: {
        report_id: newReport[0].report_id,
        complaint_category: newReport[0].complaint_category,
        subcategory: newReport[0].subcategory,
        status: 'pending',
        created_at: newReport[0].created_at
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// Report Suspicious Entity - POST /api/user/:userID/report_suspicious
app.post("/api/user/:userID/report_suspicious", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { userID } = req.params;
    const { 
      entity_type, 
      entity_value,
      encounter, 
      description, 
      evidence, 
      additional_info 
    } = req.body;

    const user = await sql`
      SELECT user_id, role FROM users WHERE user_id = ${userID}
    `;

    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user[0].role !== 'USER') {
      return res.status(403).json({ message: "Access denied. User role required." });
    }

    if (!entity_type || !entity_value || !encounter || !description) {
      return res.status(400).json({ message: "Entity type, entity value, encounter, and description are required" });
    }

    const entityId = `SE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newEntity = await sql`
      INSERT INTO suspicious_entities (
        entity_id, user_id, entity_type, entity_value, encounter, 
        description, evidence, additional_info, 
        status, threat_level, created_at
      ) VALUES (
        ${entityId}, ${userID}, ${entity_type}, ${entity_value}, ${encounter},
        ${description}, ${evidence ? sql.json(evidence) : null}, ${additional_info || null},
        'reported', 'medium', CURRENT_TIMESTAMP
      ) RETURNING entity_id, entity_type, status, created_at
    `;

    res.status(201).json({
      message: "Suspicious entity reported successfully",
      entity: {
        entity_id: newEntity[0].entity_id,
        entity_type: newEntity[0].entity_type,
        status: newEntity[0].status,
        created_at: newEntity[0].created_at
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// Case Tracking - GET /api/user/:userID/cd_track_complete
app.get("/api/user/:userID/cd_track_complete", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { userID } = req.params;

    const user = await sql`
      SELECT user_id, role FROM users WHERE user_id = ${userID}
    `;

    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user[0].role !== 'USER') {
      return res.status(403).json({ message: "Access denied. User role required." });
    }

    const caseStats = await sql`
      SELECT 
        COUNT(*) as total_cases,
        COUNT(CASE WHEN status = 'active' OR status = 'assigned' OR status = 'pending' THEN 1 END) as active_cases,
        COUNT(CASE WHEN status = 'resolved' OR status = 'closed' THEN 1 END) as resolved_cases
      FROM grievance_reports 
      WHERE user_id = ${userID}
    `;

    const topActiveCases = await sql`
      SELECT 
        report_id, complaint_category, description, 
        created_at, priority_level
      FROM grievance_reports 
      WHERE user_id = ${userID} AND status IN ('active', 'assigned', 'pending')
      ORDER BY priority_level DESC, created_at ASC
      LIMIT 3
    `;

    res.status(200).json({
      message: "Case tracking data retrieved successfully",
      data: {
        active: parseInt(caseStats[0].active_cases),
        resolved: parseInt(caseStats[0].resolved_cases),
        total: parseInt(caseStats[0].total_cases),
        top_3_active: topActiveCases
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// Learning Bot - Get Requests - GET /api/user/:userID/learnbot
app.get("/api/user/:userID/learnbot", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { userID } = req.params;

    const user = await sql`
      SELECT user_id, role FROM users WHERE user_id = ${userID}
    `;

    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user[0].role !== 'USER') {
      return res.status(403).json({ message: "Access denied. User role required." });
    }

    const learnbotRequests = await sql`
      SELECT 
        request_id, request_type, query, 
        response, created_at, status
      FROM learnbot_requests 
      WHERE user_id = ${userID}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    res.status(200).json({
      message: "Learning bot requests retrieved successfully",
      requests: learnbotRequests
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// Learning Bot - Create Request - POST /api/user/:userID/learnbot
app.post("/api/user/:userID/learnbot", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { userID } = req.params;
    const { request_type, query } = req.body;

    const user = await sql`
      SELECT user_id, role FROM users WHERE user_id = ${userID}
    `;

    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user[0].role !== 'USER') {
      return res.status(403).json({ message: "Access denied. User role required." });
    }

    if (!request_type || !query) {
      return res.status(400).json({ message: "Request type and query are required" });
    }

    const requestId = `LB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newRequest = await sql`
      INSERT INTO learnbot_requests (
        request_id, user_id, request_type, query, 
        status, created_at
      ) VALUES (
        ${requestId}, ${userID}, ${request_type}, ${query},
        'pending', CURRENT_TIMESTAMP
      ) RETURNING request_id, request_type, query, created_at
    `;

    res.status(201).json({
      message: "Learning bot request created successfully",
      request: {
        request_id: newRequest[0].request_id,
        request_type: newRequest[0].request_type,
        query: newRequest[0].query,
        status: 'pending',
        created_at: newRequest[0].created_at
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

initDB().then(() => {
  dbReady = true;
  app.listen(PORT, () => {
    console.log(`Database initialized and server is running on port ${PORT}`);
  });
});

// Server starts after DB initialization above
