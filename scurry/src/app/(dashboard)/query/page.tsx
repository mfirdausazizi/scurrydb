'use client';

import { FileCode } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function QueryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Query Editor</h1>
        <p className="text-muted-foreground">
          Write and execute SQL queries.
        </p>
      </div>

      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <FileCode className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>SQL Query Editor Coming Soon</CardTitle>
          <CardDescription>
            This page will feature a Monaco-based SQL editor with syntax highlighting and autocomplete.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Phase 2 of the Scurry project will implement the full query editor experience.
        </CardContent>
      </Card>
    </div>
  );
}
