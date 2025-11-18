import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Star, User, Facebook, Instagram, Linkedin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const Members = () => {
  // Static data for top leadership
  const owner = {
    name: "Dr. Nemiche Yasser",
    role: "President",
    avatar: "/assets/images/IMG_20251112_215647_223.jpg",
    description: "Focused thinking gives direction, hard work gives momentum; without one, the other loses its power.",
    social: { 
      facebook: "https://www.facebook.com/share/1CzE4Dc6fG/", 
      instagram: "https://www.instagram.com/yasser_nemiche?igsh=czVubWptenBlMmNs", 
      linkedin: "https://linkedin.com" 
    }
  };

  const vicePresident = {
    name: "Dr. Beldjilali Maissem Maroua",
    role: "Vice President",
    avatar: "/assets/images/leader-3.jpg",
    description: "Healthy relationships evolve when both sides grow, support, and challenge each other; without mutual growth, connection slowly fades.",
    social: { 
      facebook: "https://www.facebook.com/mai.ssem.297953", 
      instagram: "https://www.instagram.com/maissem936?igsh=MWhucWxmMXljejQyNg==", 
      linkedin: "https://linkedin.com" 
    }
  };

  // Static data for team leaders
  const teamLeaders = [
    {
      id: 1,
      full_name: "Sekkal Chaimaa",
      role: "External Relations",
      bio: "Diplomatic • Connected • Professional",
      photo_url: "/assets/images/leader-1.jpg",
      socials: { facebook: "#", instagram: "#", linkedin: "#" }
    },
    {
      id: 2,
      full_name: "Embouazza Chaimae",
      role: "Marketing Leader",
      bio: "Creative • Strategic • Visionary",
      photo_url: "/assets/images/leader-2.jpg",
      socials: { facebook: "#", instagram: "#", linkedin: "#" }
    },
    {
      id: 3,
      full_name: "Beldjilali Maissem Maroua",
      role: "HR Leader",
      bio: "Supportive • Organized • Reliable",
      photo_url: "/assets/images/leader-3.jpg",
      socials: { facebook: "#", instagram: "#", linkedin: "#" }
    },
    {
      id: 4,
      full_name: "Fellahi Kawther",
      role: "Internal Relations Leader",
      bio: "Communicative • Coordinated • Engaging",
      photo_url: "/assets/images/leader-4.jpg",
      socials: { facebook: "#", instagram: "#", linkedin: "#" }
    },
    {
      id: 5,
      full_name: "Benyahia Ahlam",
      role: "Organization Leader",
      bio: "Efficient • Structured • Dedicated",
      photo_url: "/assets/images/leader-5.jpg",
      socials: { facebook: "#", instagram: "#", linkedin: "#" }
    }
  ];

  const alumni = [
    "Kawthar Djelti 2023 - 2025",
    "Reguige feryel 2022 - 2023",
    "Khawla wazzani 2020 - 2022",
    "Amel belahcen 2018 - 2020"
  ];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const SocialLinks = ({ social, size = "default", fullName }: { social: any, size?: "default" | "large", fullName: string }) => {
    const iconSize = size === "large" ? "h-6 w-6" : "h-4 w-4";

    const isValidUrl = (url: string) => {
      try {
        new URL(url);
        return url.startsWith('http');
      } catch (_) {
        return false;
      }
    };
    
    return (
      <div className="flex justify-center gap-3">
        {social?.facebook && isValidUrl(social.facebook) && (
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-primary/10 hover:text-primary transition-colors"
            asChild
          >
            <a href={social.facebook} target="_blank" rel="noopener noreferrer" aria-label={`Open ${fullName} on Facebook`}>
              <Facebook className={iconSize} />
            </a>
          </Button>
        )}
        {social?.instagram && isValidUrl(social.instagram) && (
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-accent/10 hover:text-accent transition-colors"
            asChild
          >
            <a href={social.instagram} target="_blank" rel="noopener noreferrer" aria-label={`Open ${fullName} on Instagram`}>
              <Instagram className={iconSize} />
            </a>
          </Button>
        )}
        {social?.linkedin && isValidUrl(social.linkedin) && (
            <Button
            variant="ghost"
            size="icon"
            className="hover:bg-primary/10 hover:text-primary transition-colors"
            asChild
            >
            <a href={social.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`Open ${fullName} on LinkedIn`}>
                <Linkedin className={iconSize} />
            </a>
            </Button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-[var(--gradient-hero)] bg-clip-text text-transparent">
            Our Team
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Meet the passionate individuals leading Life Savers and driving innovation in medical research
          </p>
        </div>

        {/* Founder & President Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <Card className="border-4 border-primary shadow-[var(--shadow-card)] hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-[1.02]">
            <CardContent className="p-8 text-center">
              <Avatar className="w-40 h-40 mx-auto mb-4 ring-4 ring-primary/30">
                <AvatarImage src={owner.avatar} alt={owner.name} />
                <AvatarFallback className="text-4xl bg-primary text-primary-foreground">
                  {getInitials(owner.name)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-3xl font-bold mb-2 text-primary">{owner.name}</h2>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Crown className="h-5 w-5 text-accent" />
                <p className="text-accent font-semibold text-lg">{owner.role}</p>
              </div>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto leading-relaxed">
                {owner.description}
              </p>
              <SocialLinks social={owner.social} size="large" fullName={owner.name} />
            </CardContent>
          </Card>
        </div>

        {/* Vice President Section */}
        <div className="max-w-2xl mx-auto mb-16">
          <Card className="border-[3px] border-[#F04E6D] shadow-[var(--shadow-card)] hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-[1.02]">
            <CardContent className="p-6 text-center">
              <Avatar className="w-32 h-32 mx-auto mb-4 ring-4 ring-accent/30">
                <AvatarImage src={vicePresident.avatar} alt={vicePresident.name} />
                <AvatarFallback className="text-3xl bg-accent text-accent-foreground">
                  {getInitials(vicePresident.name)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold mb-2 text-primary">{vicePresident.name}</h2>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Star className="h-5 w-5 text-accent" />
                <p className="text-accent font-semibold">{vicePresident.role}</p>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {vicePresident.description}
              </p>
              <SocialLinks social={vicePresident.social} fullName={vicePresident.name} />
            </CardContent>
          </Card>
        </div>

        {/* Team Leaders Section */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2 text-primary flex items-center justify-center gap-2">
              <Users className="h-8 w-8" />
              Team Leaders
            </h2>
            <p className="text-muted-foreground">Leading specialized teams across different domains</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto">
            {teamLeaders.map((leader) => (
              <Card 
                key={leader.id} 
                className="border-2 border-primary/30 hover:border-primary shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)] transition-all duration-300 ease-in-out transform hover:scale-105 w-full md:w-1/3 lg:w-1/4"
              >
                <CardContent className="p-6 text-center">
                  <Avatar className="w-32 h-32 mx-auto mb-4 ring-2 ring-primary/20">
                    <AvatarImage src={leader.photo_url} alt={leader.full_name} />
                    <AvatarFallback className="text-xl bg-primary/10 text-primary">
                      {getInitials(leader.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-bold mb-2 text-foreground">{leader.full_name}</h3>
                  <p className="text-accent font-semibold mb-4">{leader.role}</p>
                  <p className="text-sm text-muted-foreground mb-4 h-16">{leader.bio}</p>
                  
                  <SocialLinks social={leader.socials} fullName={leader.full_name} />
                  
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Alumni Section */}
        <div className="max-w-3xl mx-auto">
          <Card className="border-2 border-secondary/50 shadow-[var(--shadow-card)] hover:shadow-xl transition-all duration-300 ease-in-out">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
                <Crown className="h-7 w-7 text-accent" />
                Former Presidents & Alumni
              </CardTitle>
              <p className="text-muted-foreground mt-2">Honoring our distinguished legacy</p>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {alumni.map((person, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                      <Crown className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-foreground font-medium group-hover:text-primary transition-colors">
                      {person}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Members;
