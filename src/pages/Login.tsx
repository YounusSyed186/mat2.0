import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { AuthSplitLayout } from "@/components/AuthSplitLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/browse");
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/browse`,
      },
    });
    if (error) {
      toast({ title: "Google login failed", description: error.message, variant: "destructive" });
      setGoogleLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast({ title: "Enter your email first", description: "We need your email to send a reset link." });
      return;
    }

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (error) {
      toast({ title: "Reset link failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reset link sent", description: "Check your email for the password reset link." });
    }
    setResetLoading(false);
  };

  return (
    <AuthSplitLayout
      title="Hi, welcome back"
      subtitle="Sign in to continue your Vivah journey."
      actionLabel="Sign up"
      actionHref="/signup"
      actionButtonLabel="Join Us"
      visualMeta="Meaningful beginnings"
    >
      <form onSubmit={handleLogin} className="premium-card rounded-[28px] p-4 space-y-4 sm:p-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 rounded-2xl bg-white/70 px-4 shadow-none dark:bg-white/5"
            data-testid="input-email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-12 rounded-2xl bg-white/70 px-4 shadow-none dark:bg-white/5"
            data-testid="input-password"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handlePasswordReset}
            disabled={resetLoading}
            className="text-xs font-semibold text-primary hover:underline disabled:opacity-60"
          >
            {resetLoading ? "Sending reset..." : "Forgot password?"}
          </button>
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
          className="h-12 w-full rounded-2xl gap-2 bg-white/70 shadow-none dark:bg-white/5"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          data-testid="button-google-login"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {googleLoading ? "Redirecting..." : "Login with Google"}
        </Button>

        <Button type="submit" className="premium-cta h-12 w-full rounded-full text-sm font-bold shadow-none" disabled={loading} data-testid="button-login">
          {loading ? "Signing in..." : "Login"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link
          to="/signup"
          className="font-semibold text-primary hover:underline"
          data-testid="link-signup"
        >
          Sign up
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
