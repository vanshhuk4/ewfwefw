# Cybercrime Portal Backend

A comprehensive backend system for managing cybercrime reports with AI-powered analysis capabilities.

## 🚀 Quick Setup

### Prerequisites
- Node.js 18+ (recommended) or 16+
- PostgreSQL database
- Python 3.8+ (for AI features)
- FFmpeg (for media processing)

### Installation

1. **Install Node.js dependencies**
   ```bash
   npm install
   ```

2. **Install Python dependencies (for AI features)**
   ```bash
   # Install all AI model dependencies
   pip install -r src/models/summarizer/requirements.txt
   pip install -r src/models/database_similarity/requirements.txt
   pip install -r src/models/chatbot/requirements.txt
   pip install -r src/models/call\ scam\ detector/requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env with your actual values
   ```

4. **Start the server**
   ```bash
   npm start
   ```

   The server will run on `http://localhost:5001`

## 📋 Environment Variables

Copy `env.example` to `.env` and fill in your values:

- `DATABASE_URL` - PostgreSQL connection string
- `CLERK_PUBLISHABLE_KEY` - Clerk authentication public key
- `CLERK_SECRET_KEY` - Clerk authentication secret key
- `UPSTASH_REDIS_REST_URL` - Upstash Redis URL for rate limiting
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token
- `FINGERPRINT_KEY` - FingerprintJS secret key
- `IPINFO_TOKEN` - IPInfo API token
- `JWT_SECRET` - Secret key for JWT tokens
- `MAILERSEND_SMTP_USER` - MailerSend SMTP username
- `MAILERSEND_SMTP_PASS` - MailerSend SMTP password
- `MAILERSEND_SMTP_HOST` - SMTP host (smtp.mailersend.net)
- `MAILERSEND_SMTP_PORT` - SMTP port (587)
- `MAILERSEND_FROM` - From email address
- `MAILERSEND_TO` - Admin email address
- `GROQ_API_KEY` - Groq API key for AI analysis
- `TAVILY_API_KEY` - Tavily API key for web search

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── config/              # Database and service configs
│   │   ├── db.js           # PostgreSQL connection
│   │   └── upstash.js      # Redis configuration
│   ├── middleware/         # Express middleware
│   │   └── rateLimiter.js  # Rate limiting
│   ├── models/             # AI models (Python)
│   │   ├── summarizer/     # Text summarization
│   │   ├── database_similarity/ # Similarity checking
│   │   ├── chatbot/        # AI chatbot
│   │   └── call scam detector/ # Audio analysis
│   ├── services/           # Business logic
│   │   └── AIService.js    # AI service integration
│   └── server.js           # Main server file
├── package.json            # Dependencies
└── env.example             # Environment template
```

## 🔧 Features

### Core API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/officer/login` - Officer authentication

#### Reports
- `POST /api/reports` - Submit cybercrime report
- `GET /api/reports` - Get reports (with filtering)
- `PUT /api/reports/:id` - Update report
- `DELETE /api/reports/:id` - Delete report

#### AI Analysis
- `POST /api/ai/detect-call-scam` - Analyze audio for scams
- `POST /api/ai/complete-analysis` - Full incident analysis
- `POST /api/ai/analyze-audio` - Audio transcription
- `POST /api/ai/analyze-video` - Video analysis
- `POST /api/ai/analyze-image` - Image text extraction
- `POST /api/ai/analyze-pdf` - PDF text extraction
- `POST /api/ai/check-similarity-advanced` - Database similarity
- `POST /api/ai/chat-enhanced` - AI chatbot

#### Law Enforcement
- `POST /api/data-request` - Create data request
- `GET /api/data-requests` - Get data requests
- `GET /api/admin/dashboard` - Admin dashboard

#### Analytics
- `GET /api/collect` - Collect visitor data

## 🐳 Docker Support

```bash
# Build the Docker image
npm run docker:build

# Run the container
npm run docker:run
```

## 🔍 Health Check

```bash
curl http://localhost:5001/health
```

## 🚨 Troubleshooting

### Common Issues

1. **Port already in use (EADDRINUSE)**
   - Change `PORT` in `.env` file
   - Or kill process using port 5001

2. **Database connection failed**
   - Verify `DATABASE_URL` is correct
   - Ensure PostgreSQL is running
   - Check database permissions

3. **AI features not working**
   - Ensure Python 3.8+ is installed
   - Install Python requirements
   - Verify API keys (Groq/Tavily)

4. **Email not sending**
   - Check MailerSend credentials
   - Verify SMTP settings

### Development Commands

```bash
npm run dev          # Start with nodemon
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run format       # Format code
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
```

## 📝 API Documentation

Once running, visit:
- `http://localhost:5001/api/ai/docs` - AI service docs
- `http://localhost:5001/api/ai/help` - API help

## 📄 License

MIT License

