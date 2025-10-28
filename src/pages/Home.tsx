import { Calendar, Heart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.jpg";

const Home = () => {
  const announcements = [
    {
      title: "New Recruitment Open!",
      date: "2024-03-15",
      description: "We're looking for passionate students to join our team. Applications open now!",
    },
    {
      title: "Health Awareness Campaign",
      date: "2024-03-20",
      description: "Join us for our upcoming health awareness event on campus.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--gradient-hero)] opacity-10" />
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-8">
              <img 
                src={logo} 
                alt="Life Savers Logo" 
                className="h-40 w-40 rounded-full ring-4 ring-primary/30 shadow-[var(--shadow-card)] animate-in fade-in zoom-in duration-500"
              />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-[var(--gradient-hero)] bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-700">
              Welcome to Life Savers
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700 delay-150">
              A scientific club dedicated to promoting health awareness, medical education, 
              and saving lives through knowledge and compassion.
            </p>
            <div className="flex gap-4 justify-center animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
              <Link to="/recruitment">
                <Button size="lg" className="shadow-lg hover:shadow-xl transition-shadow">
                  <Heart className="mr-2 h-5 w-5" />
                  Join Our Team
                </Button>
              </Link>
              <Link to="/memories">
                <Button size="lg" variant="outline" className="shadow-lg hover:shadow-xl transition-shadow">
                  View Memories
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-2 hover:border-primary transition-all hover:shadow-[var(--shadow-card)] group">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                To empower students with medical knowledge and create a community 
                passionate about healthcare and saving lives.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-accent transition-all hover:shadow-[var(--shadow-card)] group">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>Our Community</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Join a diverse group of students, professionals, and volunteers 
                working together to make a difference.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary transition-all hover:shadow-[var(--shadow-card)] group">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Our Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Regular workshops, health campaigns, training sessions, and 
                community outreach programs throughout the year.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Announcements */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8 text-center">Latest Announcements</h2>
        <div className="max-w-3xl mx-auto space-y-4">
          {announcements.map((announcement, index) => (
            <Card key={index} className="hover:shadow-[var(--shadow-card)] transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{announcement.title}</CardTitle>
                    <CardDescription className="mt-2">
                      <Calendar className="inline h-4 w-4 mr-2" />
                      {new Date(announcement.date).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{announcement.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
