# ChattyVN - AI English Tutor for Vietnamese Learners 🇻🇳➡️🇺🇸

## Project Overview
**ChattyVN** is an AI-powered English learning application designed specifically for Vietnamese users, built for deployment on Zalo Mini App platform. Inspired by successful language learning apps like Chatty and Duolingo, it combines interactive voice recognition, gamification, and AI conversation to create an engaging learning experience.

## 🌟 Currently Completed Features

### ✅ **Core Application**
- **Interactive Chat Interface**: Vietnamese-focused UI with English learning content
- **Voice Recognition**: Real-time speech recognition for pronunciation practice
- **Text-to-Speech**: Audio pronunciation of English phrases
- **Mobile-Responsive Design**: Optimized for Zalo Mini App mobile experience
- **Gamification Elements**: Stars, streaks, and progress tracking system

### ✅ **API Endpoints**
- `GET /` - Main learning interface with chat-based lessons
- `GET /api/hello` - Health check endpoint
- `GET /api/lesson/daily` - Daily lesson content with Vietnamese instructions
- `POST /api/chat` - AI conversation with pronunciation feedback

### ✅ **Technical Infrastructure**
- **Hono Framework**: Lightweight backend for Cloudflare Workers
- **TypeScript**: Type-safe development
- **Vite Build System**: Fast development and production builds
- **PM2 Process Management**: Reliable service deployment
- **Cloudflare Workers**: Edge deployment ready

## 🌐 URLs

### **Live Application**
- **Production**: https://3000-iadezlws4iozutsxtyqzt-6532622b.e2b.dev
- **API Health**: https://3000-iadezlws4iozutsxtyqzt-6532622b.e2b.dev/api/hello
- **GitHub**: https://github.com/iurii-pavlu/My-AI-English-Teacher

## 🗄️ Data Architecture

### **Data Models**
```typescript
interface Lesson {
  lesson_id: string;
  level: "A2" | "B1" | "B2";
  topic: string;
  intro_vi: string; // Vietnamese instructions
  target_phrases: Phrase[];
}

interface Phrase {
  id: number;
  english: string;
  vietnamese: string;
  phonetic: string;
  difficulty: "easy" | "medium" | "hard";
}

interface ChatResponse {
  response_vi: string; // Vietnamese feedback
  response_en: string; // English model
  feedback: {
    accuracy: number;
    pronunciation_tips: string[];
    stars_earned: number;
  };
}
```

### **Storage Services (Planned)**
- **Cloudflare D1**: User progress, lesson data, phrase mastery
- **Cloudflare KV**: Session data, temporary user states
- **Cloudflare R2**: Audio files, user recordings (if needed)

## 📱 User Guide

### **Getting Started**
1. **Access the App**: Visit the live URL on mobile device
2. **Start Learning**: Begin with daily greetings lesson
3. **Practice Speaking**: Use microphone button for voice input
4. **Get Feedback**: Receive pronunciation tips in Vietnamese
5. **Track Progress**: Earn stars and maintain learning streaks

### **Learning Flow**
1. **Listen** to English phrase with audio pronunciation
2. **Repeat** using voice recognition or text input
3. **Receive Feedback** with accuracy score and tips in Vietnamese
4. **Earn Stars** based on pronunciation accuracy
5. **Build Streaks** by practicing daily

### **Voice Commands**
- **Microphone Button**: Start/stop voice recording
- **Play Button**: Hear correct pronunciation
- **Text Input**: Alternative to voice input
- **Enter Key**: Send message/response

## 🚧 Features Not Yet Implemented

### **🤖 AI Integration**
- [ ] GPT-4 API integration for intelligent conversation
- [ ] Advanced pronunciation analysis
- [ ] Personalized learning paths based on user mistakes
- [ ] Context-aware lesson recommendations

### **🔊 Advanced Voice Features**
- [ ] Google STT API for better Vietnamese+English recognition  
- [ ] ElevenLabs TTS for premium users
- [ ] Pronunciation scoring algorithms
- [ ] Voice accent detection and improvement

### **💾 Database & User Management**
- [ ] User registration and profiles
- [ ] Progress tracking across lessons
- [ ] Achievement system implementation
- [ ] Social features (leaderboards, friends)

### **💰 Monetization & Payments**
- [ ] ZaloPay integration for subscriptions
- [ ] VietQR payment support
- [ ] Freemium model implementation
- [ ] Premium features unlock system

### **📱 Zalo Mini App Integration**
- [ ] Zalo SDK integration
- [ ] Push notifications for learning reminders
- [ ] Zalo user authentication
- [ ] Social sharing features

## 🎯 Recommended Next Steps

### **Phase 1: AI Integration (Week 1-2)**
1. **Integrate GPT-4 API** for intelligent conversation
2. **Implement advanced chat logic** with lesson context
3. **Add pronunciation evaluation** using AI
4. **Create dynamic lesson generation**

### **Phase 2: Database & User Management (Week 2-3)**
1. **Set up Cloudflare D1 database** with user schemas
2. **Implement user registration/login**
3. **Add progress tracking and statistics**
4. **Create achievement system**

### **Phase 3: Payment & Premium Features (Week 3-4)**
1. **Integrate ZaloPay for subscriptions**
2. **Implement freemium model**
3. **Add premium voice features (ElevenLabs)**
4. **Create subscription management**

### **Phase 4: Zalo Mini App Deployment (Week 4-5)**
1. **Integrate Zalo Mini App SDK**
2. **Deploy to Zalo platform**
3. **Add Vietnamese market optimization**
4. **Marketing and user acquisition**

## 🚀 Deployment

### **Current Status**: ✅ Active Development Environment
- **Platform**: Cloudflare Workers (development)
- **Service Management**: PM2
- **Build System**: Vite + TypeScript
- **Last Updated**: September 4, 2025

### **Production Deployment Commands**
```bash
# Build for production
npm run build

# Deploy to Cloudflare Pages
npm run deploy:prod

# Local development
npm run dev:sandbox

# Service management
npm run start     # Start with PM2
npm run restart   # Restart service
npm run logs      # Check logs
```

### **Environment Setup**
```bash
# Install dependencies
npm install

# Build project
npm run build

# Start local development
npm run start
```

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: Hono (Cloudflare Workers)
- **Styling**: TailwindCSS + FontAwesome icons
- **Voice**: Web Speech API (Recognition + Synthesis)
- **Build**: Vite + TypeScript

### **Backend**
- **Runtime**: Cloudflare Workers
- **API Framework**: Hono
- **Database**: Cloudflare D1 (planned)
- **Storage**: Cloudflare KV/R2 (planned)

### **DevOps**
- **Process Manager**: PM2
- **Version Control**: Git + GitHub
- **Deployment**: Cloudflare Pages
- **CI/CD**: GitHub Actions (planned)

## 📈 Market Strategy

### **Target Audience**
- Vietnamese English learners (A2-B1 level)
- Mobile-first users on Zalo platform
- Working professionals seeking quick daily practice
- Students preparing for international communication

### **Competitive Advantages**
- **Vietnamese-native interface** with cultural context
- **Zalo ecosystem integration** for seamless user experience
- **AI-powered personalization** adapted for Vietnamese learning patterns
- **Voice-first approach** addressing pronunciation challenges
- **Gamification optimized** for Vietnamese user preferences

---

**Created by**: [@iurii-pavlu](https://github.com/iurii-pavlu)  
**Live Demo**: https://3000-iadezlws4iozutsxtyqzt-6532622b.e2b.dev  
**Repository**: https://github.com/iurii-pavlu/My-AI-English-Teacher