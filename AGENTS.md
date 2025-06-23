# AGENTS.md — AI Agent Project Guide

## 📘 Project Overview
Travel Pet digital companion service that creates virtual pets for users and sends daily travel diary emails.

**Core Features:**
- Pet creation via email to alias address
- Daily AI-generated travel diary emails
- Firebase Cloud Functions backend
- Gmail integration with App Password authentication

## 🗂 Directory Structure
```
.
├── .firebaserc               # Firebase project configuration
├── .gitignore                # Specifies intentionally untracked files that Git should ignore
├── AGENTS.md                 # This file: AI Agent Project Guide
├── README.md                 # Project README
├── firebase.json             # Firebase hosting and functions configuration
├── functions/                # Firebase Cloud Functions directory
│   ├── .eslintrc.js          # ESLint configuration for functions
│   ├── .gitignore            # Specifies untracked files for the functions directory
│   ├── package-lock.json     # Records exact versions of dependencies for functions
│   ├── package.json          # Lists dependencies and scripts for functions
│   ├── prompts/              # Directory for Genkit prompt templates
│   │   ├── create-pet-profile.prompt # Prompt for creating a pet profile
│   │   ├── generate-destination.prompt # Prompt for generating travel destinations
│   │   └── generate-diary.prompt     # Prompt for generating diary entries
│   ├── src/                  # Source code for Firebase Cloud Functions
│   │   ├── createPetFlow.ts  # Pet creation logic (editable)
│   │   ├── dailyDiaryFlow.ts # Diary generation logic (editable)
│   │   ├── genkit.config.ts  # Genkit plugin and flow configuration
│   │   ├── config.ts         # Configuration settings (editable)
│   │   ├── index.ts          # Main Cloud Functions entry point (editable)
│   │   ├── email.ts          # Email utilities (editable)
│   │   ├── emailService.ts   # Email processing service layer (editable)
│   │   ├── types.ts          # Shared type definitions
│   ├── tsconfig.dev.json     # TypeScript configuration for development
│   └── tsconfig.json         # TypeScript configuration
```

## 🛠 Tech Stack
- **Runtime:** Node.js 20
- **Language:** TypeScript 4.x
- **Framework:** Firebase Cloud Functions v2
- **AI:** Google Vertex AI (Gemini)
- **Database:** Firestore
- **Email:** nodemailer + imap
- **Scheduler:** Cloud Scheduler

## ✍️ Coding Conventions
- Variables: camelCase (`petProfile`, `emailAddress`)
- Functions: camelCase with descriptive names
- Files: camelCase (`.ts` files)
- Async/await: Always use, no raw Promises
- **Simplicity First:** Implementations should prioritize simplicity and clarity over premature abstraction or optimization.

## 🔧 Environment Variables
Required secrets (Firebase Secret Manager):
- `EMAIL_ADDRESS`: Gmail base address (e.g., "user@gmail.com")
- `EMAIL_APP_PASSWORD`: Gmail App Password

**Important:** Always use `+travel-pet` alias for service emails.

## 🚀 Development Commands
```bash
# Run unit tests
npm run test
# Run linter
npm run lint
```

## 📧 Email Handling Rules
- **Incoming:** Only process emails sent to `+travel-pet` alias
- **Outgoing:** Always send from alias address
- **Security:** Never mark non-alias emails as read
- **Error handling:** Mark processed emails as read after completion

## ✅ Key Implementation Notes
- IMAP search filters by alias: `['UNSEEN', ['TO', aliasEmail]]`
- Pet creation triggered by first email to alias
- All database operations use Firestore collections: `pets` and `pets/{id}/diaries`

## 🔀 Git Commit Format
Use conventional commits:
- `feat:` new features
- `fix:` bug fixes
- `refactor:` code improvements
- `docs:` documentation updates
```
