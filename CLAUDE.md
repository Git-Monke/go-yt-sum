# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Go-based YouTube video summarization service that downloads, transcribes, and summarizes YouTube videos using a multi-stage pipeline architecture. The service exposes a REST API with Server-Sent Events (SSE) for real-time job updates.

## Core Architecture

### Pipeline System (`pipeline/stages.go`)
The application uses a channel-based pipeline with these stages:
1. **Download** - Downloads video using yt-dlp, checks for auto-generated captions
2. **Transcribe** - Uses Groq's Whisper API for audio transcription (if no captions available)
3. **Summarize** - Uses Groq's LLM API to generate markdown summaries
4. **Complete** - Marks job as finished and notifies clients

Each stage runs as a separate goroutine and communicates via buffered channels. Jobs flow through stages based on availability of auto-generated captions (skip transcription if captions exist).

### Job Management (`job/`)
- `SummaryJob` struct tracks video processing state with thread-safe updates
- `ActiveJobsManager` handles job lifecycle and client SSE connections
- Jobs are identified by YouTube video ID and persist until manually deleted
- Real-time updates broadcast to all connected SSE clients

### Adapters (`adapters/`)
External service integrations:
- `download.go` - yt-dlp wrapper for video/caption download
- `transcribe.go` - Groq Whisper API integration  
- `summarize.go` - Groq chat completion API for summarization
- `config.go` - API endpoints, models, file paths, system prompts

## Development Commands

### Build and Run
```bash
go build -o go-yt-sum
./go-yt-sum
```

### Development
```bash
go run main.go
```

The server runs on port 8010 by default.

## API Endpoints

- `POST /summarize/{videoID}` - Queue video for processing
- `GET /summarize/{videoID}` - Get job status and progress
- `GET /summaries/{videoID}` - Get completed summary (markdown)
- `GET /summarize/jobs/subscribe` - SSE stream for real-time job updates

## File Structure

Content is organized in `content/` directory:
- `downloads/` - Raw video files and caption files (.vtt, .mp3, .json)
- `transcriptions/` - JSON transcription results from Groq API
- `summaries/` - Final markdown summaries

## Key Implementation Details

### Error Handling
Pipeline stages use panic/recover pattern with centralized error handling. Failed jobs are marked with status "failed" and error message.

### Concurrency
- Download and transcription stages process one job at a time
- Summarization stage processes multiple jobs concurrently (Groq doesn't rate limit)
- All job state updates are thread-safe using sync.RWMutex

### External Dependencies
- Uses `github.com/lrstanley/go-ytdlp` for video downloads
- Uses `github.com/asticode/go-astisub` for subtitle processing
- Uses `github.com/gorilla/mux` for HTTP routing
- Requires yt-dlp binary to be available in system PATH

### Configuration
All API keys, endpoints, and file paths are configured in `adapters/config.go`. The Groq API key is currently hardcoded and should be moved to environment variables for production use.
- The frontend should use shadcn components. If you need one and it isn't installed, just ask and I will install it for you.
- For testing, don't try to lint or build the frontend. I will take care of that. Just make the changes.
- Look in @frontend/TASKS.md to figure out what to do next. Check off tasks when you're done.