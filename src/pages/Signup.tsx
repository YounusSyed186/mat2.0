import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { AuthSplitLayout } from "@/components/AuthSplitLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function Signup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/profile/create`,
      },
    });

    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      toast({
        title: "Account already exists",
        description: "An account with this email already exists. Please log in.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (data?.session) {
      toast({ title: "Account created!", description: "Please complete your profile." });
      navigate("/profile/create");
    } else {
      setEmailSent(true);
      toast({
        title: "Check your email",
        description: `We have sent a verification link to ${email}.`,
      });
    }
    setLoading(false);
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/profile/create`,
      },
    });
    if (error) {
      toast({ title: "Google signup failed", description: error.message, variant: "destructive" });
      setGoogleLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      title="Create account"
      subtitle="Join Vivaah Vedika and start building a profile made for the right match."
      actionLabel="Sign in"
      actionHref="/login"
      actionButtonLabel="Login"
      visualMeta="New beginnings"
    >
      {emailSent ? (
        <div className="premium-card rounded-xl p-6 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold">Check your inbox</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We've sent a confirmation link to <strong className="text-foreground">{email}</strong>. Please click the link to confirm your account and begin your profile setup.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Button asChild className="premium-cta h-12 w-full rounded-full text-sm font-bold shadow-none">
              <Link to="/login">Go to Login</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEmailSent(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Use a different email
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSignup} className="premium-card rounded-xl p-4 space-y-4 sm:p-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-lg bg-white/70 px-4 shadow-none dark:bg-white/5"
              data-testid="input-email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 rounded-lg bg-white/70 px-4 shadow-none dark:bg-white/5"
              data-testid="input-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="h-12 rounded-lg bg-white/70 px-4 shadow-none dark:bg-white/5"
              data-testid="input-confirm-password"
            />
          </div>

          <div className="relative py-3">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-xs text-muted-foreground dark:bg-slate-900">
              or
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-lg gap-2 bg-white/70 shadow-none dark:bg-white/5"
            onClick={handleGoogleSignup}
            disabled={googleLoading}
            data-testid="button-google-signup"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {googleLoading ? "Redirecting..." : "Sign up with Google"}
          </Button>

          <Button type="submit" className="premium-cta h-12 w-full rounded-full text-sm font-bold shadow-none" disabled={loading} data-testid="button-signup">
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-primary hover:underline"
          data-testid="link-login"
        >
          Sign in
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
