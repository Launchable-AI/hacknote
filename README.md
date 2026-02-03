# HACKNOTE

A cyberpunk-styled project management, todo list, and notes app.

## Features

- **Notes** - Rich text editor with markdown support
- **Todo Lists** - Task management with filters
- **Kanban Boards** - Drag-and-drop project boards
- **Canvas** - Drawing and diagramming tool
- **Workspaces** - Organize pages into groups
- **Themes** - Cyberpunk, light, and dark modes

## Requirements

- Node.js 18+

## Installation

```bash
git clone <repo-url>
cd hacknote
npm install
```

## Usage

```bash
npm start
```

Open http://localhost:3000 in your browser.

## Data Storage

All data is stored locally in `hacknote.db` (SQLite). Data persists across restarts.

## Demo Video

https://github.com/user-attachments/assets/c8422bce-0781-4e86-a837-98aaad9cc1d7

To regenerate the demo locally (requires the server running on port 3000):

```bash
npm run demo
```

## License

MIT
