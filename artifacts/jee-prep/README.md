# JEE Prep Hub - Application Overview

## Core Modules & Functionality

### 1. Dashboard (Home)
- **JEE 2028 Countdown**: A high-precision flip-clock style countdown to the target exam date.
- **Streak System**: Tracks consistent daily study activity to build long-term habits.
- **Todo System**: Comprehensive task manager with priority levels (High, Medium, Low) and categorization via global Tags.
- **Today's Schedule**: Integrated view of calendar events for the current day.
- **Time Management**: Quick access to active timers and alarms.
- **Lockdown Mode**: A focused mode that overlays certain widgets to prevent distractions during study sessions.
- **Resizable Layout**: Users can customize the height of dashboard sections, persisted via local storage.

### 2. PDF Library & Annotator
- **Hierarchical Organization**: Create Sections, Subsections, and Sub-subsections to organize study material.
- **Annotation Tools**: Professional drawing suite (Pen, Highlighter, Rectangle, Circle, Triangle, Arrow, Text, Eraser) with custom colors and stroke widths.
- **Persistence**: Annotations are automatically saved per document and per page using local storage.
- **Multi-Question Cropping**: A powerful tool to "crop" questions directly from PDFs. These crops can be imported into the "Saves" bank with metadata like answers and descriptions.
- **Flexible Loading**: Support for local PDF files, images (JPG/PNG), and direct PDF URLs.

### 3. Video Lecture Suite
- **Dual Engine Support**: Play local MP4 files or stream directly from YouTube without distracting site elements.
- **Timeline-based Notes**: Add notes at specific timestamps. Note types include plain text, images, screenshots of the video, and voice recordings.
- **A-B Looping**: Select a specific segment of a video to repeat infinitely—perfect for understanding complex derivations.
- **Mini Player**: Detachable floating player that allows watching lectures while navigating other parts of the app.
- **Advanced Controls**: Precise speed adjustment (up to 8x), quality selector, CC/Subtitles support, and audio track switching for YouTube.

### 4. Saves (Question Bank)
- **Subject-Chapter Hierarchy**: Organize cropped or manually added questions into a structured database.
- **Question Editor**: Attach question/answer images (Local/URL), write step-by-step solutions, and mark status (Correct/Incorrect).
- **OCR Integration**: Extract text from question images using Tesseract.js directly in the browser.
- **Spaced Repetition (SRS)**: Built-in fields for tracking review intervals and ease factors to optimize memory retention.
- **Zoom & Pan**: High-quality image viewer with zoom/pan functionality for detailed diagrams.
- **Bookmarks**: Save important questions into custom folders for quick access.
- **Export to PDF**: Generate clean, printable PDFs of your saved question sets.

### 5. Music & Zen Mixer
- **Music Hub**: Manage multiple playlists. Import songs via local file upload, direct URLs, or YouTube search.
- **YouTube Integration**: Intelligent detection of YouTube links and full playlist imports using proxy fallbacks (Invidious/Piped).
- **Zen Mixer**: (Integrated via time tracking) Ambient sound management for focused study sessions.

### 6. Calendar & Planning
- **Views**: Toggle between detailed Week views and broad Month views.
- **Event Management**: Create one-time or recurring (Daily/Weekly) events with tagging and color-coding.
- **Status Tracking**: Mark individual occurrences of events as "Done" or "Cancelled" to track session completion.

### 7. Movie Hub
- **Streaming Hub**: TMDB-powered browsing for movies and TV series.
- **Multi-Server Nodes**: Multiple streaming providers with fallback mechanisms.
- **Distraction-Free**: Optimized player area with season/episode selectors.

### 8. Admin & System Management
- **Analytics Dashboard**: Detailed charts for task completion, event distribution, and music source breakdown.
- **Journey Timeline**: Chronological record of milestones, achievements, and study goals.
- **Study Heatmap**: GitHub-style activity grid visualizing time spent over months.
- **Binary Backup & Restore**: Robust ZIP-based system that exports all LocalStorage data AND binary IndexedDB files (PDFs, Videos, Voice notes).
- **Performance Monitor**: Real-time tracking of JS Heap memory, Main Thread CPU load, and Local Storage quota.
- **Profile Management**: Customize username, date of birth, and profile picture. Integrated with Firebase for secure password resets.

### 9. Tags Management
- **Global Tags**: Centralized management of tags used across the app (Todos, Calendar, etc.) with custom color pickers.

## Technical Highlights
- **Persistence**: Combines LocalStorage for metadata and IndexedDB for heavy binary assets.
- **Security**: Focus-stealing protection in the Movie Hub and secure authentication flows.
- **Performance**: Heavy use of `useMemo` and `useCallback` to ensure a smooth 60fps UI despite complex charts and canvas overlays.
- **Responsive**: Mobile-first design for Sidebars and Modals.