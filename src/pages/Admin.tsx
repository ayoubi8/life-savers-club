import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { FileText, Calendar, Heart, Users, LogOut } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Articles state
  const [articles, setArticles] = useState<any[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  
  // Events state
  const [events, setEvents] = useState<any[]>([]);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_date: "",
    status: "upcoming" as "upcoming" | "past",
    show_explore_button: false,
  });
  
  // Sponsors state
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [newSponsor, setNewSponsor] = useState({
    name: "",
    logo: "",
    facebook_url: "",
    instagram_url: "",
    email: "",
  });
  
  // Join submissions state
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (error || !data) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      loadAllData();
    } catch (error) {
      console.error("Error checking admin:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    await Promise.all([
      loadArticles(),
      loadEvents(),
      loadSponsors(),
      loadSubmissions(),
    ]);
  };

  const loadArticles = async () => {
    setLoadingArticles(true);
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading articles",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setArticles(data || []);
    }
    setLoadingArticles(false);
  };

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: false });

    if (error) {
      toast({
        title: "Error loading events",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setEvents(data || []);
    }
  };

  const loadSponsors = async () => {
    const { data, error } = await supabase
      .from("sponsors")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast({
        title: "Error loading sponsors",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSponsors(data || []);
    }
  };

  const loadSubmissions = async () => {
    const { data, error } = await supabase
      .from("join_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading submissions",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSubmissions(data || []);
    }
  };

  const handleArticleAction = async (id: string, action: "approve" | "reject", reason?: string) => {
    const { error } = await supabase
      .from("articles")
      .update({
        status: action === "approve" ? "approved" : "rejected",
        published_at: action === "approve" ? new Date().toISOString() : null,
        rejection_reason: reason,
      })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error updating article",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Article ${action}d successfully`,
      });
      loadArticles();
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.description || !newEvent.event_date) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("events").insert([{
      ...newEvent,
      images: [],
    }]);

    if (error) {
      toast({
        title: "Error adding event",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Event added successfully",
      });
      setNewEvent({
        title: "",
        description: "",
        event_date: "",
        status: "upcoming",
        show_explore_button: false,
      });
      loadEvents();
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting event",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
      loadEvents();
    }
  };

  const handleAddSponsor = async () => {
    if (!newSponsor.name || !newSponsor.logo) {
      toast({
        title: "Missing fields",
        description: "Name and logo are required",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("sponsors").insert([newSponsor]);

    if (error) {
      toast({
        title: "Error adding sponsor",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Sponsor added successfully",
      });
      setNewSponsor({
        name: "",
        logo: "",
        facebook_url: "",
        instagram_url: "",
        email: "",
      });
      loadSponsors();
    }
  };

  const handleDeleteSponsor = async (id: string) => {
    const { error } = await supabase.from("sponsors").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting sponsor",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Sponsor deleted successfully",
      });
      loadSponsors();
    }
  };

  const handleSubmissionAction = async (id: string, status: "accepted" | "rejected", notes?: string) => {
    const { error } = await supabase
      .from("join_submissions")
      .update({ status, notes })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error updating submission",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Submission ${status} successfully`,
      });
      loadSubmissions();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return <div className="container py-12 text-center">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-primary">Admin Panel</h1>
          <p className="text-muted-foreground mt-2">Manage all website content</p>
        </div>
        <Button onClick={handleLogout} variant="outline">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      <Tabs defaultValue="articles" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="articles">
            <FileText className="mr-2 h-4 w-4" />
            Articles
          </TabsTrigger>
          <TabsTrigger value="events">
            <Calendar className="mr-2 h-4 w-4" />
            Events
          </TabsTrigger>
          <TabsTrigger value="sponsors">
            <Heart className="mr-2 h-4 w-4" />
            Sponsors
          </TabsTrigger>
          <TabsTrigger value="submissions">
            <Users className="mr-2 h-4 w-4" />
            Join Requests
          </TabsTrigger>
        </TabsList>

        {/* Articles Tab */}
        <TabsContent value="articles">
          <Card>
            <CardHeader>
              <CardTitle>Article Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell className="font-medium">{article.title}</TableCell>
                      <TableCell>{article.author_name}</TableCell>
                      <TableCell>{article.category}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          article.status === 'approved' ? 'bg-green-100 text-green-800' :
                          article.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {article.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {article.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleArticleAction(article.id, "approve")}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleArticleAction(article.id, "reject", "Not suitable")}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Add New Event</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="event-title">Event Title</Label>
                  <Input
                    id="event-title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="event-description">Description</Label>
                  <Textarea
                    id="event-description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="event-date">Event Date</Label>
                  <Input
                    id="event-date"
                    type="datetime-local"
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="event-status">Status</Label>
                  <Select
                    value={newEvent.status}
                    onValueChange={(value: "upcoming" | "past") => setNewEvent({ ...newEvent, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="past">Past</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddEvent}>Add Event</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Events</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>{event.title}</TableCell>
                        <TableCell>{new Date(event.event_date).toLocaleDateString()}</TableCell>
                        <TableCell>{event.status}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sponsors Tab */}
        <TabsContent value="sponsors">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Add New Sponsor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="sponsor-name">Sponsor Name</Label>
                  <Input
                    id="sponsor-name"
                    value={newSponsor.name}
                    onChange={(e) => setNewSponsor({ ...newSponsor, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="sponsor-logo">Logo URL</Label>
                  <Input
                    id="sponsor-logo"
                    value={newSponsor.logo}
                    onChange={(e) => setNewSponsor({ ...newSponsor, logo: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div>
                  <Label htmlFor="sponsor-facebook">Facebook URL (optional)</Label>
                  <Input
                    id="sponsor-facebook"
                    value={newSponsor.facebook_url}
                    onChange={(e) => setNewSponsor({ ...newSponsor, facebook_url: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="sponsor-instagram">Instagram URL (optional)</Label>
                  <Input
                    id="sponsor-instagram"
                    value={newSponsor.instagram_url}
                    onChange={(e) => setNewSponsor({ ...newSponsor, instagram_url: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="sponsor-email">Email (optional)</Label>
                  <Input
                    id="sponsor-email"
                    type="email"
                    value={newSponsor.email}
                    onChange={(e) => setNewSponsor({ ...newSponsor, email: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddSponsor}>Add Sponsor</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Sponsors</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Logo</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sponsors.map((sponsor) => (
                      <TableRow key={sponsor.id}>
                        <TableCell>{sponsor.name}</TableCell>
                        <TableCell>
                          <img src={sponsor.logo} alt={sponsor.name} className="w-12 h-12 rounded-full object-cover" />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteSponsor(sponsor.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submissions">
          <Card>
            <CardHeader>
              <CardTitle>Join Us Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>University</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>{submission.full_name}</TableCell>
                      <TableCell>{submission.email}</TableCell>
                      <TableCell>{submission.university}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          submission.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          submission.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {submission.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {submission.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleSubmissionAction(submission.id, "accepted")}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleSubmissionAction(submission.id, "rejected")}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
