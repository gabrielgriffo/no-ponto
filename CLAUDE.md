# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NoPonto is a sophisticated desktop time tracking application built with Tauri 2.0, featuring a modern React + TypeScript frontend and high-performance Rust backend. The application enables professionals to accurately track their 8-hour workday with intelligent time calculations, dual notification systems (native OS + custom overlay), real-time progress monitoring, and seamless background operation via system tray integration.

### Key Value Propositions
- **Precision Time Tracking**: Accurate calculations with automatic validation and real-time updates
- **Dual Notification System**: Both native OS notifications and custom overlay notifications with sound
- **Background Operation**: Continues monitoring even when window is minimized to system tray
- **Data Persistence**: Automatic save/restore of time entries with cross-platform compatibility
- **User Experience**: Modern Material-UI interface with intuitive time input and progress visualization

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

## Project Structure & File Organization

### Root Directory
```
no-ponto/
├── 📁 .claude/                    # Claude Code configuration
│   └── settings.local.json        # Local Claude Code settings
├── 📁 .vscode/                    # VS Code configuration
│   └── extensions.json           # Recommended extensions
├── 📁 public/                     # Static assets
│   ├── notification.html          # Custom notification template
│   ├── tauri.svg                  # Tauri logo
│   └── vite.svg                   # Vite logo
├── 📁 src/                        # React frontend source
│   ├── 📁 assets/                 # Frontend assets
│   │   └── react.svg              # React logo
│   ├── 📁 components/             # React components
│   │   └── CustomNotification.tsx # Custom notification modal component
│   ├── App.css                    # Global styles (minimal usage)
│   ├── App.tsx                    # Main application component
│   ├── main.tsx                   # React application entry point
│   └── vite-env.d.ts              # Vite environment types
├── 📁 src-tauri/                  # Rust backend source
│   ├── 📁 capabilities/           # Tauri permissions
│   │   └── default.json           # Default capability set
│   ├── 📁 gen/                    # Generated schemas (auto-created)
│   │   └── 📁 schemas/            # JSON schemas for configuration
│   ├── 📁 icons/                  # Application icons (multiple formats)
│   │   ├── 32x32.png              # Small icon
│   │   ├── 128x128.png            # Medium icon
│   │   ├── icon.ico               # Windows icon
│   │   ├── icon.icns              # macOS icon
│   │   └── [various other sizes]  # Platform-specific icons
│   ├── 📁 src/                    # Rust source code
│   │   ├── lib.rs                 # Main library with business logic
│   │   └── main.rs                # Application entry point
│   ├── 📁 target/                 # Rust build output (ignored in git)
│   ├── build.rs                   # Rust build script
│   ├── Cargo.toml                 # Rust dependencies and metadata
│   └── tauri.conf.json            # Tauri application configuration
├── 📁 node_modules/               # NPM dependencies (ignored in git)
├── .gitignore                     # Git ignore patterns
├── CLAUDE.md                      # This file - Claude Code guidance
├── README.md                      # Project documentation
├── index.html                     # Main HTML template
├── package.json                   # NPM dependencies and scripts
├── package-lock.json              # NPM dependency lock file
├── tsconfig.json                  # TypeScript configuration
├── tsconfig.node.json             # TypeScript configuration for Node.js
└── vite.config.ts                 # Vite build tool configuration
```

### Key File Responsibilities

#### Frontend Files (`src/`)
- **`App.tsx`** - Main application logic, time input forms, progress display, IPC communication
- **`components/CustomNotification.tsx`** - Modal notification component with Web Audio API integration
- **`main.tsx`** - React DOM mounting point and global providers setup

#### Backend Files (`src-tauri/src/`)
- **`lib.rs`** - Core business logic, Tauri commands, system tray, background monitoring
- **`main.rs`** - Minimal entry point that calls the main library

#### Configuration Files
- **`src-tauri/tauri.conf.json`** - Application metadata, window settings, security policies
- **`src-tauri/capabilities/default.json`** - Permission definitions for IPC and system access
- **`src-tauri/Cargo.toml`** - Rust dependencies, features, and project metadata
- **`package.json`** - NPM dependencies, scripts, and frontend project metadata

#### Build & Development Files
- **`vite.config.ts`** - Frontend build configuration, dev server settings
- **`tsconfig.json`** - TypeScript compiler options for the frontend
- **`src-tauri/build.rs`** - Rust build script for Tauri-specific compilation steps

### Directory Guidelines

#### Where to Add New Features
- **Frontend Components**: Add to `src/components/` with proper TypeScript typing
- **Backend Commands**: Add to `src-tauri/src/lib.rs` in the commands section
- **Static Assets**: Place in `public/` for web-accessible resources
- **Type Definitions**: Add to existing `.d.ts` files or create new ones in `src/`

#### Files to Never Modify Manually
- **`src-tauri/target/`** - Rust compilation output (auto-generated)
- **`src-tauri/gen/`** - Tauri-generated schemas (auto-generated)
- **`node_modules/`** - NPM dependencies (managed by package manager)
- **`package-lock.json`** - NPM lock file (managed by NPM)

#### Configuration Hierarchy
1. **`src-tauri/tauri.conf.json`** - Main Tauri app configuration
2. **`src-tauri/capabilities/default.json`** - Security permissions
3. **`vite.config.ts`** - Frontend build configuration
4. **`tsconfig.json`** - TypeScript compilation rules

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

## Key Features & Implementation Details

### Dual Notification System
**Native OS Notifications:**
- Uses `tauri-plugin-notification` for system-level notifications
- Appears in the OS notification center (Windows Action Center, macOS Notification Center)
- Respects system Do Not Disturb settings
- Includes app icon and custom messaging

**Custom Overlay Notifications:**
- Independent modal-based notifications that bypass OS settings
- Built with Material-UI components for consistent design
- Uses Web Audio API for guaranteed sound playback
- Auto-dismisses after 8 seconds with progress indicator
- Positioned at screen center with always-on-top behavior

### Advanced Time Calculation Engine
**Split Workday Support:**
- **Period 1**: Morning work session (início1 → fim1)
- **Interval**: Lunch break (fim1 → início2)
- **Period 2**: Afternoon session (início2 → completion)
- **Auto-calculation**: Determines exact time needed to reach 8-hour total

**Real-time Monitoring:**
- Updates every 60 seconds using `tokio::spawn` background tasks
- Calculates remaining time with minute precision
- Estimates completion time based on current progress
- Handles timezone changes and system clock adjustments

**Input Validation:**
- Real-time validation of HH:MM format during typing
- Prevents invalid time sequences (e.g., start > end times)
- Visual feedback with error highlighting for invalid inputs
- Automatic formatting and constraint enforcement

### Intelligent Data Persistence
**Automatic State Management:**
- Uses Tauri Store plugin for cross-platform data storage
- Saves time inputs immediately on change (no manual save needed)
- Restores previous session data on application restart
- Maintains monitoring state across app sessions

**Storage Locations:**
- **Windows**: `%APPDATA%/NoPonto/`
- **macOS**: `~/Library/Application Support/NoPonto/`
- **Linux**: `~/.local/share/NoPonto/`

### System Integration Features
**System Tray Operations:**
- Continues running when window is closed (background mode)
- Right-click menu with "Show" and "Quit" options
- Visual tray icon indicates app status
- Click-to-restore window functionality

**Window Management:**
- Fixed size window (600x800) optimized for time input
- Prevents accidental resizing or maximizing
- Centers on screen on first launch
- Remembers window position between sessions

## Dependencies & Technology Stack

### Frontend Dependencies
**Core Framework:**
- **React 18** - Modern UI framework with Hooks and Concurrent Features
- **TypeScript 5.6** - Static typing for enhanced developer experience
- **Vite 6.0** - Fast build tool with Hot Module Replacement

**UI & Styling:**
- **Material-UI v7** (@mui/material) - Complete design system with theming
- **@mui/icons-material** - Comprehensive icon library
- **@emotion/react** + **@emotion/styled** - CSS-in-JS styling solution

**Utilities:**
- **date-fns 4.1** - Lightweight date manipulation library with timezone support
- **@tauri-apps/api** - Core Tauri APIs for system integration
- **@tauri-apps/plugin-store** - Data persistence across app sessions
- **@tauri-apps/plugin-notification** - Native system notifications
- **@tauri-apps/plugin-opener** - System-level file/URL opening

### Backend Dependencies (Rust)
**Core Framework:**
- **Tauri 2.8** - Desktop app framework with IPC and system integration
- **tauri-plugin-store 2.4** - Cross-platform data storage
- **tauri-plugin-notification 2.3** - Native notification support
- **tauri-plugin-opener 2.5** - System file/URL operations

**System & Concurrency:**
- **tokio 1.47** - Async runtime for background tasks and timers
- **chrono 0.4** - Date/time manipulation with timezone awareness
- **serde 1.0** + **serde_json 1.0** - Serialization for IPC communication

**Desktop Integration:**
- **tray-icon 0.21** - System tray functionality
- **muda 0.17** - Cross-platform menu creation
- **window-vibrancy 0.6** - Window effects and transparency

**Build Tools:**
- **tauri-build 2.4** - Build-time code generation and resource bundling
- **embed-resource 3.0** - Windows resource embedding

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

## Code Patterns & Best Practices

### IPC Communication Patterns
**Frontend → Backend Commands:**
```typescript
// Always use proper error handling
try {
  await invoke('command_name', { param1: value1 });
} catch (error) {
  console.error('Command failed:', error);
}
```

**Backend → Frontend Events:**
```rust
// Emit events for state changes
let _ = app.emit("event_name", payload);
```

**Event Listening in Frontend:**
```typescript
// Clean up listeners properly
useEffect(() => {
  const unlisten = await listen('event_name', handler);
  return () => { unlisten(); };
}, []);
```

### State Management Guidelines
**Frontend State:**
- Use React hooks for local component state
- Material-UI themes for consistent styling
- Store plugin for persistent data only

**Backend State:**
- Use `Arc<Mutex<T>>` for shared state between threads
- Keep state minimal and focused on business logic
- Emit events for state changes that affect UI

### Error Handling Conventions
**Rust Backend:**
- Return `Result<T, String>` from all Tauri commands
- Use `println!` for debugging (visible in dev console)
- Handle all errors gracefully without panicking

**TypeScript Frontend:**
- Use try-catch blocks around all `invoke()` calls
- Display user-friendly error messages in UI
- Log detailed errors to browser console

## Troubleshooting Guide

### Common Development Issues

**Problem**: "Port 1420 already in use"
**Solution**: Kill existing dev server processes or restart terminal

**Problem**: Notification permissions not working
**Solution**: Check `src-tauri/capabilities/default.json` includes `"notification:default"`

**Problem**: System tray not appearing
**Solution**: Ensure Windows has system tray enabled in taskbar settings

**Problem**: Background monitoring stops
**Solution**: Check for panics in Rust code; use proper error handling in async tasks

**Problem**: Time validation errors
**Solution**: Verify `validateTimeSequence()` logic matches business requirements

### Build Issues

**Problem**: Rust compilation fails
**Solution**:
1. Run `cargo clean` in `src-tauri/`
2. Check Rust version compatibility with dependencies
3. Verify all features are properly enabled in `Cargo.toml`

**Problem**: Frontend build fails
**Solution**:
1. Delete `node_modules/` and `package-lock.json`
2. Run `npm install` to reinstall dependencies
3. Check TypeScript errors with `tsc --noEmit`

### Runtime Issues

**Problem**: App crashes on startup
**Solution**: Check Tauri command registration in `generate_handler![]` macro

**Problem**: Notifications not showing
**Solution**: Verify both system permissions and custom notification implementation

**Problem**: Data not persisting
**Solution**: Check Tauri Store plugin initialization and file permissions

## Security Considerations

### Permission Management
- **Principle of Least Privilege**: Only request necessary permissions in `capabilities/default.json`
- **IPC Security**: Validate all inputs from frontend in Rust commands
- **File System Access**: Use Tauri's sandboxed file operations only

### Data Protection
- **Local Storage Only**: No external network requests or data transmission
- **Encryption**: Consider encrypting sensitive time data if required
- **User Privacy**: No telemetry or analytics collection

## Performance Optimization Tips

### Frontend Performance
- **React Optimization**: Use `useMemo` and `useCallback` for expensive calculations
- **Material-UI**: Import components individually to reduce bundle size
- **Time Updates**: Limit re-renders to once per minute for time displays

### Backend Performance
- **Async Operations**: Use `tokio::spawn` for background tasks
- **Memory Management**: Avoid memory leaks in long-running background processes
- **IPC Efficiency**: Minimize data serialization overhead in command parameters

## Future Enhancement Guidelines

### Adding New Features
1. **Design First**: Plan UI/UX changes with Material-UI components
2. **Backend Logic**: Implement business logic in Rust with proper error handling
3. **IPC Integration**: Add new commands to `lib.rs` and update frontend calls
4. **Testing**: Verify cross-platform compatibility and edge cases
5. **Documentation**: Update this CLAUDE.md file with new patterns

### Code Quality Standards
- **TypeScript**: Maintain strict typing without `any` usage
- **Rust**: Follow Rust conventions with proper ownership and borrowing
- **Formatting**: Use `cargo fmt` and Prettier for consistent code style
- **Linting**: Address all warnings from `cargo clippy` and ESLint