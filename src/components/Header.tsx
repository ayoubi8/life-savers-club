import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.jpg";

const Header = () => {
  const location = useLocation();
  
  const navItems = [
    { path: "/", label: "Home" },
    { path: "/members", label: "Members" },
    { path: "/events", label: "Events" },
    { path: "/articles", label: "Articles" },
    { path: "/sponsors", label: "Sponsors" },
    { path: "/submit-article", label: "Submit Article" },
    { path: "/join-us", label: "Join Us" },
  ];

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          onClick={onClick}
          className={`text-sm font-medium transition-colors hover:text-primary ${
            location.pathname === item.path
              ? "text-primary font-semibold"
              : "text-foreground/80"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </>
  );

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border shadow-[var(--shadow-soft)]">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src={logo} 
              alt="Life Savers Hub Logo" 
              className="h-12 w-12 rounded-full ring-2 ring-primary/20"
            />
            <span className="font-bold text-xl text-foreground hidden sm:block">
              Life Savers Hub
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLinks />
          </nav>

          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="flex flex-col gap-4 mt-8">
                <NavLinks onClick={() => document.body.click()} />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
