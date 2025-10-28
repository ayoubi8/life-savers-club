import { Link, useLocation } from "react-router-dom";
import { Home, Image, Users, FileText, Settings } from "lucide-react";
import logo from "@/assets/logo.jpg";

const Navigation = () => {
  const location = useLocation();
  
  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/memories", label: "Memories", icon: Image },
    { path: "/members", label: "Members", icon: Users },
    { path: "/recruitment", label: "Join Us", icon: FileText },
    { path: "/admin", label: "Admin", icon: Settings },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border shadow-[var(--shadow-soft)]">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src={logo} 
              alt="Life Savers Logo" 
              className="h-12 w-12 rounded-full ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all"
            />
            <span className="font-bold text-xl text-foreground hidden sm:block">
              Life Savers
            </span>
          </Link>
          
          <div className="flex gap-1 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline text-sm font-medium">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
