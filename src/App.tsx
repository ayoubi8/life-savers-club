import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Members from "./pages/Members";
import Events from "./pages/Events";
import EventDetailPage from "./pages/EventDetailPage";
import Articles from "./pages/Articles";
import ArticleDetailPage from "./pages/ArticleDetailPage";
import Sponsors from "./pages/Sponsors";
import BecomeSponsor from "./pages/BecomeSponsor";
import SubmitArticle from "./pages/SubmitArticle";
import JoinUs from "./pages/JoinUs";
import Admin from "./pages/Admin";
import AdminMembers from "./pages/AdminMembers";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Layout from "./components/layout/Layout";
import { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client";
import ManageRoles from "./pages/ManageRoles";
import ManageJoinUsPage from "./pages/ManageJoinUsPage";
import ManageEvents from "./pages/ManageEvents";
import EventEditor from "./pages/EventEditor";
import ManageArticles from "./pages/ManageArticles";
import ArticleEditor from "./pages/ArticleEditor";
import ManageJoinUsForm from "./pages/admin/ManageJoinUsForm";
import ManageSponsors from "./pages/admin/ManageSponsors";

const queryClient = new QueryClient();

const AppContent = () => {
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching user role:", error);
        } else if (data) {
          setUserRole(data.role);
        }
      }
    };

    fetchUserRole();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserRole();
      } else {
        setUserRole(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/members" element={<Members />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/articles" element={<Articles />} />
        <Route path="/articles/:slug" element={<ArticleDetailPage />} />
        <Route path="/sponsors" element={<Sponsors />} />
        <Route path="/become-sponsor" element={<BecomeSponsor />} />
        <Route path="/submit-article" element={<SubmitArticle />} />
        <Route path="/join-us" element={<JoinUs />} />
        <Route path="/auth" element={<Auth />} />
        {(userRole === 'admin' || userRole === 'root') && (
          <>
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/members" element={<AdminMembers />} />
            <Route path="/manage-roles" element={<ManageRoles />} />
            <Route path="/manage-join-us" element={<ManageJoinUsPage />} />
            <Route path="/admin/manage-join-us-form" element={<ManageJoinUsForm />} />
            <Route path="/admin/sponsors" element={<ManageSponsors />} />
            <Route path="/manage-events" element={<ManageEvents />} />
            <Route path="/admin/event/:id" element={<EventEditor />} />
            <Route path="/admin/articles" element={<ManageArticles />} />
            <Route path="/admin/article/new" element={<ArticleEditor />} />
            <Route path="/admin/article/edit/:slug" element={<ArticleEditor />} />
          </>
        )}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
