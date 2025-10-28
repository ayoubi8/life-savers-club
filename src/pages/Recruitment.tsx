import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Recruitment = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    motivation: "",
    experience: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save to localStorage (in real app, this would go to backend)
    const submissions = JSON.parse(localStorage.getItem("recruitmentSubmissions") || "[]");
    submissions.push({
      ...formData,
      submittedAt: new Date().toISOString(),
    });
    localStorage.setItem("recruitmentSubmissions", JSON.stringify(submissions));

    toast({
      title: "Application Submitted!",
      description: "Thank you for applying. We'll review your application soon.",
    });

    // Reset form
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      motivation: "",
      experience: "",
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-[var(--gradient-hero)] bg-clip-text text-transparent">
            Join Life Savers
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Be part of a community dedicated to making a difference in healthcare
          </p>
        </div>

        {/* Application Form */}
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="text-2xl">Application Form</CardTitle>
              <CardDescription>
                Tell us about yourself and why you want to join our team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                {/* Motivation */}
                <div className="space-y-2">
                  <Label htmlFor="motivation">Why do you want to join Life Savers? *</Label>
                  <Textarea
                    id="motivation"
                    name="motivation"
                    required
                    value={formData.motivation}
                    onChange={handleChange}
                    placeholder="Share your motivation and what drives you..."
                    rows={4}
                  />
                </div>

                {/* Experience */}
                <div className="space-y-2">
                  <Label htmlFor="experience">Relevant Experience or Skills</Label>
                  <Textarea
                    id="experience"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    placeholder="Tell us about your background, skills, or previous volunteer work..."
                    rows={4}
                  />
                </div>

                {/* File Upload */}
                <div className="space-y-2">
                  <Label htmlFor="media">Upload Supporting Documents (Optional)</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, Images, or Videos (Max 10MB)
                    </p>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-4">
                  <Button type="submit" className="flex-1">
                    Submit Application
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setFormData({
                        fullName: "",
                        email: "",
                        phone: "",
                        motivation: "",
                        experience: "",
                      })
                    }
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Recruitment;
