# Question Call

<div align="center">
  <img src="/logo.png" alt="Question Call Logo" width="200" />
  <h1>The Smarter Way to Learn</h1>
  <p>A dual-portal academic platform connecting students with expert teachers through interactive questions, video courses, live sessions, and gamified learning.</p>
</div>

---

## Why Question Call?

| Traditional Learning | Question Call |
|---------------------|--------------|
| Ask a question, wait days for answer | Get verified answers in timed channels |
| Passive video watching | Interactive progress tracking |
| No monetization for teachers | Earn from courses & subscriptions |
| Generic quizzes | AI-powered personalized tests |
| No community engagement | Leaderboards & achievements |

---

## ✨ Features

### 🎓 Question & Answer System
- **Structured Channels** - Teachers create topic-specific channels for organized Q&A
- **Timed Responses** - Urgency drives faster solutions
- **AI Validation** - Quality-checked answers before acceptance

### 📺 Video Courses (Phase 15)
Three ways to access:
- **Free** - Open to all authenticated users
- **Subscription** - Included with monthly plan
- **Paid** - One-time purchase per course

Features:
- Cloudinary-powered video streaming
- Section-based curriculum
- Progress tracking (90% watched = complete)
- Teacher earnings after platform commission

### 🔴 Live Sessions
- Zoom integration for real-time classes
- Email & WhatsApp notifications
- Recording access for enrolled students
- Available for Subscription & Paid courses only

### 🧠 AI-Powered Quizzes
- Generated using Gemini/Groq
- Timed test sessions
- 90%+ to pass & earn points
- Randomized question pools

### 💳 Payments & Wallets
- Khalti & eSewa integration
- Subscription purchases
- Course purchases
- Teacher commission payouts
- Secure withdrawal system

### 🏆 Gamification
- Points for answered questions
- Quiz pass rewards
- Leaderboard rankings
- Achievement badges

### 🤖 AI Key Rotation
- Multiple LLM providers (Gemini, Groq, Mistral, Cerebras)
- Automatic failover
- Cost optimization

---

## 👥 Who Is It For?

### Students
- Ask questions and get verified answers
- Enroll in video courses
- Join live classes
- Take quizzes and track progress
- Compete on leaderboards

### Teachers
- Answer questions and build reputation
- Create and sell courses
- Schedule live sessions
- Earn from sales & subscriptions
- Manage earnings in wallet

### Admins
- Manage users and content
- Configure platform settings
- View analytics
- Manage AI providers

---

## 🏗️ Tech Stack

```
Frontend       → Next.js 14 + TypeScript + Tailwind CSS
Database       → MongoDB (Mongoose)
Auth           → NextAuth.js
Real-time      → Pusher
AI             → Gemini, Groq, Mistral, Cerebras
Payments       → Khalti SDK, eSewa SDK
Videos         → Cloudinary + Zoom API
Notifications  → Nodemailer, Twilio WhatsApp
```

---

## 🚀 Get Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 📄 License

MIT

---

<div align="center">
  <sub>Built with Next.js + MongoDB</sub>
</div>
