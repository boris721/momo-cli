# momo-cli

CLI for [momo.coach](https://momo.coach) time tracking API.

## Installation

```bash
git clone https://github.com/boris721/momo-cli
cd momo-cli
npm link
```

## Setup

Get your API credentials from momo.coach settings, then:

```bash
momo auth <secret_key> <client_id>
```

Verify with:
```bash
momo auth status
```

## Usage

### Stopwatch

```bash
momo sw              # Show current stopwatch status
momo sw start        # Start the stopwatch
momo sw pause        # Pause the stopwatch
momo sw stop         # Stop and reset stopwatch
```

### Logging Time

Using the stopwatch:
```bash
momo sw start
# ... work ...
momo log myproject "What I worked on"
# Logs elapsed time and resets stopwatch
```

Manual time entry:
```bash
momo log 01:30 myproject "1.5 hours of work"
```

### Other Commands

```bash
momo status          # Show today's timelogs
momo help            # Show help
```

## Configuration

Credentials are stored in `~/.config/momo-cli/config.json`

## API Reference

- Base URL: `https://api.momo.coach`
- Auth: `Authorization: Bearer <secret>` + `Clientid: <client_id>`

Endpoints:
- `GET /stopwatch` - Get stopwatch state
- `POST /stopwatch` - Start stopwatch
- `PUT /stopwatch` - Pause stopwatch
- `DELETE /stopwatch` - Stop/reset stopwatch
- `POST /time` - Create timelog

## Development

```bash
npm test
```

## License

MIT © Boris & Paul Panserrieu
