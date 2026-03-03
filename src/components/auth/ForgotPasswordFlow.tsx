import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { AlertCircle, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';

type Step = 'email' | 'otp' | 'new-password' | 'success';

interface ForgotPasswordFlowProps {
  onBack: () => void;
}

export default function ForgotPasswordFlow({ onBack }: ForgotPasswordFlowProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        setError(error.message);
      } else {
        setStep('otp');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'recovery',
      });
      if (error) {
        setError('Invalid or expired code. Please try again.');
      } else {
        setStep('new-password');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
      } else {
        setStep('success');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <p className="text-center font-medium">Password updated successfully!</p>
        <Button variant="outline" className="w-full" onClick={onBack}>
          Back to Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {step === 'email' && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter your email and we'll send you a 6-digit code to reset your password.
          </p>
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : 'Send Code'}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
          </Button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>. Enter it below.
          </p>
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting || otp.length !== 6}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : 'Verify Code'}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => { setStep('email'); setOtp(''); setError(null); }}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Use a different email
          </Button>
        </form>
      )}

      {step === 'new-password' && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-muted-foreground">Enter your new password below.</p>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input id="new-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isSubmitting} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isSubmitting} />
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : 'Update Password'}
          </Button>
        </form>
      )}
    </div>
  );
}
