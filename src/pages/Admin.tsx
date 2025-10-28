import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const Admin = () => {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState(() => {
    return JSON.parse(localStorage.getItem("recruitmentSubmissions") || "[]");
  });

  const exportToExcel = () => {
    if (submissions.length === 0) {
      toast({
        title: "No Data",
        description: "There are no submissions to export.",
        variant: "destructive",
      });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(submissions);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Submissions");
    XLSX.writeFile(workbook, `life-savers-applications-${Date.now()}.xlsx`);

    toast({
      title: "Export Successful",
      description: "Applications exported to Excel successfully.",
    });
  };

  const clearAllSubmissions = () => {
    if (window.confirm("Are you sure you want to delete all submissions? This cannot be undone.")) {
      localStorage.removeItem("recruitmentSubmissions");
      setSubmissions([]);
      toast({
        title: "Submissions Cleared",
        description: "All applications have been deleted.",
      });
    }
  };

  const deleteSubmission = (index: number) => {
    const updated = submissions.filter((_: any, i: number) => i !== index);
    localStorage.setItem("recruitmentSubmissions", JSON.stringify(updated));
    setSubmissions(updated);
    toast({
      title: "Submission Deleted",
      description: "Application removed successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-[var(--gradient-hero)] bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-xl text-muted-foreground">
            Manage content, members, and applications
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="applications" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Applications Tab */}
            <TabsContent value="applications" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Recruitment Applications</CardTitle>
                      <CardDescription>
                        {submissions.length} total application(s)
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={exportToExcel} className="gap-2">
                        <Download className="h-4 w-4" />
                        Export to Excel
                      </Button>
                      <Button
                        onClick={clearAllSubmissions}
                        variant="destructive"
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Clear All
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {submissions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No applications yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {submissions.map((submission: any, index: number) => (
                        <Card key={index} className="border-2">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg">
                                  {submission.fullName}
                                </CardTitle>
                                <CardDescription>
                                  {submission.email} • {submission.phone}
                                </CardDescription>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteSubmission(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div>
                              <p className="text-sm font-semibold mb-1">Motivation:</p>
                              <p className="text-sm text-muted-foreground">
                                {submission.motivation}
                              </p>
                            </div>
                            {submission.experience && (
                              <div>
                                <p className="text-sm font-semibold mb-1">Experience:</p>
                                <p className="text-sm text-muted-foreground">
                                  {submission.experience}
                                </p>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Submitted:{" "}
                              {new Date(submission.submittedAt).toLocaleString()}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content">
              <Card>
                <CardHeader>
                  <CardTitle>Content Management</CardTitle>
                  <CardDescription>
                    Manage gallery, members, and announcements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button variant="outline" className="w-full justify-start">
                      Manage Gallery Images
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Edit Team Members
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Update Announcements
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Application Settings</CardTitle>
                  <CardDescription>
                    Configure recruitment form and colors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Settings panel coming soon. This will allow you to customize:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      <li>Number of questions</li>
                      <li>Required vs optional fields</li>
                      <li>Media upload settings</li>
                      <li>Primary and accent colors</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Admin;
