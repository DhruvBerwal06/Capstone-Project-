import { Suspense, lazy } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const Toaster = lazy(() =>
  import("@/components/ui/sonner").then(module => ({ default: module.Toaster }))
);
const TooltipProvider = lazy(() =>
  import("@/components/ui/tooltip").then(module => ({ default: module.TooltipProvider }))
);
const Home = lazy(() => import("@/pages/Home"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function Router() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <Suspense fallback={null}>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </Suspense>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
