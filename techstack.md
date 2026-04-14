# Tech Stack — Question Hub

---

## Core

| Category | Technology |
|----------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Deployment | Vercel |

---

## Database

| Category | Technology |
|----------|------------|
| Database | MongoDB Atlas |
| ODM | Mongoose |

---

## Authentication

| Category | Technology |
|----------|------------|
| Auth | NextAuth.js |
| Roles | STUDENT, TEACHER, ADMIN |

---

## External Services

| Service | Provider | Purpose |
|---------|-----------|---------|
| AI (Primary) | Gemini | Quiz generation, answer validation |
| AI | Groq | Fallback LLM |
| AI | OpenRouter | Fallback LLM |
| AI | Mistral | Fallback LLM |
| AI | Cerebras | Fallback LLM |
| AI Routing | Custom (`lib/llm.ts`) | Key rotation & failover |
| Payments | Khalti SDK | Subscriptions, course purchases |
| Payments | eSewa SDK | Subscriptions, course purchases |
| Storage | Cloudinary | Images, videos |
| Email | Nodemailer / Resend | Transactional emails |
| WhatsApp | Twilio WhatsApp Business API | Notifications |
| Real-time | Pusher | Channel messaging |
| Video | Zoom OAuth + REST API | Live sessions (optional recording fetch) |

---

## Project Structure

```
app/
├── (workspace)/        # Student/Teacher portal
├── (admin)/admin/     # Admin panel
└── api/               # API routes

lib/
├── config.ts          # Seed config (lib only)
├── llm.ts            # AI routing (lib/llm.ts → llmGenerate())
└── *.ts              # Utilities

models/
├── *.ts               # Mongoose schemas
└── PlatformConfig.ts  # Admin config (fetch via getPlatformConfig())

.env.local             # Environment variables
```

---

## Key Features

- **Q&A System**: Tiered, timed communication channels
- **Quiz Portal**: AI-generated quizzes with timer and leaderboard
- **Course System**: Video courses with 3 pricing models (Free / Subscription / Paid)
- **Live Sessions**: Zoom-integrated live classes
- **Payments**: Khalti + eSewa subscriptions and course purchases
- **Teacher Wallet**: Earnings tracking with platform commission
- **Student Points**: Gamification with AI answer validation
- **Leaderboard**: Ranking system
- **Notifications**: Email + WhatsApp alerts

---

## Configuration Rules

- **Config Values**: Fetch from `getPlatformConfig()` — never import from `lib/config.ts` (seed-only)
- **AI Calls**: Must go through `lib/llm.ts → llmGenerate()` — no direct SDK calls
- **Payments**: All flows use Khalti/eSewa — course purchases require commission snapshot in Transaction metadata