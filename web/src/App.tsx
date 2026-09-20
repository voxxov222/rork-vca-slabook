import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppShell from "@/components/AppShell";
import { VcaProvider } from "@/lib/store";

import CardDetail from "./pages/CardDetail";
import AdminOS from "./pages/AdminOS";
import Collection from "./pages/Collection";
import Discover from "./pages/Discover";
import Index from "./pages/Index";
import Messenger from "./pages/Messenger";
import Marketplace from "./pages/Marketplace";
import NotFound from "./pages/NotFound";
import Scanner from "./pages/Scanner";
import SetIndex from "./pages/SetIndex";
import Splash from "./pages/Splash";
import SlabCreator from "./pages/SlabCreator";
import Slabook from "./pages/Slabook";
import Submit from "./pages/Submit";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <VcaProvider>
        <Toaster />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Splash lives outside the app shell — full-bleed prototype experience. */}
            <Route path="/" element={<Splash />} />
            <Route path="/splash" element={<Splash />} />
            <Route element={<AppShell />}>
              <Route path="/home" element={<Index />} />
              <Route path="/slabook" element={<Slabook />} />
              <Route path="/scanner" element={<Scanner />} />
              <Route path="/collection" element={<Collection />} />
              <Route path="/slab-creator" element={<SlabCreator />} />
              <Route path="/submit" element={<Submit />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/set-index" element={<SetIndex />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/messenger" element={<Messenger />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/collector/:userId" element={<Profile />} />
              <Route path="/card/:cardId" element={<CardDetail />} />
              <Route path="/admin" element={<AdminOS />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </VcaProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
