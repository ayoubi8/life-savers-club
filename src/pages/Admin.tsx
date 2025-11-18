import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Users, Calendar, Newspaper, Handshake, LogOut, FileText } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Admin = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
    } else {
      navigate("/");
    }
  };

  const adminSections = [
    { title: "Manage Roles", href: "/manage-roles", icon: <ShieldCheck /> },
    { title: "Manage Members", href: "/admin/members", icon: <Users /> },
    { title: "Manage Events", href: "/manage-events", icon: <Calendar /> },
    { title: "Manage Articles", href: "/admin/articles", icon: <Newspaper /> },
    { title: "Manage Sponsors", href: "/admin/sponsors", icon: <Handshake /> },
    { title: "Manage \"Join Us\" Form", href: "/admin/manage-join-us-form", icon: <FileText /> }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-center">Admin Control Panel</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded flex items-center"
        >
          <LogOut className="mr-2" /> Logout
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminSections.map((section) => (
          <Link to={section.href} key={section.title}>
            <Card className="hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">{section.title}</CardTitle>
                {section.icon}
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-gray-500">Click to manage {section.title.toLowerCase()}.</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Admin;
