import Link from 'next/link';
import { Database, Zap, Shield, Smartphone, Code2, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';

export default function LandingPage() {
  return (
    <>
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🐿️</span>
            <span className="font-bold text-xl">Scurry</span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex items-center">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm">
              <span>🎉</span>
              <span>100% Open Source under AGPL-3.0</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Scurry through your data
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A modern, open-source SQL database manager. Fast, secure, and mobile-friendly. 
              The phpMyAdmin alternative you&apos;ve been waiting for.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/register">
                  Get Started Free
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="https://github.com/YOUR_USERNAME/scurry" target="_blank">
                  <Github className="mr-2 h-5 w-5" />
                  View on GitHub
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything you need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Modern database management with all the features you love
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <FeatureCard
              icon={<Database className="h-6 w-6" />}
              title="Multi-Database Support"
              description="Connect to MySQL, PostgreSQL, MariaDB, and SQLite databases from a single interface."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Lightning Fast"
              description="Modern tech stack with instant query execution and real-time results."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Secure by Default"
              description="Encrypted credentials, secure sessions, and per-user connection isolation."
            />
            <FeatureCard
              icon={<Smartphone className="h-6 w-6" />}
              title="Mobile-Friendly"
              description="Full functionality on any device. Manage your database from anywhere."
            />
            <FeatureCard
              icon={<Code2 className="h-6 w-6" />}
              title="Powerful Editor"
              description="Monaco-powered SQL editor with syntax highlighting, autocomplete, and formatting."
            />
            <FeatureCard
              icon={<Github className="h-6 w-6" />}
              title="Open Source"
              description="AGPL-3.0 licensed. Self-host for free, contribute, and make it your own."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Create your free account and start managing your databases in minutes.
          </p>
          <Button size="lg" asChild>
            <Link href="/register">Create Free Account</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-lg">🐿️</span>
            <span>Scurry - Open Source SQL Manager</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="https://github.com/YOUR_USERNAME/scurry" target="_blank" className="hover:text-foreground">
              GitHub
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Sign In
            </Link>
            <span>AGPL-3.0 License</span>
          </div>
        </div>
      </footer>
    </>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-lg border bg-card">
      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
