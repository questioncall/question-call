# Question Hub

<div align="center">
  <img src="/logo.png" alt="Question Hub Logo" width="200" />
</div>

> A dual-portal academic platform where students ask questions and teachers solve them via tiered, timed communication channels. Includes video courses, quizzes, live sessions, and gamification.

---

## 📚 About

**Question Hub** is an educational technology platform designed to connect students and teachers in a structured, engaging learning environment. The platform enables students to ask academic questions and receive step-by-step solutions from verified teachers through timed, organized channels.

---

## 🎯 Mission

Our objective is to democratize quality education by creating a transparent marketplace where:
- **Students** get personalized, verified answers to their academic questions
- **Teachers** earn income by sharing knowledge and building credibility
- **Everyone** benefits from gamified learning experiences and progress tracking

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│  Next.js 14 (App Router) + TypeScript + Tailwind CSS          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │   API Layer │
                    │  (Route Handlers) │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────┴────┐       ┌─────┴─────┐      ┌─────┴─────┐
   │ MongoDB │       │  Pusher   │      │Cloudinary │
   │ (Mongoose)      │(Real-time)│      │ (Videos)  │
   └─────────┘       └───────────┘      └───────────┘
```

---

## 👥 User Roles

### Students
- **Ask Questions**: Submit academic questions to any subject
- **Subscribe to Channels**: Follow teachers' question channels
- **Watch Live Classes**: Join live Zoom sessions from enrolled courses
- **Take Quizzes**: Test knowledge with AI-generated quizzes
- **Track Progress**: Monitor learning journey with detailed analytics
- **Earn Points**: Get recognized on the leaderboard

### Teachers
- **Answer Questions**: Provide step-by-step solutions via channels
- **Create Courses**: Build video courses with sections & lessons
- **Go Live**: Schedule live classes with Zoom integration
- **Earn Money**: Receive payments from course sales & subscriptions
- **Manage Wallet**: Withdraw earnings securely

### Admins
- **Manage Users**: Approve teachers, suspend students
- **Configure Platform**: Set commission rates, pricing, features
- **Analytics**: View revenue, engagement, and performance metrics
- **AI Keys**: Manage LLM providers and key rotation

---

## 🔑 Key Features

### 1. Question & Answer System
- Students ask questions with subject tags
- Teachers create channels to answer specific topics
- Timed response windows create urgency
- AI validates answer quality before acceptance

### 2. Course Management (Phase 15)
Three pricing models:
| Model | Access | Payment |
|-------|--------|---------|
| **Free** | Any authenticated user | None |
| **Subscription-Included** | Active subscribers | Existing subscription |
| **Paid** | Course purchasers | Per-course fee |

- Video uploads with Cloudinary
- Section-based curriculum organization
- Progress tracking (90% watched = complete)
- Teacher earnings after platform commission

### 3. Live Sessions
- Zoom integration for live classes
- Email & WhatsApp notifications to students
- Recording upload for on-demand access
- Only for Subscription/Paid courses

### 4. Quiz Portal
- AI-generated questions using Gemini/Groq
- Timed quiz sessions
- Leaderboard points on pass (90%+)
- Randomized question pools

### 5. Payments & Wallets
- **Khalti** & **eSewa** integration
- Subscription purchases
- Course purchases
- Teacher commission payouts
- Admin-configurable commission rates

### 6. Gamification
- Points for answered questions
- Quiz pass rewards
- Leaderboard rankings
- Achievement badges

### 7. AI Key Rotation
- Multiple LLM providers (Gemini, Groq, Mistral, Cerebras)
- Automatic key rotation on quota exceeded
- Fallback to backup providers
- Cost optimization

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Auth | NextAuth.js |
| Database | MongoDB (Mongoose) |
| Real-time | Pusher |
| AI | Gemini, Groq, Mistral, Cerebras |
| Payments | Khalti SDK, eSewa SDK |
| Storage | Cloudinary |
| Email | Nodemailer / Resend |
| WhatsApp | Twilio |
| Video | Zoom API |
| Styling | Tailwind CSS + Shadcn UI |

---

## 📂 Project Structure

```
app/
├── (admin)/           # Admin dashboard
│   ├── admin/
│   │   ├── courses/       # Course management
│   │   ├── users/         # User management
│   │   ├── ai-keys/        # AI configuration
│   │   ├── transactions/  # Revenue tracking
│   │   └── ...
│
├── (auth)/           # Authentication
│   └── auth/
│       ├── signin/
│       ├── signup/
│       │   ├── student/
│       │   └── teacher/
│       └── signout/
│
├── (courses)/        # Student course experience
│   └── courses/
│       ├── [slug]/       # Course details
│       │   ├── watch/    # Video player
│       │   ├── buy/      # Purchase flow
│       │   └── manage/   # Instructor dashboard
│       └── my/           # Enrolled courses
│
├── (workspace)/     # Logged-in user workspace
│   ├── ask/         # Ask questions
│   ├── channel/    # Question channels
│   ├── message/    # Messaging
│   ├── studio/     # Teacher dashboard
│   ├── wallet/     # Teacher earnings
│   └── ...
│
├── quiz/            # Quiz portal
├── subscription/   # Subscription management
└── payment/        # Payment callbacks
```

---

## 🔐 Security

- Role-based access control (STUDENT, TEACHER, ADMIN)
- Server-side session validation
- API route protection
- Input validation with Zod
- Environment variable secrets

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 📄 License

MIT License