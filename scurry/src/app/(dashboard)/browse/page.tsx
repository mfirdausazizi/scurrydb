'use client';

import { Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function BrowsePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Schema Browser</h1>
        <p className="text-muted-foreground">
          Explore your database schema and data.
        </p>
      </div>

      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Search className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Schema Browser Coming Soon</CardTitle>
          <CardDescription>
            This page will display a tree view of your database schema with table previews.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Phase 2 of the Scurry project will implement the full schema browser.
        </CardContent>
      </Card>
    </div>
  );
}
