import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Heart } from "lucide-react";

const JoinUs = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    university: "",
    major: "",
    year: "",
    motivation: "",
    skills: "",
    availability: ""
  });

  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || !formData.motivation) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from("join_submissions")
      .insert([{
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        university: formData.university,
        major: formData.major,
        year: formData.year,
        motivation: formData.motivation,
        skills: formData.skills,
        availability: formData.availability,
      }]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Application Submitted!",
      description: "Thank you for your interest. We'll review your application and get back to you soon."
    });

    // Reset form
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      university: "",
      major: "",
      year: "",
      motivation: "",
      skills: "",
      availability: ""
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-accent py-20">
        <div className="container mx-auto px-4 text-center">
          <Heart className="w-16 h-16 text-white mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Join Life Savers</h1>
          <p className="text-white/90 text-lg max-w-2xl mx-auto">
            Be part of a community dedicated to advancing scientific knowledge and making a difference in healthcare
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Learn & Grow</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Access exclusive workshops, seminars, and research opportunities to expand your knowledge.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Network</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Connect with like-minded students, professionals, and mentors in the scientific community.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Make Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Contribute to meaningful projects and community initiatives that make a real difference.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Application Form */}
      <section className="container mx-auto px-4 pb-16">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-primary flex items-center gap-2">
              <UserPlus />
              Membership Application
            </CardTitle>
            <CardDescription>
              Fill out the form below to apply for membership. Fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div>
                  <Label htmlFor="university">University/Institution</Label>
                  <Input
                    id="university"
                    name="university"
                    value={formData.university}
                    onChange={handleChange}
                    placeholder="Your university"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="major">Major/Field of Study</Label>
                  <Input
                    id="major"
                    name="major"
                    value={formData.major}
                    onChange={handleChange}
                    placeholder="e.g., Medicine, Pharmacy"
                  />
                </div>
                <div>
                  <Label htmlFor="year">Year of Study</Label>
                  <Input
                    id="year"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    placeholder="e.g., 2nd year"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="motivation">Why do you want to join Life Savers? *</Label>
                <Textarea
                  id="motivation"
                  name="motivation"
                  value={formData.motivation}
                  onChange={handleChange}
                  placeholder="Tell us about your motivation and what you hope to contribute..."
                  className="min-h-[120px]"
                  required
                />
              </div>

              <div>
                <Label htmlFor="skills">Relevant Skills & Experience</Label>
                <Textarea
                  id="skills"
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="List any relevant skills, experiences, or previous involvement in similar organizations..."
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <Label htmlFor="availability">Availability</Label>
                <Textarea
                  id="availability"
                  name="availability"
                  value={formData.availability}
                  onChange={handleChange}
                  placeholder="What days/times are you typically available for club activities?"
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" variant="pill" size="lg" className="flex-1">
                  Submit Application
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setFormData({
                    fullName: "",
                    email: "",
                    phone: "",
                    university: "",
                    major: "",
                    year: "",
                    motivation: "",
                    skills: "",
                    availability: ""
                  })}
                >
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default JoinUs;
