<h1 align="center">🐿️ ScurryDB</h1>

<p align="center">
  <strong>A modern, open-source SQL database manager for the web</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#mcp-server-claude-desktop-integration">MCP Server</a> •
  <a href="#development">Development</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <a href="https://github.com/mfirdausazizi/scurrydb/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="License" />
  </a>
  <a href="https://github.com/mfirdausazizi/scurrydb/releases">
    <img src="https://img.shields.io/github/v/release/mfirdausazizi/scurrydb?include_prereleases" alt="Release" />
  </a>
  <a href="https://github.com/mfirdausazizi/scurrydb/stargazers">
    <img src="https://img.shields.io/github/stars/mfirdausazizi/scurrydb" alt="Stars" />
  </a>
</p>

---

## Why ScurryDB?

**phpMyAdmin is showing its age.** Database management shouldn't feel like stepping back to 2005.

ScurryDB is a fresh take on SQL database management — **modern UI, mobile-friendly, and actually pleasant to use**. Whether you're debugging a production issue from your phone or exploring data on your desktop, ScurryDB has you covered.

> **"Scurry through your data"** — Fast, friendly, and free.

---

## Features

### 🔐 User Authentication
- Secure registration and login system
- Argon2id password hashing (OWASP recommended)
- Session-based authentication with secure cookies
- Per-user connection isolation — your connections are private

### 🎨 Modern Interface
- Clean, warm design with dark/light modes
- Responsive layout (mobile, tablet, desktop)
- Beautiful landing page
- Keyboard shortcuts for power users

### 🔌 Multi-Database Support
- **MySQL** ✅
- **MariaDB** ✅
- **PostgreSQL** ✅
- **SQLite** ✅ (file-based databases)

### ✏️ Powerful Query Editor
- Monaco Editor (VS Code's engine)
- SQL syntax highlighting
- Query history (persisted, last 100 queries)
- One-click execution (Ctrl/Cmd+Enter)
- SQL formatting with one click

### 📊 Rich Results Viewer
- TanStack Table with sorting
- Pagination for large datasets
- Export to CSV
- NULL value styling
- Copy cell values to clipboard

### 🗂️ Schema Browser
- Database tree view
- Table structure inspector (columns, types, keys)
- Index information
- Data preview with pagination

### 🔒 Security-First
- Passwords encrypted at rest (AES-256-GCM)
- Runs on your infrastructure
- No data sent to third parties
- Session-based authentication

### 🤖 AI-Powered
- **Natural language to SQL** — Ask in plain English, get SQL queries
- **Multiple AI providers** — OpenAI (GPT-4.1, o3), Anthropic (Claude Sonnet 4), Ollama, custom endpoints
- **Streaming responses** — Real-time AI chat integrated into Query Editor
- **Schema-aware** — AI understands your database structure for accurate queries
- **One-click insert** — Insert generated SQL directly into the editor
- **MCP Server** — Claude Desktop integration for external AI agent access

### 👥 Team Collaboration
- **Team workspaces** — Create and manage teams with a workspace switcher
- **Role-based access** — Owner, Admin, Member, Viewer roles with granular permissions
- **Shared connections** — Share database connections with your team
- **Saved queries** — Save and share queries with your team
- **Query comments** — Collaborate with threaded comments on saved queries
- **Activity feed** — Track team actions (queries saved, connections shared, members joined)
- **Member invitations** — Invite team members via email with expiring tokens

---

## Quick Start

### Using Docker (Recommended)

```bash
# Pull and run ScurryDB
docker run -d \
  --name scurrydb \
  -p 3000:3000 \
  -v scurrydb-data:/app/data \
  -e ENCRYPTION_KEY="your-32-char-secret-key-here!!" \
  ghcr.io/mfirdausazizi/scurrydb:latest

# Open in browser
open http://localhost:3000
```

### Using Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  scurrydb:
    image: ghcr.io/mfirdausazizi/scurrydb:latest
    ports:
      - "3000:3000"
    volumes:
      - scurrydb-data:/app/data
    environment:
      - ENCRYPTION_KEY=your-32-char-secret-key-here!!
    restart: unless-stopped

volumes:
  scurrydb-data:
```

```bash
docker-compose up -d
```

### From Source

```bash
# Clone the repository
git clone https://github.com/mfirdausazizi/scurrydb.git
cd scurrydb

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local and set ENCRYPTION_KEY

# Run development server
npm run dev

# Open http://localhost:3000
```

---

## Screenshots

<p align="center">
  <img src="docs/screenshots/query-editor-dark.png" alt="Query Editor (Dark Mode)" width="800" />
  <br />
  <em>Query Editor with results — Dark Mode</em>
</p>

<p align="center">
  <img src="docs/screenshots/schema-browser.png" alt="Schema Browser" width="800" />
  <br />
  <em>Schema Browser with table structure</em>
</p>

<p align="center">
  <img src="docs/screenshots/mobile-view.png" alt="Mobile View" width="400" />
  <br />
  <em>Fully responsive mobile experience</em>
</p>

---

## Deployment

ScurryDB supports multiple database backends for the application database:

| Backend | Best For | Free Tier |
|---------|----------|-----------|
| **SQLite** | Local development | Free (self-hosted) |
| **Turso** | Serverless (Vercel) | 8GB + 1B reads |
| **PostgreSQL** | Production with teams | Varies by provider |

### Deploy to Vercel with PostgreSQL (Recommended for Teams)

PostgreSQL provides better concurrent write handling for team collaboration features.

**Recommended PostgreSQL providers:**
- **Neon** - 512 MB free tier, serverless
- **Supabase** - 500 MB free tier
- **Vercel Postgres** - Native integration

**Environment Variables:**
```bash
DATABASE_URL=postgres://user:password@host:5432/scurrydb
ENCRYPTION_KEY=your-32-char-key
```

### Deploy to Vercel with Turso

**Quick Setup:**
```bash
cd scurry
./scripts/setup-turso.sh
```

**Environment Variables:**
```bash
TURSO_DATABASE_URL=libsql://scurrydb-yourorg.turso.io
TURSO_AUTH_TOKEN=your-auth-token
ENCRYPTION_KEY=your-32-char-key
```

📖 **Detailed guide:** See [`scurry/VERCEL_DEPLOYMENT.md`](scurry/VERCEL_DEPLOYMENT.md)

### Database Auto-Detection

ScurryDB automatically selects the database based on environment variables:
1. `DATABASE_URL=postgres://...` → PostgreSQL
2. `TURSO_DATABASE_URL` set → Turso
3. Neither set → SQLite (local file)

### Other Deployment Options

- **Docker** (see [Quick Start](#quick-start))
- **Self-hosted** (Node.js server with SQLite)
- **Railway**, **Fly.io**, or any Node.js hosting platform

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENCRYPTION_KEY` | **Yes** | — | Min 16-char key for encrypting passwords (use `openssl rand -hex 16`) |
| `DATABASE_URL` | No | — | PostgreSQL connection string (production) |
| `TURSO_DATABASE_URL` | No | — | Turso database URL (serverless) |
| `TURSO_AUTH_TOKEN` | No | — | Turso authentication token |
| `PORT` | No | `3000` | Port to run the server on |
| `NODE_ENV` | No | `development` | Environment (`development` or `production`) |
| `DB_SSL_REJECT_UNAUTHORIZED` | No | `true` | SSL cert validation; set `false` only for self-signed certs in dev |
| `OPENAI_API_KEY` | No | — | OpenAI API key for AI features |
| `ANTHROPIC_API_KEY` | No | — | Anthropic API key for AI features |
| `OLLAMA_HOST` | No | `http://localhost:11434` | Ollama server URL for local AI |
| `MCP_SERVER_PORT` | No | `3001` | Port for external MCP server |

### Example `.env.local`

```bash
# Required: 32-character encryption key for storing connection passwords
# Generate one: openssl rand -hex 16
ENCRYPTION_KEY=your-32-char-secret-key-here!!

# Optional: Custom port
PORT=3000

# Optional: AI Provider API Keys (configure in app settings)
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# OLLAMA_HOST=http://localhost:11434
```

---

## MCP Server (Claude Desktop Integration)

ScurryDB includes an MCP (Model Context Protocol) server that allows external AI agents like Claude Desktop to interact with your databases.

### Setup for Claude Desktop

Add this to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "scurrydb": {
      "command": "node",
      "args": ["/path/to/scurrydb/dist/mcp-server.cjs"],
      "env": {
        "ENCRYPTION_KEY": "your-32-char-secret-key-here!!",
        "SCURRYDB_DATA_DIR": "/path/to/scurrydb/data"
      }
    }
  }
}
```

### Build the MCP Server

```bash
cd scurrydb
npm run mcp:build
```

### Available Tools

| Tool | Description |
|------|-------------|
| `list_connections` | List all saved database connections |
| `get_schema` | Get table and column information for a connection |
| `execute_query` | Run SQL queries on a database |

### Available Resources

Each database connection is exposed as an MCP resource with its schema information.

---

## Development

### Prerequisites

- Node.js 20+
- npm or pnpm

### Setup

```bash
# Clone and install
git clone https://github.com/mfirdausazizi/scurrydb.git
cd scurrydb
npm install

# Set up environment
cp .env.example .env.local

# Start development server
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript compiler check |

### Project Structure

```
scurrydb/
├── src/
│   ├── app/                # Next.js App Router pages
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── layout/        # Layout components
│   │   ├── connections/   # Connection management
│   │   ├── editor/        # SQL editor
│   │   └── results/       # Query results
│   ├── lib/
│   │   ├── db/            # Database drivers
│   │   ├── store/         # Zustand stores
│   │   └── utils/         # Utilities
│   ├── hooks/             # Custom React hooks
│   └── types/             # TypeScript types
├── public/                # Static assets
├── docker/                # Docker configuration
└── docs/                  # Documentation
```

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) + Radix |
| State Management | [Zustand](https://zustand-demo.pmnd.rs/) |
| SQL Editor | [Monaco Editor](https://microsoft.github.io/monaco-editor/) |
| Data Grid | [TanStack Table](https://tanstack.com/table) |
| Validation | [Zod](https://zod.dev/) |
| Auth | [Argon2id](https://github.com/napi-rs/node-rs) (password hashing) |
| Database Drivers | mysql2, pg, better-sqlite3 |
| AI | [Vercel AI SDK](https://sdk.vercel.ai/), @ai-sdk/openai, @ai-sdk/anthropic |
| MCP | [@modelcontextprotocol/sdk](https://modelcontextprotocol.io/) |

---

## Roadmap

### v0.1.0 — MVP ✅ Complete
- [x] Project setup (Next.js 15, TypeScript, Tailwind CSS v4)
- [x] User authentication (register, login, logout, sessions)
- [x] Connection management (MySQL, PostgreSQL, MariaDB, SQLite)
- [x] SQL query editor with Monaco Editor
- [x] Results viewer with TanStack Table (sorting, pagination)
- [x] Schema browser with table structure inspector
- [x] Dark/light mode toggle
- [x] Landing page with public/authenticated routes
- [x] Per-user connection isolation

### v0.2.0 — AI Integration ✅ Complete
- [x] AI model settings page (OpenAI, Anthropic, Ollama, custom)
- [x] Natural language to SQL queries with streaming
- [x] AI chat interface integrated into Query Editor
- [x] Schema-aware AI with database context injection
- [x] MCP server for Claude Desktop and external AI agents
- [x] Encrypted API key storage (AES-256-GCM)

### v0.3.0 — Collaboration ✅ Complete
- [x] Team workspaces (create, manage, switch)
- [x] Team member management (invite, roles)
- [x] Shared connections with teams
- [x] Saved queries with team sharing
- [x] Query comments
- [x] Activity feed on dashboard

### v1.0.0 — Production Ready
- [ ] Multi-tab query editor
- [ ] SSH tunnel support
- [ ] Import from SQL/CSV
- [ ] Docker production image
- [ ] Documentation site
- [ ] Query execution plans (EXPLAIN)

---

## Contributing

We welcome contributions! Whether it's bug fixes, new features, or documentation improvements — every contribution helps.

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and development process.

### Good First Issues

Looking to contribute? Check out issues labeled [`good first issue`](https://github.com/mfirdausazizi/scurrydb/labels/good%20first%20issue) — they're a great way to get started!

---

## Support

- **🐛 Bug Reports:** [Open an issue](https://github.com/mfirdausazizi/scurrydb/issues/new?template=bug_report.md)
- **💡 Feature Requests:** [Start a discussion](https://github.com/mfirdausazizi/scurrydb/discussions/new?category=ideas)
- **❓ Questions:** [Ask in discussions](https://github.com/mfirdausazizi/scurrydb/discussions/new?category=q-a)

---

## Security

ScurryDB is designed to run on **trusted networks** (localhost, VPN, internal network). If you need to expose it to the internet, we recommend:

1. Running behind a reverse proxy (Caddy, Nginx) with authentication
2. Using a VPN to access your ScurryDB instance
3. Enabling firewall rules to restrict access

Found a security vulnerability? Please email **security@scurrydb.com** instead of opening a public issue.

### Security Configuration

#### Required: Encryption Key

ScurryDB requires an `ENCRYPTION_KEY` environment variable to encrypt sensitive data (database connection passwords, API keys). **The application will not start without it.**

```bash
# Generate a secure 32-character encryption key
openssl rand -hex 16

# Example output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**Requirements:**
- Minimum 16 characters (32 recommended)
- Use a cryptographically random value
- Keep it secret and backed up securely
- Changing it will invalidate all encrypted data

#### SSL/TLS Certificate Validation

By default, ScurryDB validates SSL certificates when connecting to PostgreSQL databases. This protects against man-in-the-middle attacks.

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_SSL_REJECT_UNAUTHORIZED` | `true` | Set to `false` only for self-signed certificates in development |

```bash
# Only use in development with self-signed certificates!
DB_SSL_REJECT_UNAUTHORIZED=false
```

**Warning:** Disabling certificate validation makes connections vulnerable to interception. Never disable in production.

#### Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files to version control
   - Use secrets management in production (AWS Secrets Manager, Vault, etc.)
   - Rotate `ENCRYPTION_KEY` periodically (requires re-encrypting data)

2. **Database Connections**
   - Always use SSL/TLS for remote database connections
   - Use strong, unique passwords for each database
   - Limit database user privileges to minimum required

3. **Network Security**
   - Run ScurryDB on localhost or behind a VPN
   - Use a reverse proxy with HTTPS if exposed publicly
   - Enable firewall rules to restrict access

4. **Data Protection**
   - Connection passwords are encrypted at rest (AES-256-GCM)
   - API keys are encrypted before storage
   - Session tokens are HTTP-only secure cookies

---

## License

ScurryDB is open-source software licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).

This means:
- ✅ Free to use, modify, and distribute
- ✅ Can be used commercially
- ✅ Can be self-hosted by anyone
- ⚠️ Modifications must be shared under AGPL-3.0
- ⚠️ Network use counts as distribution

---

## Acknowledgments

- [phpMyAdmin](https://www.phpmyadmin.net/) — For pioneering web-based database management
- [TablePlus](https://tableplus.com/) — For inspiration on modern database UI
- [shadcn/ui](https://ui.shadcn.com/) — For beautiful, accessible components
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) — For the powerful code editor

---

<p align="center">
  Made with ☕ and 🐿️ energy
  <br />
  <a href="https://github.com/mfirdausazizi/scurrydb">Star us on GitHub</a> if you find ScurryDB useful!
</p>
