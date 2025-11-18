import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import { ClassicEditor, Bold, Essentials, Italic, Paragraph, Undo, Heading, Link, List, BlockQuote, Image, ImageUpload, MediaEmbed, Table, Indent } from "ckeditor5";
import "ckeditor5/ckeditor5.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Image as ImageIcon } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

const SubmitArticle = () => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Medicine");
  const [content, setContent] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Thanks for your interest.",
      description: "The options are coming soon.",
    });
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-primary mb-8 text-center">Submit Your Article</h1>
        
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Article Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Article Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter article title"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Medicine">Medicine</SelectItem>
                      <SelectItem value="Dental Medicine">Dental Medicine</SelectItem>
                      <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="coverImage">Cover Image</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      id="coverImage"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
                    />
                    {coverImage && <ImageIcon className="text-primary" size={20} />}
                  </div>
                </div>

                <div>
                  <Label htmlFor="document">Full Article Document (Optional)</Label>
                  <div className="mt-1">
                    <Input
                      id="document"
                      type="file"
                      accept=".pdf,.doc,.docx"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Article Content *</CardTitle>
              </CardHeader>
              <CardContent>
                <CKEditor
                  editor={ClassicEditor}
                  config={{
                    plugins: [Essentials, Bold, Italic, Paragraph, Undo, Heading, Link, List, BlockQuote, Image, ImageUpload, MediaEmbed, Table, Indent],
                    toolbar: [
                      'undo', 'redo', '|',
                      'heading', '|',
                      'bold', 'italic', '|',
                      'link', 'blockQuote', '|',
                      'bulletedList', 'numberedList', 'outdent', 'indent', '|',
                      'insertTable', 'mediaEmbed'
                    ]
                  }}
                  data={content}
                  onChange={(event, editor) => {
                    setContent(editor.getData());
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Author Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="authorName">Name *</Label>
                  <Input
                    id="authorName"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="authorEmail">Email *</Label>
                  <Input
                    id="authorEmail"
                    type="email"
                    value={authorEmail}
                    onChange={(e) => setAuthorEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="socialMedia">Social Media (Optional)</Label>
                  <Input
                    id="socialMedia"
                    placeholder="Twitter, LinkedIn, etc."
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <Button 
              variant="pill" 
              size="lg" 
              className="w-full"
              onClick={handleSubmit}
            >
              coming soon.......
            </Button>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {title && <h2 className="text-2xl font-bold text-primary mb-4">{title}</h2>}
                {coverImage && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <img 
                      src={URL.createObjectURL(coverImage)} 
                      alt="Cover preview" 
                      className="w-full h-auto"
                    />
                  </div>
                )}
                {content ? (
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                ) : (
                  <p className="text-muted-foreground italic">Your article content will appear here...</p>
                )}
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">Tools & Export</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full" disabled>
                  <FileText size={16} className="mr-2" />
                  Export as PDF
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Available after submission
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmitArticle;
