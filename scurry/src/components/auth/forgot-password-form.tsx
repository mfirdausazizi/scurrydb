'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations/auth';
import { Turnstile, useTurnstile } from './turnstile';

export function ForgotPasswordForm() {
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [honeypot, setHoneypot] = React.useState('');
  const turnstile = useTurnstile();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          _hp: honeypot, // Honeypot field
          _turnstile: turnstile.token, // Turnstile token
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to send reset email');
        turnstile.reset();
        return;
      }

      setIsSubmitted(true);
    } catch {
      setError('An unexpected error occurred');
      turnstile.reset();
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAgain = () => {
    setIsSubmitted(false);
    turnstile.reset();
  };

  if (isSubmitted) {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-forest/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-forest" />
          </div>
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-muted-foreground mt-2">
            If an account with that email exists, we&apos;ve sent you a link to reset your password.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Didn&apos;t receive the email? Check your spam folder, or{' '}
            <button
              onClick={handleTryAgain}
              className="text-primary hover:underline"
            >
              try again
            </button>
            .
          </p>
        </div>

        <p className="text-center">
          <Link
            href="/login"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Forgot your password?</h1>
        <p className="text-muted-foreground mt-2">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {(error || turnstile.error) && (
            <div className="bg-berry/10 text-berry text-sm p-3 rounded-md">
              {error || turnstile.error}
            </div>
          )}

          {/* Honeypot field - hidden from users, bots will fill it */}
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <label htmlFor="phone">Phone</label>
            <input
              type="text"
              id="phone"
              name="phone"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Turnstile
            onVerify={turnstile.onVerify}
            onError={turnstile.onError}
            onExpire={turnstile.onExpire}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reset Link
          </Button>
        </form>
      </Form>

      <p className="text-center">
        <Link
          href="/login"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
