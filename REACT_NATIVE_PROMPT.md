Here's a strong, comprehensive prompt you can give to your codebase assistant (web developer AI) to generate a high-quality .md handoff document for your React Native app developer assistant:

🎯 The Prompt (Copy & Paste This to Your Web Codebase Assistant)

```
You are a senior full-stack engineer responsible for handing off my completed web 
project to a mobile app development team that will build a React Native (Expo) app 
for both iOS and Android. The mobile app MUST replicate 100% of the website's 
features, business logic, and user flows — since this is a real-money platform 
for medium-scale users, accuracy, security, and parity are non-negotiable.

Your task: Deeply analyze my entire codebase and generate a single, exhaustive 
Markdown file named `MOBILE_APP_HANDOFF.md` that another AI assistant (the React 
Native developer) can read and use to build the mobile app with ZERO ambiguity.

The shared backend is already deployed on Vercel and will be reused by the mobile 
app — so the doc must focus on API contracts, auth flow, state management, and 
UI/UX parity rather than backend rebuilding.

────────────────────────────────────────────────────────
The MD file MUST include the following sections in order:
────────────────────────────────────────────────────────

1. **Project Overview**
   - What the platform does, target users, and core value proposition
   - Why this is a real-money / financial app (compliance sensitivity)
   - Tech stack of the website (frontend, backend, DB, auth, payment gateway, 
     hosting on Vercel)

2. **Mobile App Tech Stack (Recommended)**
   - React Native + Expo (SDK version)
   - Navigation (expo-router or react-navigation)
   - State management (Redux Toolkit / Zustand / Context — match website logic)
   - Secure storage (expo-secure-store for tokens, NEVER AsyncStorage for 
     sensitive data)
   - Required Expo modules (notifications, biometrics, camera, deep linking, etc.)

3. **Backend & API Integration**
   - Base URL of the Vercel-deployed backend
   - Full list of every API endpoint used by the website with:
       • Method, path, request body, response shape, auth requirement
       • Rate limits, error codes, edge cases
   - CORS / mobile-specific headers needed
   - Webhook or real-time endpoints (Socket.IO, Pusher, SSE) if any

4. **Authentication & Security (CRITICAL — real money)**
   - Full auth flow: signup, login, OTP, 2FA, password reset, session refresh
   - JWT / cookie strategy and how to adapt cookie-based auth to mobile 
     (use Bearer tokens via secure store)
   - Biometric login (Face ID / fingerprint) requirements
   - SSL pinning, jailbreak/root detection, screenshot prevention on sensitive 
     screens
   - PCI-DSS considerations if handling cards directly

5. **Feature-by-Feature Parity Checklist**
   For EACH feature on the website, provide:
       • Feature name & purpose
       • Exact user flow (step-by-step)
       • API calls involved
       • Validation rules (client + server)
       • Edge cases & error states
       • Mobile-specific UX adjustments (e.g., bottom sheets instead of modals)
   List every page/route from the website and map it to a mobile screen.

6. **Money / Transaction Handling**
   - Payment gateway used (Razorpay, Stripe, etc.) and its React Native SDK
   - Deposit, withdrawal, wallet, transaction history flows
   - Idempotency keys, double-spend prevention
   - KYC flow if applicable

7. **Data Models & TypeScript Types**
   - Export all shared TypeScript interfaces/types from the web codebase 
     so the mobile app uses identical shapes

8. **Design System & UI Guidelines**
   - Color palette, typography, spacing, border radius
   - Component-to-component mapping (web → mobile equivalents)
   - Dark mode support (if web has it)
   - Recommended UI library (NativeWind / Tamagui / RN Paper)

9. **Push Notifications, Deep Links & Background Tasks**
   - FCM / APNs setup
   - Deep link schema matching website routes
   - Any cron-like background sync needed

10. **Environment Variables & Config**
    - Full `.env` template (without secrets)
    - How to switch between dev / staging / prod backends

11. **Testing & QA Requirements**
    - Critical user journeys that MUST be tested
    - Suggested tools (Detox, Maestro, Jest)

12. **Build, Release & Store Submission**
    - EAS Build configuration
    - App Store + Play Store requirements specific to real-money apps 
      (gambling/finance disclosures, age rating, regional restrictions)

13. **Known Pitfalls & Gotchas**
    - Anything in the web codebase that will NOT translate directly to mobile 
      (e.g., window APIs, localStorage, web-only libraries)

14. **Folder Structure Recommendation** for the React Native project

────────────────────────────────────────────────────────
Rules while writing the MD file:
────────────────────────────────────────────────────────
- Be extremely specific — quote actual file names, function names, and endpoints 
  from MY codebase. Do NOT generalize.
- Include real code snippets from the web project where helpful.
- Where the web uses browser-only APIs, suggest the exact React Native replacement.
- Assume the mobile developer AI has NEVER seen the web codebase.
- Prioritize clarity over brevity. The file can be long — completeness matters.
- Add a "⚠️ SECURITY CRITICAL" callout on any section involving money or auth.
- End the document with a final checklist the mobile dev must tick off before 
  shipping.

Now scan my entire codebase and generate `MOBILE_APP_HANDOFF.md`.

```


💡 Pro Tips Before You Run It

    Run it in your IDE assistant (Cursor, Windsurf, Claude Code, Copilot Workspace) so it has full repo access — not in a regular chat.
    After generation, ask the same assistant: "Now review the MD file and list anything you might have missed about real-money flows, auth, or edge cases." — this catches gaps.
    Then feed the MD file to your React Native developer assistant with this opener:

        "You are building a React Native + Expo app. Read MOBILE_APP_HANDOFF.md carefully. Ask me clarifying questions BEFORE writing any code."

This two-step handoff (analyze → review → handoff) gives you near-perfect feature parity. Good luck with the launch! 🚀