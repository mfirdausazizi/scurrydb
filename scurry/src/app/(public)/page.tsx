import Link from 'next/link';
import { 
  Database, 
  Zap, 
  Shield, 
  Smartphone, 
  Code2, 
  Github, 
  Sparkles,
  Users,
  Activity,
  Brain,
  Terminal,
  Check,
  X,
  Copy,
  ChevronRight,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { TryGuestModeButton } from '@/components/auth/try-guest-mode-button';

export default function LandingPage() {
  return (
    <>
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 glass-header border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl transition-transform group-hover:scale-110">🐿️</span>
            <span className="font-bold text-xl">ScurryDB</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#ai" className="text-muted-foreground hover:text-foreground transition-colors">AI</a>
            <a href="#teams" className="text-muted-foreground hover:text-foreground transition-colors">Teams</a>
            <a href="#quickstart" className="text-muted-foreground hover:text-foreground transition-colors">Quick Start</a>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient-light dark:hero-gradient-dark geometric-pattern" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium animate-fade-in border border-primary/20">
              <Star className="h-4 w-4 fill-current" />
              <span>100% Open Source • AGPL-3.0 • Phase 3 Complete</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight animate-fade-in-up animation-delay-100">
              Scurry through your data
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto animate-fade-in-up animation-delay-200">
              A modern, AI-powered SQL database manager with team collaboration.
              <br />
              <span className="text-foreground font-medium">The phpMyAdmin alternative you&apos;ve been waiting for.</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-300">
              <Button size="lg" asChild className="text-base">
                <Link href="/register">
                  Get Started Free
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <TryGuestModeButton className="text-base" />
            </div>
            
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground animate-fade-in-up animation-delay-400">
              <Link 
                href="https://github.com/mfirdausazizi/scurrydb" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Github className="h-4 w-4" />
                View on GitHub
              </Link>
            </div>

            {/* Terminal Preview */}
            <div className="mt-12 animate-fade-in-up animation-delay-400">
              <div className="terminal-window rounded-xl overflow-hidden shadow-2xl max-w-2xl mx-auto">
                <div className="terminal-header px-4 py-3 flex items-center gap-2 border-b border-white/10">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-xs text-gray-400 ml-2">terminal</span>
                </div>
                <div className="p-6 font-mono text-sm text-left">
                  <div className="text-green-400">$ docker run -d \</div>
                  <div className="text-gray-300 ml-4">--name scurrydb \</div>
                  <div className="text-gray-300 ml-4">-p 3000:3000 \</div>
                  <div className="text-gray-300 ml-4">-v scurrydb-data:/app/data \</div>
                  <div className="text-gray-300 ml-4">ghcr.io/mfirdausazizi/scurrydb:latest</div>
                  <div className="mt-4 text-blue-400">✓ ScurryDB running at http://localhost:3000</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Database Support Section */}
      <section className="py-16 border-t bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Connect to any database</h2>
            <p className="text-muted-foreground">Full support for the most popular SQL databases</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            <DatabaseCard name="MySQL" icon="🐬" color="bg-blue-500/10 border-blue-500/20" />
            <DatabaseCard name="PostgreSQL" icon="🐘" color="bg-indigo-500/10 border-indigo-500/20" />
            <DatabaseCard name="MariaDB" icon="🦭" color="bg-teal-500/10 border-teal-500/20" />
            <DatabaseCard name="SQLite" icon="🪶" color="bg-gray-500/10 border-gray-500/20" />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything you need</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Modern database management with all the features you love, plus AI and collaboration
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <FeatureCard
              icon={<Database className="h-6 w-6" />}
              title="Multi-Database Support"
              description="Connect to MySQL, PostgreSQL, MariaDB, and SQLite databases from a single interface."
              delay="animation-delay-100"
            />
            <FeatureCard
              icon={<Code2 className="h-6 w-6" />}
              title="Powerful Editor"
              description="Monaco-powered SQL editor with syntax highlighting, autocomplete, and formatting."
              delay="animation-delay-200"
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Lightning Fast"
              description="Modern tech stack with instant query execution and real-time results."
              delay="animation-delay-300"
            />
            <FeatureCard
              icon={<Brain className="h-6 w-6" />}
              title="AI-Powered Queries"
              description="Natural language to SQL with OpenAI, Anthropic, Ollama, and custom endpoints."
              delay="animation-delay-400"
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Team Collaboration"
              description="Shared workspaces, connections, and queries with role-based access control."
              delay="animation-delay-500"
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Secure by Default"
              description="Encrypted credentials, secure sessions, and per-user connection isolation."
              delay="animation-delay-600"
            />
            <FeatureCard
              icon={<Smartphone className="h-6 w-6" />}
              title="Mobile-Friendly"
              description="Full functionality on any device. Manage your database from anywhere."
              delay="animation-delay-700"
            />
            <FeatureCard
              icon={<Activity className="h-6 w-6" />}
              title="Activity Feed"
              description="Track team actions, query history, and collaboration in real-time."
              delay="animation-delay-800"
            />
            <FeatureCard
              icon={<Github className="h-6 w-6" />}
              title="Open Source"
              description="AGPL-3.0 licensed. Self-host for free, contribute, and make it your own."
              delay="animation-delay-100"
            />
          </div>
        </div>
      </section>

      {/* AI Features Showcase */}
      <section id="ai" className="py-20 md:py-28 bg-gradient-to-br from-primary/5 via-accent/5 to-forest/5 border-y">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium border border-accent/20">
                <Sparkles className="h-4 w-4" />
                <span>AI-Powered • Phase 2 Complete</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold">
                Ask in plain English,<br />get SQL instantly
              </h2>
              <p className="text-lg text-muted-foreground">
                ScurryDB&apos;s AI understands your database schema and converts natural language into accurate SQL queries. No more syntax hunting.
              </p>
              <ul className="space-y-4">
                <AIFeature 
                  title="Multiple AI Providers"
                  description="OpenAI (GPT-4, o3), Anthropic (Claude Sonnet 4), Ollama, or custom endpoints"
                />
                <AIFeature 
                  title="Schema-Aware"
                  description="AI understands your tables, columns, and relationships for accurate queries"
                />
                <AIFeature 
                  title="MCP Server Integration"
                  description="Connect Claude Desktop and other AI agents directly to your databases"
                />
                <AIFeature 
                  title="Streaming Responses"
                  description="Real-time AI chat integrated into the Query Editor with one-click insert"
                />
              </ul>
            </div>
            <div className="relative">
              <div className="bg-card border rounded-xl p-6 shadow-xl">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">👤</span>
                    </div>
                    <div className="bg-muted rounded-lg p-3 flex-1">
                      <p className="text-sm">Show me all users who signed up in the last 7 days</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex-1">
                      <pre className="text-xs font-mono text-foreground overflow-x-auto">
{`SELECT *
FROM users
WHERE created_at >= NOW() - INTERVAL 7 DAY
ORDER BY created_at DESC;`}
                      </pre>
                      <Button size="sm" variant="ghost" className="mt-2 text-xs">
                        <Code2 className="h-3 w-3 mr-1" />
                        Insert into Editor
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent/20 rounded-full blur-3xl animate-pulse-glow" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse-glow animation-delay-500" />
            </div>
          </div>
        </div>
      </section>

      {/* Team Collaboration Showcase */}
      <section id="teams" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="order-2 lg:order-1 relative">
              <div className="bg-card border rounded-xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4 pb-4 border-b">
                  <h3 className="font-semibold">Team Activity</h3>
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-4">
                  <ActivityItem 
                    avatar="👨‍💻"
                    name="Alex"
                    action="saved a query"
                    item="User Analytics Report"
                    time="2 min ago"
                  />
                  <ActivityItem 
                    avatar="👩‍💼"
                    name="Sarah"
                    action="shared connection"
                    item="Production DB"
                    time="15 min ago"
                  />
                  <ActivityItem 
                    avatar="🧑‍🔬"
                    name="Marcus"
                    action="commented on"
                    item="Monthly Sales Query"
                    time="1 hour ago"
                  />
                </div>
              </div>
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-forest/20 rounded-full blur-3xl animate-pulse-glow" />
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-accent/20 rounded-full blur-3xl animate-pulse-glow animation-delay-500" />
            </div>
            <div className="order-1 lg:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest/10 text-forest dark:text-forest/80 text-sm font-medium border border-forest/20">
                <Users className="h-4 w-4" />
                <span>Team Collaboration • Phase 3 Complete</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold">
                Work together,<br />ship faster
              </h2>
              <p className="text-lg text-muted-foreground">
                Built for teams from the ground up. Share connections, collaborate on queries, and keep everyone in sync.
              </p>
              <ul className="space-y-4">
                <AIFeature 
                  title="Team Workspaces"
                  description="Create teams, invite members, and manage access with role-based permissions"
                />
                <AIFeature 
                  title="Shared Connections"
                  description="Share database connections securely with your team members"
                />
                <AIFeature 
                  title="Saved Queries & Comments"
                  description="Build a query library and collaborate with threaded comments"
                />
                <AIFeature 
                  title="Activity Feed"
                  description="Track team actions, query history, and collaboration in real-time"
                />
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Start Section */}
      <section id="quickstart" className="py-20 md:py-28 bg-muted/30 border-y">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold">Running in 30 seconds</h2>
              <p className="text-lg text-muted-foreground">
                Self-host ScurryDB with a single Docker command. No complex setup, no dependencies.
              </p>
            </div>
            
            <div className="bg-card border rounded-xl overflow-hidden shadow-xl">
              <div className="bg-muted/50 px-4 py-3 flex items-center justify-between border-b">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Terminal className="h-4 w-4" />
                  <span>Docker</span>
                </div>
                <Button size="sm" variant="ghost" className="h-8">
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
              <div className="p-6 font-mono text-sm text-left overflow-x-auto">
                <pre className="text-foreground">
{`docker run -d \\
  --name scurrydb \\
  -p 3000:3000 \\
  -v scurrydb-data:/app/data \\
  -e ENCRYPTION_KEY="your-32-char-secret-key-here!!" \\
  ghcr.io/mfirdausazizi/scurrydb:latest`}
                </pre>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 pt-8">
              <QuickStartStep 
                number="1"
                title="Pull & Run"
                description="One Docker command to get started"
              />
              <QuickStartStep 
                number="2"
                title="Open Browser"
                description="Navigate to localhost:3000"
              />
              <QuickStartStep 
                number="3"
                title="Connect DB"
                description="Add your first database connection"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">How ScurryDB compares</h2>
              <p className="text-lg text-muted-foreground">
                Modern features that legacy tools can&apos;t match
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left p-4 font-semibold">Feature</th>
                    <th className="p-4 font-semibold comparison-highlight">ScurryDB</th>
                    <th className="p-4 font-semibold">phpMyAdmin</th>
                    <th className="p-4 font-semibold">Adminer</th>
                    <th className="p-4 font-semibold">TablePlus</th>
                  </tr>
                </thead>
                <tbody>
                  <ComparisonRow 
                    feature="Modern UI"
                    scurry={true}
                    phpMyAdmin={false}
                    adminer={false}
                    tablePlus={true}
                  />
                  <ComparisonRow 
                    feature="Mobile Support"
                    scurry={true}
                    phpMyAdmin={false}
                    adminer={false}
                    tablePlus={false}
                  />
                  <ComparisonRow 
                    feature="Web-Based"
                    scurry={true}
                    phpMyAdmin={true}
                    adminer={true}
                    tablePlus={false}
                  />
                  <ComparisonRow 
                    feature="AI Features"
                    scurry={true}
                    phpMyAdmin={false}
                    adminer={false}
                    tablePlus={false}
                  />
                  <ComparisonRow 
                    feature="Team Collaboration"
                    scurry={true}
                    phpMyAdmin={false}
                    adminer={false}
                    tablePlus={false}
                  />
                  <ComparisonRow 
                    feature="Free & Open Source"
                    scurry={true}
                    phpMyAdmin={true}
                    adminer={true}
                    tablePlus={false}
                  />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/10 to-forest/10 animate-gradient" />
        <div className="container mx-auto px-4 text-center relative">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-6xl animate-float">🐿️</div>
            <h2 className="text-4xl md:text-5xl font-bold">Ready to scurry?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join developers who are ditching legacy tools for a modern database management experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" asChild className="text-base">
                <Link href="/register">
                  Create Free Account
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base">
                <Link href="https://github.com/mfirdausazizi/scurrydb" target="_blank" rel="noopener noreferrer">
                  <Github className="mr-2 h-5 w-5" />
                  Star on GitHub
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-2xl">🐿️</span>
                <span className="font-bold text-lg">ScurryDB</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                Modern, open-source SQL database manager for the web.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#ai" className="hover:text-foreground transition-colors">AI Features</a></li>
                <li><a href="#teams" className="hover:text-foreground transition-colors">Team Collaboration</a></li>
                <li><a href="#quickstart" className="hover:text-foreground transition-colors">Quick Start</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="https://github.com/mfirdausazizi/scurrydb" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                    GitHub
                  </Link>
                </li>
                <li>
                  <Link href="https://github.com/mfirdausazizi/scurrydb#readme" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="https://github.com/mfirdausazizi/scurrydb/issues" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                    Issues
                  </Link>
                </li>
                <li>
                  <Link href="https://github.com/mfirdausazizi/scurrydb/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                    License
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Community</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="https://github.com/mfirdausazizi/scurrydb/discussions" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                    Discussions
                  </Link>
                </li>
                <li>
                  <Link href="https://github.com/mfirdausazizi/scurrydb/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                    Contributing
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-foreground transition-colors">
                    Sign Up
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-foreground transition-colors">
                    Sign In
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>© 2025 ScurryDB</span>
              <span>•</span>
              <span>AGPL-3.0 License</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="https://github.com/mfirdausazizi/scurrydb" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                <Github className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

// Component: Database Card
function DatabaseCard({ name, icon, color }: { name: string; icon: string; color: string }) {
  return (
    <div className={`${color} border rounded-xl p-6 text-center card-hover transition-all`}>
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-semibold">{name}</h3>
    </div>
  );
}

// Component: Feature Card
function FeatureCard({ 
  icon, 
  title, 
  description,
  delay = ''
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  delay?: string;
}) {
  return (
    <div className={`p-6 rounded-xl border bg-card card-hover animate-fade-in-up ${delay}`}>
      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}

// Component: AI Feature List Item
function AIFeature({ title, description }: { title: string; description: string }) {
  return (
    <li className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
        <Check className="h-4 w-4 text-primary" />
      </div>
      <div>
        <h4 className="font-semibold mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </li>
  );
}

// Component: Activity Item
function ActivityItem({ 
  avatar, 
  name, 
  action, 
  item, 
  time 
}: { 
  avatar: string; 
  name: string; 
  action: string; 
  item: string; 
  time: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span>{avatar}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-semibold">{name}</span>
          <span className="text-muted-foreground"> {action} </span>
          <span className="font-medium">{item}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{time}</p>
      </div>
    </div>
  );
}

// Component: Quick Start Step
function QuickStartStep({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center space-y-2">
      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center mx-auto mb-3">
        {number}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

// Component: Comparison Row
function ComparisonRow({ 
  feature, 
  scurry, 
  phpMyAdmin, 
  adminer, 
  tablePlus 
}: { 
  feature: string; 
  scurry: boolean; 
  phpMyAdmin: boolean; 
  adminer: boolean; 
  tablePlus: boolean;
}) {
  return (
    <tr className="border-b last:border-0">
      <td className="p-4 font-medium">{feature}</td>
      <td className="p-4 text-center comparison-highlight">
        <ComparisonIcon value={scurry} highlight />
      </td>
      <td className="p-4 text-center">
        <ComparisonIcon value={phpMyAdmin} />
      </td>
      <td className="p-4 text-center">
        <ComparisonIcon value={adminer} />
      </td>
      <td className="p-4 text-center">
        <ComparisonIcon value={tablePlus} />
      </td>
    </tr>
  );
}

// Component: Comparison Icon
function ComparisonIcon({ value, highlight = false }: { value: boolean; highlight?: boolean }) {
  if (value) {
    return (
      <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${highlight ? 'bg-primary text-primary-foreground' : 'bg-green-500/10 text-green-600 dark:text-green-400'}`}>
        <Check className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground">
      <X className="h-4 w-4" />
    </div>
  );
}
