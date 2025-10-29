import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Facebook, Instagram, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface Sponsor {
  id: number;
  name: string;
  logo: string;
  facebook?: string;
  instagram?: string;
  email?: string;
}

const sponsors: Sponsor[] = [
  {
    id: 1,
    name: "MedTech Solutions",
    logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&h=150&fit=crop",
    facebook: "https://facebook.com",
    instagram: "https://instagram.com",
    email: "contact@medtech.com"
  },
  {
    id: 2,
    name: "HealthCare Plus",
    logo: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=150&h=150&fit=crop",
    facebook: "https://facebook.com",
    instagram: "https://instagram.com",
    email: "info@healthcareplus.com"
  },
  {
    id: 3,
    name: "BioLab Research",
    logo: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=150&h=150&fit=crop",
    facebook: "https://facebook.com",
    email: "research@biolab.com"
  },
  {
    id: 4,
    name: "Pharma Innovations",
    logo: "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=150&h=150&fit=crop",
    instagram: "https://instagram.com",
    email: "contact@pharmainno.com"
  },
];

const SponsorCard = ({ sponsor }: { sponsor: Sponsor }) => (
  <Card className="p-6 hover:scale-105 transition-transform duration-300 bg-card border-border">
    <div className="flex flex-col items-center gap-4">
      <div className="w-[150px] h-[150px] rounded-full overflow-hidden border-4 border-primary">
        <img src={sponsor.logo} alt={sponsor.name} className="w-full h-full object-cover" />
      </div>
      <h3 className="text-xl font-semibold text-foreground text-center">{sponsor.name}</h3>
      <div className="flex gap-3">
        {sponsor.facebook && (
          <a href={sponsor.facebook} target="_blank" rel="noopener noreferrer" 
             className="text-muted-foreground hover:text-primary transition-colors">
            <Facebook size={20} />
          </a>
        )}
        {sponsor.instagram && (
          <a href={sponsor.instagram} target="_blank" rel="noopener noreferrer"
             className="text-muted-foreground hover:text-primary transition-colors">
            <Instagram size={20} />
          </a>
        )}
        {sponsor.email && (
          <a href={`mailto:${sponsor.email}`}
             className="text-muted-foreground hover:text-primary transition-colors">
            <Mail size={20} />
          </a>
        )}
      </div>
    </div>
  </Card>
);

const Sponsors = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-accent py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white text-center">Our Sponsors</h1>
          <p className="text-white/90 text-center mt-4 text-lg">
            Thank you to our amazing partners who support our mission
          </p>
        </div>
      </section>

      {/* Sponsors Grid (Desktop) */}
      <section className="container mx-auto px-4 py-16">
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {sponsors.map((sponsor) => (
            <SponsorCard key={sponsor.id} sponsor={sponsor} />
          ))}
        </div>

        {/* Sponsors Carousel (Mobile) */}
        <div className="md:hidden flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory">
          {sponsors.map((sponsor) => (
            <div key={sponsor.id} className="flex-shrink-0 w-[280px] snap-center">
              <SponsorCard sponsor={sponsor} />
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Want to Support Our Mission?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join our community of sponsors and help us advance scientific research and education.
          </p>
          <Link to="/become-sponsor">
            <Button variant="pill" size="lg">
              Become a Sponsor
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Sponsors;
