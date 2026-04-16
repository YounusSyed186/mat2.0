import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ProfilePage from "@/pages/Profile";
import Browse from "@/pages/Browse";
import UserProfile from "@/pages/UserProfile";
import Interests from "@/pages/Interests";
import ChatList from "@/pages/ChatList";
import Chat from "@/pages/Chat";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/not-found";
import { Skeleton } from "@/components/ui/skeleton";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any>; [key: string]: any }) {
  const { session, loading, profile } = useAuth();
  const [location] = useLocation();

  if (loading) {
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-3 w-48">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!session) return <Redirect to="/login" />;
  if (!profile) return <Redirect to="/profile/create" />;
  return <Redirect to="/browse" />;
}

function ProfileCreateRoute() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Redirect to="/login" />;
  return <ProfilePage mode="create" />;
}

function Router() {
  return (
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
      <Route path="/admin">
        <ProtectedRoute component={Admin} />
      </Route>
      <Route component={NotFound} />
    </Switch>
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
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
