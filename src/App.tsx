import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { lazy, Suspense, useEffect, type ComponentType, type LazyExoticComponent } from "react";
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

const publicRoutePreloads = [Login.preload, Signup.preload, NotFound.preload];
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
  const [location] = useLocation();
  const showAppShell = Boolean(session && profile && location !== "/profile/create");

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

function ProtectedRoute({ component: Component, ...rest }: { component: ComponentType<any>; [key: string]: any }) {
  const { session, loading, profile } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!session) {
    return <Redirect to="/login" />;
  }

  if (!profile && location !== "/profile/create") {
    return <Redirect to="/profile/create" />;
  }

  return <Component {...rest} />;
}

function HomeRedirect() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!session) return <Redirect to="/login" />;
  if (!profile) return <Redirect to="/profile/create" />;
  return <Redirect to="/browse" />;
}

function ProfileCreateRoute() {
  const { session, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!session) return <Redirect to="/login" />;
  return <ProfilePage mode="create" />;
}

function Router() {
  return (
    <>
      <RoutePreloader />
      <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/profile/create" component={ProfileCreateRoute} />
        <Route path="/profile/edit">
          <ProtectedRoute component={ProfilePage} mode="edit" />
        </Route>
        <Route path="/browse">
          <ProtectedRoute component={Browse} />
        </Route>
        <Route path="/user/:id">
          <ProtectedRoute component={UserProfile} />
        </Route>
        <Route path="/interests">
          <ProtectedRoute component={Interests} />
        </Route>
        <Route path="/chat">
          <ProtectedRoute component={ChatList} />
        </Route>
        <Route path="/chat/:userId">
          <ProtectedRoute component={Chat} />
        </Route>
        <Route path="/subscriptions">
          <ProtectedRoute component={Subscription} />
        </Route>
        <Route path="/admin">
          <ProtectedRoute component={Admin} />
        </Route>
        <Route path="/ai-match">
          <ProtectedRoute component={AiMatch} />
        </Route>
        <Route path="/profile-optimizer">
          <ProtectedRoute component={ProfileOptimizer} />
        </Route>
        <Route component={NotFound} />
      </Switch>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
          <SonnerToaster position="top-right" richColors />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
