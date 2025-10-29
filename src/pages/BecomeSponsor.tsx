import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Facebook, Instagram, Mail, Phone } from "lucide-react";

const BecomeSponsor = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src="/src/assets/logo.jpg" alt="Life Savers Hub" className="w-24 h-24 rounded-full" />
          </div>
          <CardTitle className="text-3xl text-primary">Become a Sponsor</CardTitle>
          <CardDescription className="text-base">
            Partner with us to support scientific excellence and community impact. 
            Reach out through any of the channels below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <a
            href="https://facebook.com/lifesavers"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors group"
          >
            <Facebook className="w-6 h-6 text-primary group-hover:text-accent-foreground" />
            <div>
              <p className="font-semibold">Facebook</p>
              <p className="text-sm text-muted-foreground">Follow and message us</p>
            </div>
          </a>

          <a
            href="https://instagram.com/lifesavers"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors group"
          >
            <Instagram className="w-6 h-6 text-primary group-hover:text-accent-foreground" />
            <div>
              <p className="font-semibold">Instagram</p>
              <p className="text-sm text-muted-foreground">Connect with us</p>
            </div>
          </a>

          <a
            href="mailto:sponsors@lifesavershub.com"
            className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors group"
          >
            <Mail className="w-6 h-6 text-primary group-hover:text-accent-foreground" />
            <div>
              <p className="font-semibold">Email</p>
              <p className="text-sm text-muted-foreground">sponsors@lifesavershub.com</p>
            </div>
          </a>

          <a
            href="tel:+1234567890"
            className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors group"
          >
            <Phone className="w-6 h-6 text-primary group-hover:text-accent-foreground" />
            <div>
              <p className="font-semibold">Phone</p>
              <p className="text-sm text-muted-foreground">+1 (234) 567-890</p>
            </div>
          </a>
        </CardContent>
      </Card>
    </div>
  );
};

export default BecomeSponsor;
