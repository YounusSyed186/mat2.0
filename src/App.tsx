import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, type ComponentType, type LazyExoticComponent, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
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

const publicRoutePreloads = [Landing.preload, Login.preload, Signup.preload, NotFound.preload];
const protectedRoutePreloads = [
  ProfilePage.preload,
  Browse.preload,
  UserProfile.preload,
  Interests.preload,
  ChatList.preload,
  Chat.preload,
  Subscription.preload,
  Admin.preload,
  AiMatch.preload,
  ProfileOptimizer.preload,
];

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="space-y-3 w-48">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

function RouteContentLoader() {
  return (
    <div className="space-y-6" aria-label="Loading page">
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-lg border bg-card p-5 shadow-sm">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-8 w-20" />
            <Skeleton className="mt-3 h-3 w-36" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="mt-6 space-y-3">
          {[0, 1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-12 w-full" />
          ))}
        </div>
      </div>
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

  return <PageLoader />;
}

function RoutePreloader() {
  const { session } = useAuth();
  const isSignedIn = Boolean(session);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const preloads = isSignedIn
        ? [...protectedRoutePreloads, ...publicRoutePreloads]
        : publicRoutePreloads;

      preloads.forEach((preload) => {
        void preload().catch(() => undefined);
      });
    }, 200);

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
    return <PageLoader />;
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
    return <PageLoader />;
  }

  if (!session) return <Landing />;
  if (!profile) return <Navigate to="/profile/create" replace />;
  return <Navigate to="/browse" replace />;
}

function ProfileCreateRoute() {
  const { session, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!session) return <Navigate to="/login" replace />;
  return <ProfilePage mode="create" />;
}

function Router() {
  return (
    <>
      <RoutePreloader />
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
