# ⏱️ momo-cli

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Command-line interface for [momo.coach](https://momo.coach) time tracking.**

Track your work hours from the terminal. Start a stopwatch, log time to projects, and view your daily timelogs — all without leaving the command line.

---

## ✨ Features

- **Stopwatch** — Start, pause, and stop a running timer
- **Time logging** — Log time to projects with descriptions
- **Manual entries** — Add time entries directly (HH:MM format)
- **Daily status** — View today's timelogs with colored project indicators
- **Project management** — List and create projects with custom colors
- **Zero dependencies** — Uses only Node.js built-in modules (native `fetch`)
- **Config-driven** — Credentials stored in `~/.config/momo-cli/`

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (uses native `fetch`)
- A [momo.coach](https://momo.coach) account

### Installation

```bash
# Clone the repository
git clone https://github.com/boris721/momo-cli.git
cd momo-cli

# Make it available globally
npm link
```

### Setup

Get your API credentials from your momo.coach account settings, then:

```bash
# Store credentials
momo auth <secret_key> <client_id>

# Verify authentication
momo auth status
```

---

## 🔧 CLI Commands

### Stopwatch

```bash
momo sw              # Show current stopwatch status
momo sw start        # Start the stopwatch
momo sw pause        # Pause the stopwatch
momo sw stop         # Stop and reset stopwatch
```

### Logging Time

```bash
# Using the stopwatch (logs elapsed time, then resets)
momo sw start
# ... work ...
momo log myproject "What I worked on"

# Manual time entry
momo log 01:30 myproject "1.5 hours of work"
```

### Daily Status

```bash
momo status
```

Output:
```
Timelogs for 2026-02-13:
  ██  01:00  [momo]      "API development"
  ██  00:30  [momo-cli]  "CLI improvements"
  ██  00:45  [admin]     "Email setup"
  ─────────────────────────
  02:15  TOTAL
```

Each timelog shows a colored square matching the project color.

### Projects

```bash
momo project list                              # List all projects
momo project add "New Project"                 # Create project
momo project add "Client X" --color #3498db    # With color
momo project add "Side Project" --description "Weekend hacking"
```

### Colors

```bash
momo colors          # Show available colors for projects
```

### Other

```bash
momo help            # Show help
momo --version       # Show version
```

---

## ⚙️ Configuration

Credentials are stored in `~/.config/momo-cli/config.json`:

```json
{
  "secret": "sk-...",
  "clientId": "momo-..."
}
```

---

## 🏗️ Architecture

```
bin/
  momo               # CLI entry point
lib/
  api.js             # HTTP client for momo.coach API
  commands.js        # Command implementations
  config.js          # Config loading/saving
  format.js          # Time formatting utilities
test/
  *.test.js          # Unit tests
```

---

## 📡 API Reference

Base URL: `https://api.momo.coach`

Authentication headers:
- `Authorization: Bearer <secret>`
- `Clientid: <client_id>`

| Endpoint | Method | Description |
|---|---|---|
| `/stopwatch` | GET | Get stopwatch state |
| `/stopwatch` | POST | Start stopwatch |
| `/stopwatch` | PUT | Pause stopwatch |
| `/stopwatch` | DELETE | Stop/reset stopwatch |
| `/time` | POST | Create timelog |
| `/time/range/from/{from}/to/{to}` | GET | Get timelogs for date range |
| `/project` | GET | List projects |
| `/project` | POST | Create project |
| `/color` | GET | List available colors |

---

## 🧪 Testing

```bash
npm test
```

Tests use Node.js built-in test runner.

---

## 📄 License

[MIT](LICENSE) © 2026 Boris & Paul Panserrieu
