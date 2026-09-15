import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, useState, type ComponentType, type LazyExoticComponent, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";

const queryClient = new QueryClient();

type PreloadableLazyComponent<T extends ComponentType<any>> = LazyExoticComponent<T> & {
  preload: () => Promise<{ default: T }>;
};

const lazyWithPreload = <T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) => {
  const Component = lazy(factory) as PreloadableLazyComponent<T>;
  Component.preload = factory;
  return Component;
};

const Login = lazyWithPreload(() => import("@/pages/Login"));
const Signup = lazyWithPreload(() => import("@/pages/Signup"));
const Landing = lazyWithPreload(() => import("@/pages/Landing"));
const ProfilePage = lazyWithPreload(() => import("@/pages/Profile"));
const Browse = lazyWithPreload(() => import("@/pages/Browse"));
const UserProfile = lazyWithPreload(() => import("@/pages/UserProfile"));
const Interests = lazyWithPreload(() => import("@/pages/Interests"));
const ChatList = lazyWithPreload(() => import("@/pages/ChatList"));
const Chat = lazyWithPreload(() => import("@/pages/Chat"));
const Subscription = lazyWithPreload(() => import("@/pages/Subscription"));
const Admin = lazyWithPreload(() => import("@/pages/Admin"));
const AiMatch = lazyWithPreload(() => import("@/pages/AiMatch"));
const ProfileOptimizer = lazyWithPreload(() => import("@/pages/ProfileOptimizer"));
const NotFound = lazyWithPreload(() => import("@/pages/not-found"));

const publicRoutePreloads = [Login.preload, Signup.preload];
const signedInRoutePreloads = [Browse.preload, ChatList.preload, Interests.preload];

function AppLoadingScreen({ label = "Preparing Vivah" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[hsl(var(--background))] text-foreground">
      <div className="flex flex-col items-center gap-5">
        <div className="flex h-12 items-center gap-2" aria-hidden="true">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_22px_hsl(var(--primary)/0.45)]"
              style={{
                animation: "vivah-dot-pulse 900ms ease-in-out infinite",
                animationDelay: `${dot * 140}ms`,
              }}
            />
          ))}
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}

function RouteContentLoader() {
  return (
    <div className="flex min-h-[320px] items-center justify-center" aria-label="Loading page">
      <InlineDotLoader label="Rendering page" />
    </div>
  );
}

function InlineDotLoader({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-4 text-muted-foreground">
      <div className="flex items-center gap-2" aria-hidden="true">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="h-2 w-2 rounded-full bg-primary"
            style={{
              animation: "vivah-dot-pulse 900ms ease-in-out infinite",
              animationDelay: `${dot * 140}ms`,
            }}
          />
        ))}
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.2em]">{label}</p>
    </div>
  );
}

function RouteFallback() {
  const { session, profile } = useAuth();
  const location = useLocation();
  const showAppShell = Boolean(session && profile && location.pathname !== "/profile/create");

  if (showAppShell) {
    return (
      <Layout>
        <RouteContentLoader />
      </Layout>
    );
  }

  return <AppLoadingScreen label="Loading Vivah" />;
}

function RoutePreloader() {
  const { session } = useAuth();
  const isSignedIn = Boolean(session);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile) return;

    const timeoutId = window.setTimeout(() => {
      const preloads = isSignedIn ? signedInRoutePreloads : publicRoutePreloads;

      preloads.forEach((preload) => {
        void preload().catch(() => undefined);
      });
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [isSignedIn]);

  return null;
}

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles?: Array<"user" | "admin" | "primary_admin">;
}) {
  const { session, loading, profile } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AppLoadingScreen label="Checking session" />;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!profile && location.pathname !== "/profile/create") {
    return <Navigate to="/profile/create" replace />;
  }

  if (profile && allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/browse" replace />;
  }

  return <>{children}</>;
}

function HomeRedirect() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <AppLoadingScreen label="Checking session" />;
  }

  if (!session) return <Landing />;
  if (!profile) return <Navigate to="/profile/create" replace />;
  return <Navigate to="/browse" replace />;
}

function ProfileCreateRoute() {
  const { session, profile, loading } = useAuth();
  if (loading) return <AppLoadingScreen label="Checking session" />;
  if (!session) return <Navigate to="/login" replace />;
  if (profile) return <Navigate to="/browse" replace />;
  return <ProfilePage mode="create" />;
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function RouteRenderGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    const fontsReady =
      "fonts" in document
        ? Promise.race([document.fonts.ready.then(() => undefined), wait(900)])
        : Promise.resolve();

    Promise.all([waitForPaint(), fontsReady, wait(360)]).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [location.key, location.pathname]);

  return (
    <>
      {children}
      {!ready && <AppLoadingScreen label="Rendering Vivah" />}
    </>
  );
}

function Router() {
  return (
    <>
      <RoutePreloader />
      <RouteRenderGate>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/profile/create" element={<ProfileCreateRoute />} />
            <Route
              path="/profile/edit"
              element={
                <ProtectedRoute>
                  <ProfilePage mode="edit" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/browse"
              element={
                <ProtectedRoute>
                  <Browse />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/:id"
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/interests"
              element={
                <ProtectedRoute>
                  <Interests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:userId"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions"
              element={
                <ProtectedRoute>
                  <Subscription />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin", "primary_admin"]}>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-match"
              element={
                <ProtectedRoute>
                  <AiMatch />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile-optimizer"
              element={
                <ProtectedRoute>
                  <ProfileOptimizer />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </RouteRenderGate>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "") || undefined}>
            <Router />
          </BrowserRouter>
          <Toaster />
          <SonnerToaster position="top-right" richColors />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
