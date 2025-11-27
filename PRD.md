# Product Requirements Document (PRD)
# 🐿️ Scurry — Modern Web-Based SQL Database Manager

**Version:** 1.4  
**Date:** November 2025  
**Author:** Firdaus  
**Status:** Active Development (Phase 1 Complete)  
**Project Type:** Open Source Hobby Project  
**License:** AGPL-3.0  
**Development Approach:** AI-Assisted (Factory Droid)

---

## 1. Executive Summary

Scurry is a modern, open-source, web-based SQL database management platform designed to replace legacy tools like phpMyAdmin with a secure, user-friendly, and mobile-responsive solution. Built as a hobby project and released under the AGPL-3.0 license, Scurry enables developers and database administrators to manage MySQL, PostgreSQL, MariaDB, and SQLite databases through an intuitive interface.

### 1.1 Vision Statement

To create a free, open-source alternative to legacy database management tools that prioritizes modern UX, mobile accessibility, and developer experience — built by the community, for the community.

### 1.2 Key Differentiators

- **100% Open Source:** AGPL-3.0 licensed, free forever, community-driven
- **Modern UI/UX:** Warm, approachable interface with dark/light modes
- **Mobile-First Design:** Full functionality on tablets and smartphones
- **Self-Hosted:** Run on your own infrastructure, no vendor lock-in
- **AI-Assisted Development:** Built with Factory Droid for rapid iteration
- **AI-Powered Queries:** Natural language to SQL with configurable AI models (OpenAI, Anthropic, Ollama)
- **MCP Integration:** Model Context Protocol server for external AI agent access to your databases

### 1.3 Why "Scurry"?

- **Action-Oriented:** Implies speed, agility, and quick movement through your data
- **Squirrel Energy:** What squirrels do — keeps the playful, industrious vibe
- **Memorable:** Short, punchy, easy to spell and remember
- **Unique:** No conflicts in the database tool space
- **Verb Power:** "Scurry through your data" — natural product language

### 1.4 Project Philosophy

As a hobby project, Scurry prioritizes:
- **Fun over perfection:** Ship early, iterate often, enjoy the process
- **Learning:** Explore new technologies and patterns
- **Community:** Welcome contributions, be inclusive
- **Sustainability:** Keep scope manageable, avoid burnout

### 1.5 Development Approach

This project is built using **Factory Droid** — an AI-powered software development platform that uses autonomous agents to handle coding tasks. This enables:
- Rapid prototyping and iteration
- Consistent code quality through AI-assisted review
- Focus on architecture and UX decisions while delegating implementation
- Faster progression from idea to working feature

### 1.6 Licensing

**License:** GNU Affero General Public License v3.0 (AGPL-3.0)

**Why AGPL-3.0?**
- Ensures the project remains open source
- Requires anyone running Scurry as a service to share their modifications
- Protects against proprietary forks while allowing commercial use
- Encourages contributions back to the community

**What this means:**
- ✅ Free to use, modify, and distribute
- ✅ Can be used commercially
- ✅ Can be self-hosted by anyone
- ⚠️ Modifications must be shared under AGPL-3.0
- ⚠️ Network use counts as distribution (SaaS providers must open-source)

---

## 2. Brand Identity & Design System

### 2.1 Brand Personality

| Attribute | Description | Avoid |
|-----------|-------------|-------|
| **Swift** | Fast, efficient, nimble | Sluggish, bloated, slow |
| **Friendly** | Approachable, warm, never intimidating | Cold, corporate, sterile |
| **Clever** | Smart solutions, delightful details | Overly complex, confusing |
| **Trustworthy** | Reliable, secure, professional | Careless, flimsy |
| **Energetic** | Active, dynamic, alive | Static, boring, lifeless |

**Brand Essence:** "Swift, friendly database navigation"

**Taglines:**
- "Scurry through your data"
- "Database management at full speed"
- "Navigate your data, naturally"

### 2.2 Logo & Mascot

#### Primary Logo
- Stylized squirrel in motion, suggesting speed and agility
- Tail could form a subtle "S" or incorporate motion lines
- Clean, geometric style that works at all sizes (favicon to billboard)
- Slight forward lean to convey movement and energy

#### Mascot: "Scout" 🐿️
- Energetic squirrel character embodying speed and helpfulness
- Always in motion — running, leaping, or ready to dash
- Expressions: Eager (ready), Zooming (loading), Alert (warnings), Celebrating (success)
- Style: Modern, minimal illustration — dynamic poses, not static
- Often carrying or interacting with acorns (data objects) or maps (navigation)

#### Logo Variations
- **Wordmark:** "Scurry" with integrated motion icon
- **Icon Only:** Running squirrel silhouette for favicons, app icons
- **Horizontal:** Icon + wordmark for headers
- **Stacked:** Icon above wordmark for square formats

#### Logo Motion
- The icon can animate with a quick dash/blur effect
- Subtle tail movement for loading states

### 2.3 Color Palette

#### Primary Colors
| Color | Hex | Usage |
|-------|-----|-------|
| **Acorn Brown** | `#8B5A2B` | Primary brand color, CTAs, links |
| **Sprint Orange** | `#E86A33` | Energy accent, hover states, highlights |
| **Forest Green** | `#2D5A3D` | Success states, positive actions |
| **Warm White** | `#FAF9F7` | Light mode background |
| **Charcoal** | `#1C1C1E` | Dark mode background |

#### Secondary Colors
| Color | Hex | Usage |
|-------|-----|-------|
| **Honey Gold** | `#F5A623` | Warnings, premium features |
| **Berry Red** | `#D64545` | Errors, destructive actions |
| **Sky Blue** | `#4A90D9` | Information, links (alternate) |
| **Sage** | `#87A889` | Secondary accents, borders |

#### Neutral Palette
| Color | Hex | Usage |
|-------|-----|-------|
| **Stone 50** | `#FAFAF9` | Lightest background |
| **Stone 100** | `#F5F5F4` | Cards, elevated surfaces |
| **Stone 200** | `#E7E5E4` | Borders, dividers |
| **Stone 400** | `#A8A29E` | Placeholder text |
| **Stone 600** | `#57534E` | Secondary text |
| **Stone 800** | `#292524` | Primary text (light mode) |
| **Stone 900** | `#1C1917` | Darkest elements |

#### Dark Mode Mapping
- Background: Charcoal (`#1C1C1E`) with subtle warm undertone
- Surfaces: Lighten progressively (`#2C2C2E`, `#3C3C3E`)
- Text: Warm white (`#FAF9F7`) for primary, muted for secondary
- Sprint Orange pops beautifully in dark mode for energy

### 2.4 Typography

#### Font Stack
| Usage | Font | Fallback |
|-------|------|----------|
| **Headings** | Inter | system-ui, sans-serif |
| **Body** | Inter | system-ui, sans-serif |
| **Code/SQL** | JetBrains Mono | Fira Code, monospace |

#### Type Scale
| Name | Size | Weight | Usage |
|------|------|--------|-------|
| Display | 36px | 700 | Hero headlines |
| H1 | 28px | 600 | Page titles |
| H2 | 22px | 600 | Section headers |
| H3 | 18px | 600 | Card titles |
| Body | 15px | 400 | Default text |
| Small | 13px | 400 | Secondary info, captions |
| Tiny | 11px | 500 | Labels, badges |
| Code | 14px | 400 | SQL, code blocks |

### 2.5 UI Design Language

#### Design Principles

1. **Warm Minimalism**
   - Clean interfaces with warm color accents
   - Generous whitespace, never cramped
   - Subtle shadows and depth, not flat

2. **Progressive Disclosure**
   - Simple by default, powerful on demand
   - Advanced features revealed contextually
   - Never overwhelm new users

3. **Delightful Details**
   - Micro-interactions that feel alive
   - Mascot appears in empty states and celebrations
   - Easter eggs for power users

4. **Data Density Control**
   - Comfortable mode (default): More spacing, better readability
   - Compact mode: Higher density for power users
   - User-controllable, not forced

#### Component Styling

**Buttons**
- Primary: Acorn Brown background, white text, subtle shadow
- Secondary: Transparent with border, Acorn Brown text
- Destructive: Berry Red background for dangerous actions
- Border radius: 8px (slightly rounded, friendly but professional)
- Hover: Subtle lift effect with shadow increase

**Cards & Panels**
- Background: Slightly elevated from page (Stone 100 on Stone 50)
- Border: 1px Stone 200, or none with shadow
- Border radius: 12px
- Shadow: `0 1px 3px rgba(0,0,0,0.08)`

**Inputs & Forms**
- Border: 1px Stone 300, 2px Acorn Brown on focus
- Border radius: 8px
- Background: White (light) / Stone 800 (dark)
- Clear focus states with ring

**Data Tables**
- Alternating row colors (subtle)
- Sticky headers
- Hover highlight on rows
- Cell padding comfortable for touch

**Sidebar & Navigation**
- Collapsible with smooth animation
- Active state: Subtle Acorn Brown background tint
- Icons: Outlined style, 20px default

### 2.6 Iconography

#### Style Guidelines
- **Source:** Lucide Icons (primary), custom for brand-specific
- **Style:** Outlined, 1.5px stroke weight
- **Size:** 16px (inline), 20px (navigation), 24px (feature)
- **Color:** Inherit from text, or Stone 600 for muted

#### Custom Icons Needed
- Squirrel logo mark
- Database with squirrel motif
- Acorn (representing data objects)
- Nut collection (representing backups)
- Tree (representing schema hierarchy)

### 2.7 Motion & Animation

#### Principles
- **Purposeful:** Animation serves function, not decoration
- **Quick:** 150-250ms for micro-interactions
- **Natural:** Easing that feels organic (ease-out for entrances, ease-in for exits)
- **Consistent:** Same animation patterns throughout

#### Key Animations

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Page transitions | Fade + subtle slide | 200ms | ease-out |
| Modals | Scale up + fade | 200ms | ease-out |
| Dropdowns | Scale Y from top | 150ms | ease-out |
| Toasts | Slide in from right | 250ms | spring |
| Loading spinner | Scout running/dashing | continuous | linear |
| Success state | Checkmark draw + acorn burst | 400ms | spring |
| Button hover | Lift + shadow | 150ms | ease-out |
| Sidebar collapse | Width + fade content | 200ms | ease-in-out |

#### Loading States
- **Skeleton screens** for content loading (not spinners)
- **Progress indicators** for long operations
- **Scout animation** for full-page loads (Scout dashing with motion blur)

### 2.8 Voice & Tone

#### Writing Principles

| Principle | Do | Don't |
|-----------|-----|-------|
| **Friendly** | "Let's connect to your database" | "Initialize database connection" |
| **Clear** | "This will permanently delete 5 tables" | "Confirm destructive operation" |
| **Helpful** | "Try checking your password" | "Authentication failed" |
| **Concise** | "Saved" | "Your changes have been successfully saved to the database" |
| **Human** | "Something went wrong on our end" | "Error 500: Internal Server Exception" |

#### UI Copy Examples

| Context | Copy |
|---------|------|
| Empty state (no connections) | "No connections yet. Let's get you set up in seconds!" |
| Empty state (no results) | "No rows found. Scout searched everywhere! 🐿️" |
| Success toast | "Query complete · 142 rows · 23ms" |
| Error toast | "Connection failed. Check your credentials and try again." |
| Destructive confirmation | "Delete 'users' table? This action cannot be undone." |
| Loading | "Scurrying through your data..." |
| First-time welcome | "Welcome to Scurry! Let's get you connected in under a minute." |
| Query running | "Running query..." |
| Export complete | "Export ready! Scout packed 1,542 rows." |

### 2.9 Accessibility in Design

- **Color contrast:** Minimum 4.5:1 for text, 3:1 for UI elements
- **Focus states:** Visible, high-contrast focus rings
- **Touch targets:** Minimum 44x44px on mobile
- **Motion:** Respect `prefers-reduced-motion`
- **Color independence:** Never rely on color alone for meaning

---

## 3. Problem Statement

### 2.1 Current Market Pain Points

| Problem | Impact |
|---------|--------|
| **Outdated Interfaces** | phpMyAdmin and similar tools have interfaces designed in the early 2000s, creating poor user experience and steep learning curves |
| **No Mobile Support** | Existing tools are unusable on mobile devices, preventing on-the-go database management |
| **Security Vulnerabilities** | Legacy tools have known security issues and lack modern authentication methods |
| **Limited Collaboration** | No real-time collaboration features for team environments |
| **Complex Setup** | Difficult installation and configuration processes |
| **Poor Query Experience** | Basic SQL editors without intelligent autocomplete, formatting, or optimization hints |

### 2.2 Target User Frustrations

- "I can't check my production database from my phone during an emergency"
- "phpMyAdmin looks like it's from 2005 and confuses my junior developers"
- "There's no easy way to share queries or collaborate with my team"
- "I worry about security every time I expose my database admin panel"

---

## 4. Goals & Objectives

### 3.1 Primary Goals

1. **Usability:** Reduce time-to-first-query for new users by 70% compared to phpMyAdmin
2. **Accessibility:** Achieve full functionality on mobile devices (iOS/Android browsers)
3. **Security:** Zero critical security vulnerabilities; SOC 2 Type II compliance readiness
4. **Performance:** Query execution and result rendering under 200ms for datasets up to 10,000 rows
5. **Adoption:** Achieve 10,000 active installations within 12 months of launch

### 3.2 Success Metrics (KPIs)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| User Satisfaction Score | >4.5/5.0 | In-app surveys |
| Mobile Usage Rate | >25% of sessions | Analytics |
| Average Session Duration | >8 minutes | Analytics |
| Query Success Rate | >95% | Error tracking |
| Security Incidents | 0 critical | Security audits |
| Time to First Query | <2 minutes | User tracking |

---

## 5. Target Users

### 4.1 Primary Personas

#### Persona 1: The Full-Stack Developer (Primary)
- **Name:** Alex, 28
- **Role:** Senior Full-Stack Developer at a startup
- **Goals:** Quickly inspect data, debug issues, run ad-hoc queries
- **Pain Points:** Switching between terminal and GUI tools; needs mobile access for on-call duties
- **Technical Level:** High

#### Persona 2: The Database Administrator (Primary)
- **Name:** Sarah, 35
- **Role:** DBA at a mid-size company
- **Goals:** Manage multiple databases, monitor performance, handle permissions
- **Pain Points:** Managing access for team members; lack of audit trails
- **Technical Level:** Expert

#### Persona 3: The Business Analyst (Secondary)
- **Name:** Marcus, 32
- **Role:** Data Analyst at an e-commerce company
- **Goals:** Extract reports, explore data without knowing complex SQL
- **Pain Points:** Depends on developers for data access; intimidated by raw SQL
- **Technical Level:** Low to Medium

#### Persona 4: The Agency Developer (Secondary)
- **Name:** Priya, 30
- **Role:** Freelance Web Developer
- **Goals:** Manage client databases securely, quick setup/teardown
- **Pain Points:** Sharing access with clients safely; managing multiple projects
- **Technical Level:** Medium to High

### 4.2 User Segmentation

| Segment | Deployment | Price Sensitivity | Feature Priority |
|---------|------------|-------------------|------------------|
| Individual Developers | Self-hosted | High | Simplicity, Speed |
| Small Teams (2-10) | SaaS/Self-hosted | Medium | Collaboration, Security |
| Mid-Market (11-100) | SaaS/On-premise | Low | Audit, Compliance, SSO |
| Enterprise (100+) | On-premise/Private Cloud | Very Low | Compliance, SLA, Support |

---

## 6. Feature Requirements

### 5.1 Core Features (MVP — Phase 1)

#### 5.1.1 Connection Management

**Priority:** P0 (Must Have)

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Multi-Database Support | Connect to MySQL, PostgreSQL, MariaDB, SQLite | Users can successfully connect to all four database types |
| Connection Profiles | Save, edit, and organize multiple connection configurations | Connections persist across sessions with encrypted credentials |
| Connection Testing | Validate connection before saving | Clear success/failure feedback within 3 seconds |
| Connection Groups | Organize connections by project, environment, or client | Drag-and-drop organization with custom labels |
| SSH Tunneling | Support for SSH tunnel connections | Successful connection through SSH bastion hosts |
| SSL/TLS Support | Encrypted connections with certificate validation | Support for custom CA certificates |

**User Stories:**
- As a developer, I want to save my database connections so I don't have to re-enter credentials each time
- As a DBA, I want to organize connections by environment (dev/staging/prod) so I can quickly find the right database
- As a freelancer, I want to connect via SSH tunnel so I can securely access client databases

#### 5.1.2 Database Browser

**Priority:** P0 (Must Have)

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Schema Tree View | Hierarchical view of databases, tables, views, procedures | Expandable/collapsible tree with icons |
| Table Inspector | View table structure, indexes, foreign keys, constraints | All metadata displayed in organized tabs |
| Quick Search | Filter databases/tables by name | Real-time filtering as user types |
| Refresh Controls | Manual and auto-refresh of schema | Refresh without losing current position |
| Favorites | Star frequently used tables | Favorites section at top of tree |
| Schema Diff | Compare schemas between connections | Side-by-side comparison view |

#### 5.1.3 SQL Query Editor

**Priority:** P0 (Must Have)

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Syntax Highlighting | Color-coded SQL syntax for readability | Support for all major SQL dialects |
| Intelligent Autocomplete | Context-aware suggestions for tables, columns, functions | Suggestions appear within 100ms of typing |
| Multi-Tab Interface | Open multiple query tabs simultaneously | Tabs persist across sessions |
| Query History | Searchable history of executed queries | Last 1,000 queries with timestamps |
| Query Formatting | Auto-format SQL with one click | Consistent, readable output |
| Error Highlighting | Inline error indicators with explanations | Errors highlighted before execution when possible |
| Keyboard Shortcuts | Full keyboard navigation and shortcuts | Customizable shortcuts; Vim/Emacs modes |
| Query Snippets | Save and reuse common query patterns | Personal and shared snippet libraries |
| Execution Plans | Visualize query execution plans | Graphical EXPLAIN output |

**Technical Specifications:**
- Editor built on Monaco Editor (VS Code's editor)
- Support for multi-statement execution with statement splitting
- Query timeout configurable per-connection
- Maximum result set size configurable (default: 50,000 rows)

#### 5.1.4 Results Viewer

**Priority:** P0 (Must Have)

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Data Grid | Fast, scrollable table view of results | Smooth scrolling for 10,000+ rows |
| Column Sorting | Click-to-sort on any column | Multi-column sort support |
| Column Filtering | Quick filters per column | Support for text, numeric, date filters |
| Inline Editing | Edit cell values directly in grid | Changes highlighted; batch save option |
| Row Operations | Add, duplicate, delete rows | Confirmation dialogs for destructive actions |
| Data Export | Export to CSV, JSON, Excel, SQL | Configurable export options |
| Copy Options | Copy rows, columns, or cells | Multiple format options (tab-separated, JSON) |
| NULL Handling | Clear visual distinction for NULL values | Configurable NULL display |
| Binary Data | Preview images; download binary files | Support for common image formats |
| JSON Viewer | Expand and navigate JSON columns | Collapsible tree view |
| Pagination | Server-side pagination for large results | Configurable page size |

#### 5.1.5 Table Management

**Priority:** P0 (Must Have)

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Create Table | GUI for creating new tables | All column types, constraints supported |
| Alter Table | Modify table structure | Add/remove/modify columns, indexes |
| Drop Table | Delete tables with confirmation | Require typing table name to confirm |
| Truncate Table | Empty table data | Double confirmation for production |
| Table Relationships | Visual foreign key management | Diagram view of relationships |
| Index Management | Create, modify, delete indexes | Performance recommendations |

#### 5.1.6 User Management & Permissions

**Priority:** P0 (Must Have)

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| User Listing | View all database users | Filter and search capabilities |
| Create User | Add new database users | Password policy enforcement |
| Grant/Revoke | Manage user privileges | Visual privilege matrix |
| Role Management | Create and assign roles | Role templates for common patterns |

---

### 5.2 Security Features (MVP — Phase 1)

**Priority:** P0 (Must Have)

#### 5.2.1 Authentication

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Local Authentication | Username/password with secure hashing | Argon2id hashing; rate limiting |
| Two-Factor Authentication | TOTP-based 2FA | Support for authenticator apps |
| SSO Integration | SAML 2.0 and OAuth 2.0/OIDC | Integration with Okta, Azure AD, Google |
| Session Management | Secure session handling | Configurable timeout; force logout |
| Password Policies | Configurable password requirements | Minimum length, complexity, expiry |

#### 5.2.2 Authorization

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Role-Based Access Control | Granular permission system | Predefined roles: Admin, Editor, Viewer |
| Connection-Level Permissions | Restrict users to specific connections | Per-connection, per-user permissions |
| Query Restrictions | Limit query types by user role | Block DROP, DELETE for certain roles |
| IP Whitelisting | Restrict access by IP address | Support for IP ranges and CIDR notation |
| Read-Only Mode | Enforce read-only access | UI prevents write operations |

#### 5.2.3 Audit & Compliance

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Audit Logging | Log all user actions | Immutable log with timestamps, user IDs |
| Query Logging | Record all executed queries | Optional sensitive data masking |
| Export Audit Logs | Download logs for compliance | CSV and JSON formats |
| Retention Policies | Configurable log retention | Automatic purging with backup options |

#### 5.2.4 Data Protection

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Encryption at Rest | Encrypt stored credentials | AES-256 encryption |
| Encryption in Transit | TLS 1.3 for all connections | A+ SSL Labs rating |
| Credential Vault | Secure storage for connection passwords | Integration with HashiCorp Vault optional |
| Data Masking | Hide sensitive columns | Configurable masking rules |

---

### 5.3 Mobile Experience (MVP — Phase 1)

**Priority:** P0 (Must Have)

#### 5.3.1 Responsive Design

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Adaptive Layout | UI adapts to screen size | Full functionality at 320px width |
| Touch Optimization | Touch-friendly controls | Minimum 44px touch targets |
| Gesture Support | Swipe, pinch-to-zoom | Intuitive gesture patterns |
| Mobile Navigation | Collapsible sidebar, bottom nav | Quick access to key features |
| Offline Indicators | Clear online/offline status | Queue actions when offline |

#### 5.3.2 Mobile-Specific Features

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Quick Actions | Frequently used queries | Home screen widget support |
| Push Notifications | Query completion alerts | Optional; configurable |
| Biometric Auth | Fingerprint/Face unlock | Integration with device biometrics |
| Data-Saving Mode | Reduce bandwidth usage | Compress responses; limit row fetch |

---

### 5.4 Collaboration Features (Phase 2)

**Priority:** P1 (Should Have)

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Team Workspaces | Shared spaces for teams | Invite members; assign roles |
| Shared Connections | Team-accessible connection profiles | Credential encryption per-team |
| Shared Queries | Query library visible to team | Version history; comments |
| Real-Time Collaboration | Live cursors; co-editing | WebSocket-based synchronization |
| Query Comments | Annotate queries with notes | @mentions; threaded replies |
| Activity Feed | Team activity stream | Filter by user, action type |

---

### 5.5 AI-Powered Features (Phase 2)

**Priority:** P1 (Should Have)

#### 5.5.1 AI Model Settings

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Model Provider Selection | Support OpenAI, Anthropic, Ollama, custom endpoints | User can select and configure provider in settings |
| API Key Management | Secure storage of API keys | Keys encrypted at rest using AES-256 |
| Model Selection | Choose specific model (gpt-4, claude-3, llama3, etc.) | Dropdown with available models per provider |
| Temperature/Parameters | Configure model behavior | Sliders for temperature, max tokens, etc. |
| Connection Test | Verify AI provider connectivity | Clear success/failure feedback |

#### 5.5.2 Natural Language Queries

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| NL to SQL | Convert plain English to SQL | 80%+ accuracy on common queries |
| Query Explanation | AI explains complex queries | Clear, beginner-friendly explanations |
| Query Suggestions | AI suggests optimizations | Performance improvement recommendations |
| CRUD Operations | Natural language INSERT/UPDATE/DELETE | Confirmation dialog before execution |
| Context Awareness | AI understands current schema | Uses table/column names from connected database |

#### 5.5.3 Database Analysis

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Schema Analysis | AI analyzes database structure | Recommendations for normalization, indexes |
| Data Insights | AI summarizes data patterns | Statistical overview, anomaly detection |
| Query History Analysis | AI identifies common patterns | Suggest query templates based on history |
| Performance Recommendations | AI suggests optimizations | Based on query patterns and schema structure |

#### 5.5.4 MCP Server (Internal)

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Database Tools | Expose CRUD operations as MCP tools | `execute_query`, `list_tables`, `describe_table`, etc. |
| Schema Resources | Expose schema as MCP resources | Tables, columns, relationships as resources |
| Query Prompts | Pre-built prompts for common tasks | Template library accessible via MCP |
| Context Management | Maintain conversation context | Multi-turn interactions with memory |

#### 5.5.5 MCP Server (External)

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Standalone MCP Server | External AI agents can connect | Standard MCP protocol compliance |
| Authentication | Secure access to MCP endpoints | API key authentication per user |
| Rate Limiting | Prevent abuse | Configurable limits per user/key |
| Audit Logging | Log all MCP interactions | Query logs with user attribution |
| Claude Desktop Integration | Works with Claude Desktop app | Tested configuration for Claude |

---

### 5.6 Import/Export & Backup (Phase 2)

**Priority:** P1 (Should Have)

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Database Backup | Full and incremental backups | Scheduled backups; progress indicator |
| Database Restore | Restore from backup files | Verification before restore |
| CSV Import | Import data from CSV files | Column mapping; error handling |
| SQL Import | Execute SQL dump files | Progress tracking; error recovery |
| Schema Export | Export schema as SQL or diagram | Multiple format options |

---

### 5.7 Monitoring & Alerting (Phase 3)

**Priority:** P2 (Nice to Have)

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Performance Dashboard | Real-time database metrics | Query/s, connections, slow queries |
| Slow Query Log | Identify slow-running queries | Threshold configurable |
| Connection Monitor | Active connections overview | Kill connection capability |
| Storage Metrics | Table sizes, growth trends | Visual charts |
| Custom Alerts | Alert on thresholds | Email, Slack, webhook notifications |

---

### 5.8 Integrations (Phase 3)

**Priority:** P2 (Nice to Have)

| Requirement | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Slack Integration | Notifications; slash commands | /sql command for quick queries |
| GitHub Integration | Store queries in repositories | Sync with Git repos |
| Webhook Support | Custom webhook triggers | On query execution, errors |
| API Access | RESTful API for automation | OpenAPI documentation |
| CLI Tool | Command-line interface | Cross-platform binary |

---

## 7. Technical Architecture

### 6.1 System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            Client Layer                                   │
├──────────────┬──────────────┬──────────────┬──────────────┬──────────────┤
│   Web App    │  Mobile Web  │   AI Chat    │   External   │     MCP      │
│   (React)    │ (Responsive) │  Interface   │   AI Agents  │   Clients    │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┘
       │              │              │              │              │
       └──────────────┴──────┬───────┴──────────────┴──────────────┘
                             │
                     ┌───────▼───────┐
                     │  API Gateway   │
                     │  (Next.js)     │
                     └───────┬───────┘
                             │
       ┌─────────────────────┼─────────────────────┬───────────────────┐
       │                     │                     │                   │
┌──────▼──────┐      ┌───────▼───────┐     ┌───────▼───────┐   ┌───────▼───────┐
│    Auth     │      │   Core API    │     │  AI Service   │   │  MCP Server   │
│   Service   │      │   Service     │     │  (LLM Calls)  │   │  (Tools/      │
│ (Argon2id)  │      │               │     │               │   │   Resources)  │
└──────┬──────┘      └───────┬───────┘     └───────┬───────┘   └───────┬───────┘
       │                     │                     │                   │
       └─────────────────────┼─────────────────────┴───────────────────┘
                             │
                     ┌───────▼───────┐
                     │ Query Engine  │
                     │  (Node.js)    │
                     └───────┬───────┘
                             │
       ┌─────────────────────┼─────────────────────┬───────────────────┐
       │                     │                     │                   │
┌──────▼──────┐      ┌───────▼───────┐     ┌───────▼───────┐   ┌───────▼───────┐
│   MySQL/    │      │  PostgreSQL   │     │    SQLite     │   │   MariaDB     │
│  MariaDB    │      │    Driver     │     │    Driver     │   │    Driver     │
│   Driver    │      │               │     │               │   │               │
└─────────────┘      └───────────────┘     └───────────────┘   └───────────────┘
```

### 6.2 Technology Stack

#### Full-Stack Framework
| Component | Technology | Rationale |
|-----------|------------|-----------|
| Framework | Next.js 15 (App Router) | Unified full-stack, SSR/SSG, Server Actions, excellent DX |
| Language | TypeScript | Type safety across entire codebase |
| Runtime | Node.js 20+ | LTS stability, native fetch |

#### Frontend
| Component | Technology | Rationale |
|-----------|------------|-----------|
| State Management | Zustand + TanStack Query | Simple client state + powerful server state |
| UI Components | shadcn/ui + Radix | Accessible, customizable, Tailwind-native |
| Styling | Tailwind CSS | Utility-first, responsive, consistent |
| SQL Editor | Monaco Editor | VS Code engine, rich features |
| Data Grid | TanStack Table | Virtual scrolling, performant |
| Charts | Recharts | React-native, responsive |
| Real-Time | Socket.io Client | WebSocket with fallbacks |

#### Backend (Next.js API Routes + Server Actions)
| Component | Technology | Rationale |
|-----------|------------|-----------|
| API Layer | Next.js Route Handlers | Co-located with frontend, type-safe |
| Server Actions | Next.js Server Actions | Direct database mutations, form handling |
| Database Drivers | mysql2, pg, better-sqlite3 | Native Node.js drivers |
| Connection Pooling | Generic Pool | Efficient connection management |
| WebSockets | Socket.io (custom server) | Real-time collaboration |
| Job Queue | BullMQ + Redis | Background tasks, scheduled backups |
| Caching | Redis + Next.js Cache | Session store, query cache, ISR |
| Validation | Zod | Schema validation, type inference |
| ORM (App Data) | Drizzle ORM | Type-safe, lightweight, great DX |

#### Database & Storage
| Component | Technology | Rationale |
|-----------|------------|-----------|
| App Settings | SQLite (local) | Zero config, embedded, perfect for self-hosted |
| Connection Storage | Encrypted JSON or SQLite | Simple, portable |
| Query History | SQLite | Local persistence |

#### Infrastructure (Self-Hosted)
| Component | Technology | Rationale |
|-----------|------------|-----------|
| Containerization | Docker | Easy deployment |
| Reverse Proxy | Caddy (optional) | Auto HTTPS, simple config |
| CI/CD | GitHub Actions | Free for open source |
| Error Tracking | Sentry (optional) | Free tier available |

### 6.3 Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Security Layers                       │
├─────────────────────────────────────────────────────────┤
│  Layer 1: Network Security                              │
│  • TLS 1.3 encryption                                   │
│  • WAF (Web Application Firewall)                       │
│  • DDoS protection                                      │
│  • IP whitelisting                                      │
├─────────────────────────────────────────────────────────┤
│  Layer 2: Authentication                                │
│  • Multi-factor authentication                          │
│  • SSO (SAML/OIDC)                                      │
│  • Session management with rotation                     │
│  • Brute-force protection                               │
├─────────────────────────────────────────────────────────┤
│  Layer 3: Authorization                                 │
│  • RBAC (Role-Based Access Control)                     │
│  • Connection-level permissions                         │
│  • Query-type restrictions                              │
│  • Row-level security (future)                          │
├─────────────────────────────────────────────────────────┤
│  Layer 4: Data Protection                               │
│  • AES-256 encryption at rest                           │
│  • Credential encryption (per-user keys)                │
│  • Data masking for sensitive fields                    │
│  • Secure credential injection                          │
├─────────────────────────────────────────────────────────┤
│  Layer 5: Audit & Compliance                            │
│  • Immutable audit logs                                 │
│  • Query logging with masking                           │
│  • Compliance reports                                   │
│  • Anomaly detection                                    │
└─────────────────────────────────────────────────────────┘
```

### 6.4 API Design

**Base URL:** `http://localhost:3000/api` (self-hosted)

**Authentication:** Bearer token (JWT) or API key

**Sample Endpoints:**

```
# Connections
GET    /connections              # List connections
POST   /connections              # Create connection
GET    /connections/:id          # Get connection
PUT    /connections/:id          # Update connection
DELETE /connections/:id          # Delete connection
POST   /connections/:id/test     # Test connection

# Query Execution
POST   /connections/:id/query    # Execute query
GET    /connections/:id/queries  # Query history
POST   /queries/:id/explain      # Get execution plan

# Schema
GET    /connections/:id/databases
GET    /connections/:id/databases/:db/tables
GET    /connections/:id/databases/:db/tables/:table
GET    /connections/:id/databases/:db/tables/:table/columns
GET    /connections/:id/databases/:db/tables/:table/indexes

# Users & Auth
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
GET    /users/me
PUT    /users/me
```

---

## 8. User Interface Design

> **Note:** All UI designs should follow the Brand Identity & Design System defined in Section 2.

### 8.1 Design Principles

Refer to Section 2.5 for core design principles. Additional UI-specific guidelines:

1. **Keyboard First:** Full keyboard navigation for power users
2. **Dark Mode Default:** Developer preference; reduce eye strain
3. **Minimal Clicks:** Common actions require minimal navigation
4. **Responsive by Design:** Not an afterthought; mobile-first approach
5. **Scout Appearances:** Mascot appears in empty states, onboarding, and celebrations

### 8.2 Key Screens

#### 8.2.1 Dashboard / Home
- Recent connections (quick connect)
- Recent queries (quick re-run)
- Pinned/favorite items
- Team activity feed (if applicable)
- Quick actions (new query, new connection)

#### 8.2.2 Connection Manager
- Card or list view of connections
- Color-coded by environment (dev/staging/prod)
- Connection status indicators
- Quick actions (connect, edit, duplicate, delete)
- Bulk operations

#### 8.2.3 Query Workspace (Main Editor)
- **Left Sidebar:** Database tree navigator
- **Center:** Multi-tab SQL editor with results panel below
- **Right Sidebar:** Query history, snippets, AI assistant (collapsible)
- **Bottom Bar:** Connection info, execution time, row count
- **Top Bar:** Breadcrumb navigation, run button, format button

#### 8.2.4 Table Browser
- Schema tree navigation
- Table preview with quick filters
- Structure/Data/Indexes/Foreign Keys tabs
- Inline editing mode toggle
- Quick actions (export, truncate, drop)

#### 8.2.5 Settings & Administration
- User management
- Team/workspace management
- Connection permissions
- Audit log viewer
- System configuration

### 8.3 Mobile UI Adaptations

| Desktop Element | Mobile Adaptation |
|-----------------|-------------------|
| Sidebar | Slide-out drawer |
| Multi-tab editor | Swipeable tabs with tab bar |
| Results grid | Horizontal scroll; card view option |
| Context menus | Bottom sheet actions |
| Keyboard shortcuts | Quick action buttons |

### 8.4 Accessibility Requirements

Refer to Section 2.9 for accessibility design guidelines. Additional requirements:

- WCAG 2.1 AA compliance
- Full keyboard navigation
- Screen reader compatibility
- High contrast mode
- Reduced motion option
- Focus indicators
- Semantic HTML

---

## 9. Non-Functional Requirements

### 8.1 Performance

| Metric | Requirement |
|--------|-------------|
| Page Load (Initial) | < 2 seconds (3G connection) |
| Page Load (Cached) | < 500ms |
| Query Execution Feedback | < 100ms (spinner appears) |
| Result Rendering (1K rows) | < 200ms |
| Result Rendering (10K rows) | < 500ms |
| Autocomplete Suggestions | < 100ms |
| Real-time Sync Latency | < 200ms |

### 8.2 Scalability

| Dimension | Target |
|-----------|--------|
| Concurrent Users | 10,000+ (SaaS) |
| Concurrent Connections per User | 20 |
| Max Result Set Size | 1 million rows (paginated) |
| Max Query Size | 1 MB |
| Max Connections Stored | 1,000 per user |

### 8.3 Availability

| Metric | Target |
|--------|--------|
| Uptime (SaaS) | 99.9% |
| Planned Maintenance Window | < 4 hours/month |
| RTO (Recovery Time Objective) | < 1 hour |
| RPO (Recovery Point Objective) | < 5 minutes |

### 8.4 Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | Last 2 versions |
| Firefox | Last 2 versions |
| Safari | Last 2 versions |
| Edge | Last 2 versions |
| Mobile Safari | iOS 14+ |
| Chrome Mobile | Android 10+ |

---

## 10. Release Strategy

### 9.1 Development Phases

#### Phase 1: MVP ✅ COMPLETED
**Goal:** Core functionality for individual developers

- [x] Connection management (MySQL, PostgreSQL, MariaDB, SQLite)
- [x] SQL editor with Monaco Editor (syntax highlighting, formatting)
- [x] Results viewer with TanStack Table (sorting, pagination, export)
- [x] Schema browser (tables, columns, indexes, data preview)
- [x] User authentication with Argon2id hashing
- [x] Responsive design with dark/light modes
- [x] Landing page with public/authenticated routes
- [x] Per-user connection isolation

**Milestone:** ✅ Private Beta Launch (November 2025)

#### Phase 2: AI & Team Features (In Progress)
**Goal:** AI-powered queries and collaboration features

- [ ] AI model settings page (OpenAI, Anthropic, Ollama support)
- [ ] Natural language to SQL queries
- [ ] AI-powered database analysis and insights
- [ ] Query optimization suggestions
- [ ] MCP server (internal) for AI chat interface
- [ ] MCP server (external) for Claude Desktop and other AI agents
- [ ] Team workspaces
- [ ] Shared connections and queries

**Milestone:** Public Beta Launch

#### Phase 3: Scale & Polish (Months 8-10)
**Goal:** Production readiness and growth

- Performance monitoring dashboard
- Advanced alerting
- CLI and API
- Integrations (Slack, GitHub)
- Desktop app (Electron)
- SOC 2 Type II preparation

**Milestone:** General Availability (GA)

#### Phase 4: Enterprise (Months 11-12)
**Goal:** Enterprise sales readiness

- On-premise deployment option
- Advanced compliance features
- Custom SSO configurations
- Priority support SLAs
- White-labeling (optional)

### 9.2 Launch Checklist

**Pre-Launch:**
- [ ] Security audit completed
- [ ] Penetration testing passed
- [ ] Load testing passed
- [ ] Documentation complete
- [ ] Onboarding flow tested
- [ ] Support channels ready
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery tested

**Launch:**
- [ ] Staged rollout (10% → 50% → 100%)
- [ ] Feature flags for new features
- [ ] Real-time monitoring during launch
- [ ] Support team on standby

---

## 11. Pricing Strategy (SaaS)

### 10.1 Proposed Tiers

| Tier | Price | Target User | Key Features |
|------|-------|-------------|--------------|
| **Free** | $0/month | Individual hobbyists | 1 user, 3 connections, community support |
| **Pro** | $12/user/month | Professional developers | Unlimited connections, query history, priority support |
| **Team** | $25/user/month | Small teams (3-20) | Shared workspaces, SSO, audit logs, collaboration |
| **Enterprise** | Custom | Large organizations | On-premise, custom SLAs, dedicated support, compliance |

### 10.2 Self-Hosted Pricing

| Tier | Price | Features |
|------|-------|----------|
| **Community** | Free (OSS) | Core features, community support |
| **Professional** | $500/year | Priority updates, email support |
| **Enterprise** | Custom | SLA, dedicated support, custom development |

---

## 12. Success Metrics & Analytics

### 11.1 Key Metrics to Track

**Acquisition:**
- Website visitors
- Sign-up conversion rate
- Traffic sources

**Activation:**
- Time to first connection
- Time to first query
- Onboarding completion rate

**Engagement:**
- Daily/Weekly/Monthly Active Users
- Queries per user per day
- Session duration
- Feature adoption rates

**Retention:**
- Day 1, 7, 30, 90 retention
- Churn rate
- Net revenue retention

**Revenue (SaaS):**
- MRR/ARR
- ARPU
- LTV/CAC ratio
- Conversion rate (free to paid)

### 11.2 Analytics Implementation

- **Product Analytics:** PostHog or Mixpanel
- **Error Tracking:** Sentry
- **Performance:** Vercel Analytics + Custom metrics
- **User Feedback:** In-app surveys (Formbricks)

---

## 13. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Security breach | Medium | Critical | Security audits, bug bounty, encryption |
| Performance issues at scale | Medium | High | Load testing, query limits, caching |
| Low adoption | Medium | High | User research, marketing, community building |
| Feature creep | High | Medium | Strict prioritization, MVP focus |
| Competitor response | Medium | Medium | Focus on UX/mobile differentiation |
| Technical debt | High | Medium | Code reviews, refactoring sprints |

---

## 14. Open Questions

1. **Database Priority:** Start with MySQL or PostgreSQL for MVP?
2. **Domain:** scurry.dev, scurrydb.com, getscurry.dev, or other?
3. **Monorepo:** Use Turborepo for packages or keep it simple?
4. **State Management:** Zustand vs. Jotai vs. just React Context?
5. **ORM for App Data:** Drizzle vs. Prisma for storing connections/settings?
6. **Authentication:** Add user auth in v1, or keep it single-user initially?
7. **i18n:** Plan for internationalization from the start?
8. **Analytics:** Include privacy-respecting analytics (Plausible/Umami)?

---

## 15. Appendix

### 14.1 Competitive Analysis

| Feature | phpMyAdmin | Adminer | DBeaver | TablePlus | **Scurry** |
|---------|------------|---------|---------|-----------|------------|
| Modern UI | ❌ | ❌ | ⚠️ | ✅ | ✅ |
| Mobile Support | ❌ | ❌ | ❌ | ❌ | ✅ |
| Web-Based | ✅ | ✅ | ❌ | ❌ | ✅ |
| Team Features | ❌ | ❌ | ❌ | ⚠️ | ✅ |
| SSO/Enterprise | ❌ | ❌ | ⚠️ | ❌ | ✅ |
| AI Features | ❌ | ❌ | ❌ | ❌ | ✅ |
| Free Option | ✅ | ✅ | ✅ | ❌ | ✅ | | ❌ | ❌ | ❌ | ✅ |
| Web-Based | ✅ | ✅ | ❌ | ❌ | ✅ |
| Team Features | ❌ | ❌ | ❌ | ⚠️ | ✅ |
| SSO/Enterprise | ❌ | ❌ | ⚠️ | ❌ | ✅ |
| AI Features | ❌ | ❌ | ❌ | ❌ | ✅ |
| Free Option | ✅ | ✅ | ✅ | ❌ | ✅ |

### 14.2 Glossary

- **RBAC:** Role-Based Access Control
- **SSO:** Single Sign-On
- **OIDC:** OpenID Connect
- **SAML:** Security Assertion Markup Language
- **WAF:** Web Application Firewall
- **RTO:** Recovery Time Objective
- **RPO:** Recovery Point Objective

### 14.3 References

- [phpMyAdmin](https://www.phpmyadmin.net/)
- [Adminer](https://www.adminer.org/)
- [DBeaver](https://dbeaver.io/)
- [TablePlus](https://tableplus.com/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)

---

**Document History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 2025 | — | Initial draft |

---

*This PRD is a living document and will be updated as requirements evolve.*