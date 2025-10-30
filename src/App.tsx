import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NewHome from "./pages/NewHome";
import NewMembers from "./pages/NewMembers";
import Events from "./pages/Events";
import Articles from "./pages/Articles";
import Sponsors from "./pages/Sponsors";
import BecomeSponsor from "./pages/BecomeSponsor";
import SubmitArticle from "./pages/SubmitArticle";
import JoinUs from "./pages/JoinUs";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Header from "./components/Header";
import Footer from "./components/Footer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<NewHome />} />
          <Route path="/members" element={<NewMembers />} />
          <Route path="/events" element={<Events />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/sponsors" element={<Sponsors />} />
          <Route path="/become-sponsor" element={<BecomeSponsor />} />
          <Route path="/submit-article" element={<SubmitArticle />} />
          <Route path="/join-us" element={<JoinUs />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/auth" element={<Auth />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
