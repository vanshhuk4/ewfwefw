# CyberGuard Frontend

A modern, interactive Next.js frontend for the Cybercrime Portal backend system.

## 🚀 Features

- **Modern UI/UX**: Clean, responsive design with Tailwind CSS
- **Smooth Animations**: Framer Motion for delightful interactions
- **Real-time Analytics**: Interactive charts and dashboards
- **AI-Powered Tools**: Integrated AI analysis capabilities
- **Role-based Access**: Different interfaces for users and officers
- **Secure Authentication**: JWT-based auth with OTP verification

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast

## 📋 Prerequisites

- Node.js 18+ 
- Backend server running on `http://localhost:5001`

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment**
   ```bash
   # .env.local is already configured for localhost:5001
   # Update NEXT_PUBLIC_API_BASE_URL if your backend runs elsewhere
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

   The frontend will run on `http://localhost:3000`

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # User dashboard
│   │   ├── profile/            # User profile management
│   │   ├── report-grievance/   # Grievance reporting
│   │   ├── report-suspicious/  # Suspicious entity reporting
│   │   ├── ai-tools/           # AI analysis tools
│   │   ├── officer/            # Officer-specific pages
│   │   ├── login/              # Authentication pages
│   │   └── register/
│   ├── components/             # Reusable UI components
│   │   ├── ui/                 # Base UI components
│   │   └── layout/             # Layout components
│   └── lib/                    # Utilities and API client
│       ├── api.ts              # API client with interceptors
│       ├── auth.ts             # Authentication utilities
│       └── utils.ts            # General utilities
```

## 🔐 Authentication Flow

1. **Registration**: User fills form → OTP sent → Verify OTP + set password
2. **Login**: Enter credentials → OTP sent → Verify OTP → Dashboard
3. **Session**: JWT stored in localStorage with auto-refresh
4. **Logout**: Clear session and redirect to login

## 📊 Key Features

### User Features
- **Dashboard**: Personal analytics, charts, recent alerts
- **Profile Management**: Edit personal information
- **Report Grievance**: File cybercrime complaints with evidence upload
- **Report Suspicious**: Report suspicious entities (phones, emails, etc.)
- **AI Tools**: Access to AI analysis capabilities

### Officer Features
- **Data Requests**: Create and manage data requests for investigations
- **Analytics Dashboard**: Comprehensive crime statistics and trends
- **Case Management**: View and manage assigned cases

### AI Tools
- **Complaint Analysis**: AI-powered incident analysis
- **Database Similarity**: Check for similar cases in database
- **Contradiction Detection**: Find inconsistencies in reports
- **AI Chatbot**: Get guidance on cybercrime laws and procedures
- **File Analysis**: Extract text from audio, video, images, PDFs

## 🎨 Design System

- **Colors**: Blue primary, semantic colors for status
- **Typography**: Inter font with proper hierarchy
- **Spacing**: 8px grid system
- **Components**: Consistent, accessible UI components
- **Animations**: Subtle, purposeful motion design

## 🔧 API Integration

All API calls are handled through the centralized API client (`/lib/api.ts`) with:

- **Automatic token injection**
- **Error handling and user feedback**
- **Request/response interceptors**
- **Loading states management**

## 📱 Responsive Design

- **Mobile-first**: Optimized for all screen sizes
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Touch-friendly**: Proper touch targets and gestures

## 🚨 Error Handling

- **Global error boundaries**
- **API error interceptors**
- **User-friendly error messages**
- **Automatic retry mechanisms**

## 🔒 Security

- **JWT token management**
- **Automatic logout on token expiry**
- **Role-based route protection**
- **Input validation and sanitization**

## 📈 Performance

- **Code splitting**: Automatic route-based splitting
- **Image optimization**: Next.js Image component
- **Bundle analysis**: Built-in bundle analyzer
- **Caching**: Efficient API response caching

## 🧪 Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 🚀 Deployment

The frontend can be deployed to any platform that supports Next.js:

- **Vercel** (recommended)
- **Netlify**
- **AWS Amplify**
- **Docker containers**

## 📝 Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:5001
```

## 🤝 Contributing

1. Follow the existing code structure
2. Use TypeScript for type safety
3. Follow the component naming conventions
4. Add proper error handling
5. Test on multiple screen sizes

## 📄 License

MIT License - see LICENSE file for details