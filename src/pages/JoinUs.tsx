
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Heart } from "lucide-react";

interface FormField {
  id: number;
  question: string;
  type: 'text' | 'choice' | 'birthday';
  options: string[];
  is_required: boolean;
}

const JoinUs = () => {
  const [fields, setFields] = useState<FormField[]>([]);
  const [formData, setFormData] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('join_us_form_fields')
      .select('*')
      .order('id', { ascending: true });
    if (error) {
      console.error("Error fetching fields:", error);
    } else {
      setFields(data as FormField[]);
      // Initialize formData with empty strings for each field
      const initialFormData: { [key: string]: string } = {};
      (data as FormField[]).forEach(field => {
        initialFormData[field.question] = '';
      });
      setFormData(initialFormData);
    }
    setLoading(false);
  };

  const handleChange = (question: string, value: string) => {
    setFormData(prev => ({ ...prev, [question]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    for (const field of fields) {
      if (field.is_required && !formData[field.question]) {
        toast({
          title: "Missing Information",
          description: `Please fill in the "${field.question}" field.`,
          variant: "destructive"
        });
        return;
      }
    }

    const { error } = await supabase
      .from("join_us_submissions")
      .insert([{ submission_data: formData }]);

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
    const initialFormData: { [key: string]: string } = {};
    fields.forEach(field => {
      initialFormData[field.question] = '';
    });
    setFormData(initialFormData);
  };
  
  const renderField = (field: FormField) => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            id={String(field.id)}
            value={formData[field.question] || ''}
            onChange={(e) => handleChange(field.question, e.target.value)}
            required={field.is_required}
          />
        );
      case 'choice':
        return (
          <Select onValueChange={(value) => handleChange(field.question, value)} value={formData[field.question] || ''}>
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'birthday':
        return (
          <Input
            id={String(field.id)}
            type="date"
            value={formData[field.question] || ''}
            onChange={(e) => handleChange(field.question, e.target.value)}
            required={field.is_required}
          />
        );
      default:
        return null;
    }
  }

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
              Fill out the form below to apply for membership. Fields marked with an asterisk (*) are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading form...</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {fields.map(field => (
                  <div key={field.id}>
                    <Label htmlFor={String(field.id)}>
                      {field.question}
                      {field.is_required && <span className="text-destructive"> *</span>}
                    </Label>
                    {renderField(field)}
                  </div>
                ))}
                <div className="flex gap-4 pt-4">
                  <Button type="submit" variant="pill" size="lg" className="flex-1">
                    Submit Application
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      const initialFormData: { [key: string]: string } = {};
                        fields.forEach(field => {
                          initialFormData[field.question] = '';
                        });
                        setFormData(initialFormData);
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default JoinUs;
