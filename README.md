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
- **Project CRUD** — Create, list, update, and delete projects with custom colors
- **Multi-account** — Named profiles with `--profile` flag for multiple users
- **Timelog management** — Delete incorrect timelogs
- **Zero dependencies** — Uses only Node.js built-in modules (native `fetch`)
- **Config-driven** — Credentials stored in `~/.config/momo-cli/`
- **AI-friendly** — Full CLI for automation and AI assistants 🤖

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

### Authentication

```bash
# Single account (default profile)
momo auth <secret_key> <client_id>

# Multiple accounts
momo auth paul <secret_key> <client_id>
momo auth boris <secret_key> <client_id>
momo auth default paul          # Set default profile

# Manage profiles
momo auth status                # Show all profiles
momo auth list                  # List profile names
momo auth delete boris          # Delete a profile
```

---

## 🔧 CLI Commands

### Stopwatch

```bash
momo sw              # Show current stopwatch status
momo sw start        # Start the stopwatch
momo sw pause        # Pause the stopwatch
momo sw stop         # Stop and reset stopwatch
momo sw --profile paul    # Use specific profile
```

### Logging Time

```bash
# Using the stopwatch (logs elapsed time, then resets)
momo sw start
# ... work ...
momo log myproject "What I worked on"
momo log --profile paul myproject "Log to paul's account"

# Manual time entry
momo log 01:30 myproject "1.5 hours of work"
```

### Daily Status

```bash
momo status          # Show today's timelogs (default profile)
momo status --profile paul   # Show today's timelogs for paul
momo status --ids            # Show timelogs with IDs (for deletion)
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

### Delete Timelogs

```bash
momo status --ids                              # Get timelog IDs
momo timelog delete <id> --force               # Delete a timelog
momo timelog delete <id> --force --profile paul # On specific profile
```

### Projects

```bash
momo project list                              # List all projects
momo project list --profile paul               # List paul's projects
momo project add "New Project"                 # Create project
momo project add "Client X" --color #3498db    # With color
momo project add "Side Project" --description "Weekend hacking"
momo project update "Client X" --color #e74c3c # Update color
momo project update "Client X" --description "New desc"
momo project delete "Old Project" --force      # Delete project
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

### Options

```bash
--profile NAME    Use a specific profile (default: uses default profile)
--force           Confirm destructive actions without prompt
```

### Environment

```bash
MOMO_PROFILE      Default profile name (overrides config default)
```

---

## ⚙️ Configuration

Credentials are stored in `~/.config/momo-cli/config.json`:

### Single account (legacy format — auto-migrated)

```json
{
  "secret": "sk-...",
  "clientId": "momo-..."
}
```

### Multiple accounts (current format)

```json
{
  "default": "paul",
  "profiles": {
    "paul": {
      "secret": "sk-...",
      "clientId": "momo-..."
    },
    "boris": {
      "secret": "sk-...",
      "clientId": "momo-..."
    }
  }
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
  config.js          # Config loading/saving (multi-profile)
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
| `/time/delete` | POST | Delete timelog `{id}` |
| `/time/range/from/{from}/to/{to}` | GET | Get timelogs for date range |
| `/project` | GET | List projects |
| `/project` | POST | Create project |
| `/project` | PUT | Update project |
| `/project/delete` | POST | Delete project `{id}` |
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
