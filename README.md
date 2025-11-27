<h1 align="center">🐿️ Scurry</h1>

<p align="center">
  <strong>A modern, open-source SQL database manager for the web</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#development">Development</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <a href="https://github.com/YOUR_USERNAME/scurry/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="License" />
  </a>
  <a href="https://github.com/YOUR_USERNAME/scurry/releases">
    <img src="https://img.shields.io/github/v/release/YOUR_USERNAME/scurry?include_prereleases" alt="Release" />
  </a>
  <a href="https://github.com/YOUR_USERNAME/scurry/stargazers">
    <img src="https://img.shields.io/github/stars/YOUR_USERNAME/scurry" alt="Stars" />
  </a>
</p>

---

## Why Scurry?

**phpMyAdmin is showing its age.** Database management shouldn't feel like stepping back to 2005.

Scurry is a fresh take on SQL database management — **modern UI, mobile-friendly, and actually pleasant to use**. Whether you're debugging a production issue from your phone or exploring data on your desktop, Scurry has you covered.

> **"Scurry through your data"** — Fast, friendly, and free.

---

## Features

### 🎨 Modern Interface
- Clean, warm design with dark/light modes
- Responsive layout that works on mobile, tablet, and desktop
- Keyboard shortcuts for power users

### 🔌 Multi-Database Support
- **MySQL** / **MariaDB**
- **PostgreSQL**
- **SQLite**
- More coming soon...

### ✏️ Powerful Query Editor
- Syntax highlighting with Monaco Editor (VS Code's editor)
- Intelligent SQL autocomplete
- Query history and favorites
- One-click query execution

### 📊 Rich Results Viewer
- Fast, sortable data grid
- Export to CSV, JSON, SQL
- Inline data editing (coming soon)
- JSON column expansion

### 🗂️ Schema Browser
- Visual database structure explorer
- Table columns, indexes, and foreign keys
- Quick data preview

### 🔒 Security-Conscious
- Passwords encrypted at rest
- Runs on your infrastructure
- No data sent to third parties

---

## Quick Start

### Using Docker (Recommended)

```bash
# Pull and run Scurry
docker run -d \
  --name scurry \
  -p 3000:3000 \
  -v scurry-data:/app/data \
  -e ENCRYPTION_KEY="your-32-char-secret-key-here!!" \
  ghcr.io/YOUR_USERNAME/scurry:latest

# Open in browser
open http://localhost:3000
```

### Using Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  scurry:
    image: ghcr.io/YOUR_USERNAME/scurry:latest
    ports:
      - "3000:3000"
    volumes:
      - scurry-data:/app/data
    environment:
      - ENCRYPTION_KEY=your-32-char-secret-key-here!!
    restart: unless-stopped

volumes:
  scurry-data:
```

```bash
docker-compose up -d
```

### From Source

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/scurry.git
cd scurry

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

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENCRYPTION_KEY` | Yes | — | 32-character key for encrypting connection passwords |
| `PORT` | No | `3000` | Port to run the server on |
| `NODE_ENV` | No | `development` | Environment (`development` or `production`) |

### Example `.env.local`

```bash
# Required: 32-character encryption key for storing connection passwords
# Generate one: openssl rand -hex 16
ENCRYPTION_KEY=your-32-char-secret-key-here!!

# Optional: Custom port
PORT=3000
```

---

## Development

### Prerequisites

- Node.js 20+
- npm or pnpm

### Setup

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/scurry.git
cd scurry
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
scurry/
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
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) |
| State Management | [Zustand](https://zustand-demo.pmnd.rs/) |
| SQL Editor | [Monaco Editor](https://microsoft.github.io/monaco-editor/) |
| Data Grid | [TanStack Table](https://tanstack.com/table) |
| Validation | [Zod](https://zod.dev/) |
| Database Drivers | mysql2, pg, better-sqlite3 |

---

## Roadmap

### v0.1.0 — MVP ✨
- [x] Project setup
- [ ] Connection management (MySQL, PostgreSQL)
- [ ] SQL query editor with syntax highlighting
- [ ] Results viewer with sorting/pagination
- [ ] Schema browser
- [ ] Dark/light mode
- [ ] Docker deployment

### v0.5.0 — Polish
- [ ] SQLite and MariaDB support
- [ ] Query history and favorites
- [ ] Table creation/modification GUI
- [ ] Data export (CSV, JSON, SQL)
- [ ] Inline data editing
- [ ] Keyboard shortcuts

### v1.0.0 — Feature Complete
- [ ] Multi-tab query editor
- [ ] Query execution plans (EXPLAIN)
- [ ] SSH tunnel support
- [ ] Import from SQL/CSV
- [ ] Schema visualization

### Future (Community-Driven)
- [ ] Natural language to SQL (AI)
- [ ] Real-time collaboration
- [ ] Plugin system

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

Looking to contribute? Check out issues labeled [`good first issue`](https://github.com/YOUR_USERNAME/scurry/labels/good%20first%20issue) — they're a great way to get started!

---

## Support

- **🐛 Bug Reports:** [Open an issue](https://github.com/YOUR_USERNAME/scurry/issues/new?template=bug_report.md)
- **💡 Feature Requests:** [Start a discussion](https://github.com/YOUR_USERNAME/scurry/discussions/new?category=ideas)
- **❓ Questions:** [Ask in discussions](https://github.com/YOUR_USERNAME/scurry/discussions/new?category=q-a)

---

## Security

Scurry is designed to run on **trusted networks** (localhost, VPN, internal network). If you need to expose it to the internet, we recommend:

1. Running behind a reverse proxy (Caddy, Nginx) with authentication
2. Using a VPN to access your Scurry instance
3. Enabling firewall rules to restrict access

Found a security vulnerability? Please email **security@[your-domain].com** instead of opening a public issue.

---

## License

Scurry is open-source software licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).

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
  <a href="https://github.com/YOUR_USERNAME/scurry">Star us on GitHub</a> if you find Scurry useful!
</p>
