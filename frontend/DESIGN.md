# YouTube Summarizer Frontend - Design Document

## Overview
A single-page application built with React + TypeScript + Vite + Tailwind + shadcn/ui that provides a clean, minimal interface for YouTube video summarization with real-time progress tracking and AI chat functionality.

## Design Philosophy
- **Minimal & Modern**: ChatGPT-inspired clean interface
- **Readable**: Single font size with generous letter spacing
- **Smooth**: Subtle animations (200-300ms) throughout
- **Dark Mode**: Using shadcn dark theme variables
- **Responsive**: Mobile-first approach with simplified mobile experience

## Architecture

### Tech Stack
- React 19 + TypeScript
- Vite for build tooling
- Tailwind CSS v4 for styling
- shadcn/ui components (New York style)
- React Router for navigation
- Server-Sent Events for real-time updates
- Lucide React for icons

### Navigation Structure
```
/ (Videos View)
├── /settings (Settings View)
└── /video/:videoId (Video Summary + Chat View)
```

## Layout System

### Header
- **Height**: ~64px thin bar
- **Content**: App logo (links to `/`) + sidebar toggle button
- **Style**: Minimal, dark theme

### Sidebar (ChatGPT-style)
- **Collapsed**: Icons only with toggle at top
- **Expanded**: Icons + text labels  
- **Navigation Items**:
  - Videos (home icon)
  - Settings (gear icon)
  - Recent video summaries (dynamic list)
- **Animation**: 300ms slide transition

### Main Content
- **Container**: Centered with appropriate max-width
- **Spacing**: Tight component spacing, generous letter spacing
- **Background**: Dark theme background

## Page Specifications

### 1. Videos View (`/`)

#### Hero Section
- **URL Input**: Large, centered (ChatGPT-style)
- **Validation**: Real-time YouTube URL parsing
- **Behavior**: Navigate to `/video/:videoId` on submit
- **Placeholder**: "Paste YouTube URL here..."

#### Job List Section
- **Layout**: Vertical list of compact horizontal cards
- **Real-time**: Live updates via SSE
- **Empty State**: Friendly message when no jobs exist

#### Job Cards
- **Base State**: 
  - Video ID (first 11 chars)
  - Status badge with color coding
  - Progress indicator
  - Minimal height (~60px)
- **Hover State**:
  - Smooth expansion (~90px height)
  - Additional details (timestamps, chunk progress)
  - Subtle shadow/elevation
- **Click Behavior**: Navigate to `/video/:videoId`

### 2. Video View (`/video/:videoId`)

#### Split Layout
- **Ratio**: 70/30 or 60/40 (summary/chat)
- **Resizable**: Draggable divider between panes
- **Min Widths**: Ensure usability at extreme ratios

#### Left Pane - Summary
- **Content**: Clean markdown rendering
- **Typography**: Optimized for readability
- **Scrolling**: Independent scroll area
- **Loading State**: Show progress if video processing

#### Right Pane - Chat
- **Interface**: ChatGPT-style chat
- **Input**: Bottom-positioned with send button
- **Messages**: Flowing upward conversation
- **Placeholder**: Stub for future backend integration

#### Smart Detection
- **In-Progress**: Auto-detect processing status
- **Live Updates**: Real-time progress display
- **Completion**: Smooth transition to summary view

### 3. Settings View (`/settings`)
- **Layout**: Simple centered form
- **Fields**: API key input with show/hide toggle
- **Actions**: Save and reset buttons
- **Validation**: Basic input validation

## Component Architecture

### Core Components
```
App/
├── Layout/
│   ├── Header
│   ├── Sidebar
│   └── MainContent
├── Views/
│   ├── VideosView
│   ├── VideoView
│   └── SettingsView
├── Components/
│   ├── URLInput
│   ├── JobCard
│   ├── JobList
│   ├── SummaryViewer
│   ├── ChatInterface
│   └── StatusBadge
└── Hooks/
    ├── useSSE
    ├── useJobState
    └── useURLValidation
```

### State Management
- **SSE Context**: Global job state from server events
- **Local State**: Form inputs, UI states, navigation
- **URL State**: React Router for navigation and deep linking

## Real-time Features

### Server-Sent Events Integration
- **Endpoint**: `/summarize/jobs/subscribe`
- **Events**: `init`, `new`, `update`
- **Connection**: Persistent with reconnection logic

### Job Status States
```
pending → downloading (%) → extracting_audio → transcribing → 
chunking → summarizing → finished

OR (with captions):
pending → downloading → checking_for_captions → 
downloaded_captions → summarizing → finished
```

### Progress Indicators
- **Download**: Percentage-based progress bar
- **Processing**: Chunk-based progress (transcription/summarization)
- **Visual**: Color-coded status badges with icons

## Visual Design System

### Typography
- **Font**: System font stack (clean, readable)
- **Size**: Single primary size with hierarchy via weight/color
- **Spacing**: Generous letter spacing for readability

### Colors
- **Base**: shadcn dark theme variables
- **Status Colors**:
  - Success: Green variants
  - Processing: Blue variants  
  - Warning: Yellow variants
  - Error: Red variants

### Spacing
- **Components**: Tight spacing between related elements
- **Sections**: Generous whitespace between major sections
- **Text**: Increased letter spacing for readability

### Animations
- **Duration**: 200-300ms for most transitions
- **Easing**: Smooth, natural curves
- **Types**:
  - Page transitions: Fade/slide
  - Hover states: Scale/elevation
  - Status changes: Color/icon transitions
  - Loading: Subtle pulse/skeleton

## Responsive Design

### Breakpoints
- **Mobile**: < 768px - Single column, simplified
- **Tablet**: 768px - 1024px - Adapted layouts
- **Desktop**: > 1024px - Full experience

### Mobile Optimizations
- **Sidebar**: Sheet/drawer instead of persistent sidebar
- **Split View**: Stack vertically or tabbed interface
- **Touch**: Appropriate touch targets (min 44px)
- **Navigation**: Simplified navigation patterns

## API Integration

### Existing Endpoints
- `POST /summarize/{videoID}` - Queue video
- `GET /summarize/{videoID}` - Get job status
- `GET /summaries/{videoID}` - Get summary
- `GET /summarize/jobs/subscribe` - SSE stream

### Future Chat Endpoints (Placeholder)
- `POST /chat/{videoID}` - Send message
- `GET /chat/{videoID}/history` - Get chat history

## Error Handling

### Network Errors
- **SSE Disconnection**: Auto-reconnect with exponential backoff
- **API Failures**: Toast notifications with retry options
- **Invalid URLs**: Inline validation feedback

### User Experience
- **Loading States**: Skeleton loaders and progress indicators
- **Empty States**: Helpful guidance for new users
- **Error States**: Clear error messages with next steps

## Performance Considerations

### Optimization
- **Code Splitting**: Route-based chunks
- **SSE Management**: Efficient connection handling
- **State Updates**: Optimized re-renders
- **Asset Loading**: Lazy loading where appropriate

### Monitoring
- **Bundle Size**: Keep dependencies minimal
- **Render Performance**: Monitor component re-renders
- **Network Usage**: Efficient SSE and API usage