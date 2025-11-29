'use client';

import * as React from 'react';
import Link from 'next/link';
import { Monitor, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ScreenSizeNoticeProps {
  feature?: string;
  minWidth?: string;
  description?: string;
}

export function ScreenSizeNotice({
  feature = 'Data Synchronizer',
  minWidth = '1024px',
  description,
}: ScreenSizeNoticeProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Monitor className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-xl">Larger Screen Required</CardTitle>
          <CardDescription className="text-base">
            {description || (
              <>
                The <strong>{feature}</strong> requires a screen width of at least{' '}
                <strong>{minWidth}</strong> for the best experience.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This feature involves comparing multiple database tables side-by-side,
            which works best on desktop or laptop screens.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/browse">
              <Button variant="outline" className="gap-2 w-full sm:w-auto">
                <ArrowLeft className="h-4 w-4" />
                Go to Schema Browser
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="default" className="w-full sm:w-auto">
                Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
