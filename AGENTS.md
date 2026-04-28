# AGENTS.md - Developer Guide

## System Summary
A Go-based YouTube summarization service with a React frontend. It downloads video audio, transcribes it if transcripts are not available (Groq Whisper), and generates markdown summaries (Groq LLM). Real-time status and chat updates are delivered via Server-Sent Events (SSE).

## Backend (Go)
- **Pipeline (`backend/pipeline/stages.go`)**: Sequential stages: `Download` -> `Transcribe` (if no captions) -> `Summarize` -> `Complete`. Uses channels for job flow.
- **Job Manager (`backend/job/manager.go`)**: Manages `SummaryJob` state and broadcasts updates to SSE clients.
- **Chat Manager (`backend/chat/chatmgr.go`)**: Handles real-time LLM chat about specific videos. Streams responses via SSE.
- **Adapters (`backend/adapters/`)**: Wrappers for `yt-dlp` (downloads), Groq Whisper (transcription), and Groq Chat (summarization/chat).
- **Database (`backend/db/db.go`)**: Thread-safe JSON file persistence for video metadata in `./content/db.json`.
- **Main (`backend/main.go`)**: Initializes managers, starts pipeline, and defines REST/SSE endpoints on port 3211.

## Frontend (React/Vite/TS)
- **State Management (`frontend/src/contexts/JobContext.tsx`)**: Centralized job state. Syncs with backend using `useSSE` hook.
- **Hooks**:
    - `useSSE.ts`: Listens for job updates/init.
    - `useChatSSE.ts`: Listens for real-time chat streaming.
- **API (`frontend/src/utils/api.ts`)**: HTTP client for triggering summaries and fetching static data.
- **Components**: shadcn-based. Main views in `frontend/src/views/`.

## Data & Storage
- `./content/downloads/`: Audio/VTT files.
- `./content/transcriptions/`: JSON transcripts.
- `./content/summaries/`: Markdown results.
- `./content/chats/`: Persistent chat history (JSON).

## Key Entry Points for Features
- **New Pipeline Stage**: Add to `pipeline/stages.go` and update `SummaryJob` status list.
- **New API Endpoint**: Add to `main.go`.
- **New UI Feature**: Start in `frontend/src/views/` or `App.tsx`.
- **Change LLM Prompt**: Edit `backend/adapters/config.go`.

## Commands
- **Backend**: `cd backend && go run main.go`
- **Frontend**: `cd frontend && npm run dev`
