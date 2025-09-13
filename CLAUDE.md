# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NoPonto is a time tracking application built with Tauri 2.0, featuring a React + TypeScript frontend and Rust backend. The app allows users to track their 8-hour workday by entering start/end times, calculates remaining work time, and provides custom notifications when the workday is complete.

## Key Commands

### Development
- `npm run tauri dev` - Start development server with hot reload for both frontend and Rust backend
- `npm run dev` - Start only the Vite frontend development server (for frontend-only development)
- `npm run build` - Build the frontend assets
- `npm run tauri build` - Build the complete Tauri application for distribution

### Building and Testing
- `tsc` - Run TypeScript type checking
- `cargo check` - Check Rust code compilation (run from `src-tauri/` directory)
- `cargo build` - Build Rust backend (run from `src-tauri/` directory)

## Architecture Overview

### Frontend-Backend Communication
The app uses Tauri's IPC (Inter-Process Communication) system:
- **Frontend → Backend**: `invoke()` calls to Rust commands (e.g., `start_work_monitoring`)
- **Backend → Frontend**: Event emissions using `app.emit()` for real-time notifications

### Core Components Architecture

**Frontend (React + TypeScript):**
- `App.tsx` - Main application component containing time input form and work status display
- `CustomNotification.tsx` - Custom notification modal with Web Audio API for sound alerts
- Uses Material-UI for consistent design system
- `date-fns` for client-side time calculations and formatting

**Backend (Rust):**
- `lib.rs` - Main application logic with Tauri commands and system tray setup
- Shared state management using `Arc<Mutex<>>` for thread-safe work status tracking
- Background monitoring with `tokio::spawn` for asynchronous time tracking
- System tray integration with context menu (Show/Quit options)

### Data Flow
1. User inputs work times (início1, fim1, início2) in React frontend
2. Frontend calculates work progress and calls `start_work_monitoring` Rust command
3. Rust backend spawns background task to monitor work completion
4. Backend emits events (`work_complete`, `work_almost_complete`) to frontend
5. Frontend displays custom notifications with sound alerts
6. Data persists using Tauri's store plugin

### System Tray & Background Operation
- App continues running when window is closed (prevents exit on close button)
- System tray provides access to show window or quit application
- Background monitoring continues even when window is hidden

## Key Features

### Custom Notification System
- Independent of OS notification settings
- Uses Web Audio API for guaranteed sound playback
- Modal-based UI notifications that can't be missed

### Time Calculation Logic
- Supports split workday (morning period + afternoon period)
- Automatically calculates time needed to complete 8-hour workday
- Real-time updates every minute while monitoring

### Data Persistence
- Uses Tauri's store plugin for local data storage
- Automatically saves and restores time input data
- Cross-platform storage location handling

## Dependencies

### Frontend
- React 18 + TypeScript for UI framework
- Material-UI v7 for design system and components
- `date-fns` for date/time manipulation
- `@tauri-apps/api` and plugins for Tauri integration

### Backend (Rust)
- Tauri 2.0 with `tray-icon` and `image-png` features
- `chrono` for robust date/time handling
- `tokio` for async runtime and background tasks
- `serde` for JSON serialization between frontend/backend

## Development Notes

When modifying time tracking logic:
- Update both frontend (`App.tsx`) and backend (`lib.rs`) time calculations
- Ensure timezone handling is consistent between Rust (`chrono::Local`) and TypeScript (`date-fns`)
- Test notification events work correctly across the IPC boundary

When adding new Tauri commands:
- Add command function in `src-tauri/src/lib.rs`
- Include in `generate_handler![]` macro
- Add corresponding `invoke()` calls in frontend

System tray modifications require updating the `create_system_tray()` function and menu event handlers.