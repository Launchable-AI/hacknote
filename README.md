# HACKNOTE

Cyberpunk-themed project management system with notes, todos, kanban boards, and a canvas whiteboard.

![Dark Mode](https://img.shields.io/badge/theme-dark-0a0a0f?style=flat-square&labelColor=12121a&color=00ff9d)
![Light Mode](https://img.shields.io/badge/theme-light-f0f0f5?style=flat-square&labelColor=e4e4ec&color=00995e)

## Features

- **Workspaces** — organize pages into separate contexts
- **Notes** — rich text editor with markdown mode, image support (upload, drag-drop, paste)
- **Todos** — task lists with filtering (all / active / completed)
- **Kanban boards** — drag-and-drop cards across Backlog, In Progress, Review, Done
- **Canvas** — drawing whiteboard powered by [Hackerpad](https://github.com/Launchable-AI/hackerpad), with fullscreen mode
- **Light / dark theme** — toggle in settings, syncs with canvas iframe
- **Accent colors** — 5 neon color options
- **Import / export** — full JSON backup and restore
- **Persistent storage** — SQLite database, auto-saves on every change

## Quick Start

```bash
npm install
node server.js
```

Opens at `http://localhost:3000` (auto-finds an available port if 3000 is taken).

## Project Structure

```
hacknote/
├── index.html          # SPA entry point
├── js/app.js           # HackNote + IframeCanvasEditor classes
├── css/style.css       # Theming via CSS custom properties
├── server.js           # Express server, static files + JSON API
├── db.js               # SQLite persistence (single JSON blob)
├── hackerpad/          # Git submodule — canvas editor
└── hacknote.db         # SQLite database (created on first run)
```

## Tech Stack

- **Frontend:** Vanilla JS, HTML, CSS (no build step)
- **Backend:** Node.js, Express
- **Database:** SQLite via better-sqlite3
- **Canvas:** [Hackerpad](https://github.com/Launchable-AI/hackerpad) embedded via iframe + postMessage API

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+N` | New page |
| `Ctrl+S` | Save (intercepted) |
| `F` | Toggle canvas fullscreen |
| `Escape` | Close modal / exit fullscreen |

## API

Two endpoints power the persistence layer:

- `GET /api/data` — returns `{ workspaces, pages, settings }`
- `POST /api/data` — saves the full state object

Canvas pages are served from the hackerpad submodule at `/canvas`.

## Canvas Integration

Hackerpad runs in an iframe and communicates via postMessage:

| Message | Direction | Purpose |
|---------|-----------|---------|
| `hackerpad:ready` | child → parent | Iframe loaded, ready for data |
| `hackerpad:load` | parent → child | Send canvas objects to display |
| `hackerpad:changed` | child → parent | Canvas was edited (triggers auto-save) |
| `hackerpad:setTheme` | parent → child | Sync light/dark theme |
| `hackerpad:clear` | parent → child | Clear all canvas objects |
| `hackerpad:getObjects` | parent → child | Request current objects |
| `hackerpad:objects` | child → parent | Response with current objects |
