# Vivah AI: Premium Matrimonial Platform

Vivah is a modern, AI-powered matrimonial platform designed to find meaningful life partners through semantic intelligence and personality-driven matchmaking.

## ✨ Key Features

- **Hybrid AI Matchmaking**: Uses a combination of strict SQL filters and semantic vector embeddings (`pgvector`) to find matches that truly align with your values and lifestyle.
- **AI Profile Optimizer**: Analyzes your profile and suggests improvements for your bio, profession, hobbies, and personality prompts to boost your match rate.
- **Rich User Profiles**: 20+ rich attributes including lifestyle choices, career ambition, family goals, and personality prompts.
- **State-of-the-Art Search**: Search using natural language like *"Someone similar to me who is Muslim and can be a stay at home mom who can cook"*.
- **Premium Subscriptions**: Multi-tier monetization (Gold/Diamond) gating advanced AI features.
- **Real-time Interaction**: Instant messaging and interest management.

## 🛠 Tech Stack

- **Frontend**: Vite + React + TypeScript + TailwindCSS + Shadcn UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI Models**:
  - **Gemini (text-embedding-004)**: For high-dimensional vector embeddings.
  - **Llama 3.1 (via Groq)**: For real-time profile analysis and match explanations.
- **Database Architecture**: 
  - `pgvector` for similarity search.
  - HNSW Index for high-performance vector retrieval.
  - PostgreSQL Triggers for automated data synchronization.

## 🚀 Getting Started

### 1. Database Setup
Execute the [supabase/supabase-setup.sql](supabase/supabase-setup.sql) script in your Supabase SQL Editor. This will set up all tables, RLS policies, indexes, and AI functions.

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_GEMINI_API_KEY=your_google_ai_key
VITE_GROQ_API_KEY=your_groq_key
```

### 3. Installation
```bash
pnpm install
pnpm dev
```

## 📖 Documentation
- [Architecture & AI Deep Dive](ARCHITECTURE.md)
- [Database Schema (Unified)](supabase/supabase-setup.sql)

## 🤝 Contributing
Contributions are welcome! Please follow the existing design system and ensure all AI features are properly gated behind subscription checks.

---
Built with ❤️ for meaningful connections.
