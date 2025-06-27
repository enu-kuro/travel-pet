# AGENTS.md — AI Agent Project Guide

## 📘 Project Overview
Travel Pet digital companion service that creates virtual pets for users and sends daily travel diary emails.

### 旅するデジタルペット – たびぺっち
あなたのメールに届く、ちいさな世界の旅。

知らない世界に、出会っていますか？

「たびぺっち」は、あなたのもとに毎日1通、小さな旅日記を届けるデジタルペットです。
ペットは気まぐれに世界を巡り、観光地だけでなく、誰も知らない村や、その日に話題になった遠い国の出来事、静かな港町の朝など、思いもよらない景色や物語をメールで教えてくれます。

日々の情報が自分好みに並ぶ時代だからこそ、
「たびぺっち」は、あなたが普段出会えない場所・文化・出来事を、“ゆるいノイズ”としてそっと届けます。
見慣れた毎日に、ちょっとだけ新しい視点と驚きを。
忙しいあなたの心に、小さな冒険と癒しを。

さあ、メールボックスで世界を旅する日々をはじめましょう。

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
├── GEMINI.md                 # Instructions for the Gemini agent
├── README.md                 # Project README
├── systemDiagram.puml        # PlantUML system diagram
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
│   │   ├── createPetFlow.ts       # Pet creation logic (editable)
│   │   ├── generateDestinationFlow.ts # Destination generation flow
│   │   ├── generateDiaryFlow.ts  # Diary generation flow
│   │   ├── diaryHelpers.ts     # Firestore and email helpers for diaries
│   │   ├── diaryService.ts       # Destination & diary orchestration
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
- **Framework:** Firebase Cloud Functions v2, Genkit
- **AI:** Google Vertex AI (Gemini, Imagen)
- **Database:** Firestore
- **Storage:** Cloud Storage for Firebase
- **Prompt Management:** Dotprompt
- **Secret Management:** Google Cloud Secret Manager
- **Email:** nodemailer + imap
- **Scheduler:** Google Cloud Scheduler

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

### 🔢 Branch Naming Rules
- Use **alphabet-only** branch names
