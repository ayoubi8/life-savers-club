import { Card, CardContent } from "@/components/ui/card";
import { Facebook, Instagram, Linkedin } from "lucide-react";

const NewMembers = () => {
  const owner = {
    name: "Dr. Alexandra Morgan",
    role: "Founder & President",
    avatar: "/placeholder.svg",
    description: "Pioneer in cardiovascular research with 15 years of experience in medical innovation and community building.",
    social: { facebook: "#", instagram: "#", linkedin: "#" }
  };

  const vicePresident = {
    name: "Dr. James Chen",
    role: "Vice President",
    avatar: "/placeholder.svg",
    description: "Dedicated to advancing pharmaceutical research and mentoring the next generation of scientists.",
    social: { facebook: "#", instagram: "#", linkedin: "#" }
  };

  const leaders = [
    {
      name: "Dr. Sarah Williams",
      role: "Research Lead",
      avatar: "/placeholder.svg",
      social: { facebook: "#", instagram: "#", linkedin: "#" },
      team: ["Michael Brown", "Emily Davis", "Robert Wilson"]
    },
    {
      name: "Dr. David Martinez",
      role: "Community Lead",
      avatar: "/placeholder.svg",
      social: { facebook: "#", instagram: "#", linkedin: "#" },
      team: ["Jessica Taylor", "Daniel Anderson", "Lisa Thomas"]
    },
    {
      name: "Dr. Rachel Kim",
      role: "Events Lead",
      avatar: "/placeholder.svg",
      social: { facebook: "#", instagram: "#", linkedin: "#" },
      team: ["Chris Garcia", "Amanda Lee", "Kevin White"]
    }
  ];

  const alumni = [
    "Dr. John Smith (2018)",
    "Dr. Maria Rodriguez (2019)",
    "Dr. Ahmed Hassan (2020)",
    "Dr. Lisa Johnson (2021)"
  ];

  return (
    <div className="min-h-screen relative">
      {/* Fixed Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-10 -z-10"
        style={{ backgroundImage: "url(/placeholder.svg)", filter: "blur(8px)" }}
      />

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-12 text-primary">
          Our Team
        </h1>

        {/* Owner Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <Card className="border-4 border-primary shadow-md hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105">
            <CardContent className="p-8 text-center">
              <img 
                src={owner.avatar} 
                alt={owner.name}
                className="w-32 h-32 rounded-full mx-auto mb-4 ring-4 ring-primary"
              />
              <h2 className="text-3xl font-bold mb-2 text-primary">{owner.name}</h2>
              <p className="text-accent font-semibold mb-4">{owner.role}</p>
              <p className="text-muted-foreground mb-6">{owner.description}</p>
              <div className="flex justify-center gap-4">
                <a href={owner.social.facebook} className="text-muted-foreground hover:text-primary transition-colors">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href={owner.social.instagram} className="text-muted-foreground hover:text-accent transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href={owner.social.linkedin} className="text-muted-foreground hover:text-primary transition-colors">
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vice President Section */}
        <div className="max-w-2xl mx-auto mb-16">
          <Card className="border-4 border-accent shadow-md hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105">
            <CardContent className="p-6 text-center">
              <img 
                src={vicePresident.avatar} 
                alt={vicePresident.name}
                className="w-24 h-24 rounded-full mx-auto mb-4 ring-4 ring-accent"
              />
              <h2 className="text-2xl font-bold mb-2 text-primary">{vicePresident.name}</h2>
              <p className="text-accent font-semibold mb-4">{vicePresident.role}</p>
              <p className="text-muted-foreground mb-6">{vicePresident.description}</p>
              <div className="flex justify-center gap-4">
                <a href={vicePresident.social.facebook} className="text-muted-foreground hover:text-primary transition-colors">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href={vicePresident.social.instagram} className="text-muted-foreground hover:text-accent transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href={vicePresident.social.linkedin} className="text-muted-foreground hover:text-primary transition-colors">
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaders Section */}
        <h2 className="text-3xl font-bold text-center mb-8 text-primary">Team Leaders</h2>
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {leaders.map((leader, index) => (
            <Card key={index} className="border-2 border-primary/50 shadow-md hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105">
              <CardContent className="p-6 text-center">
                <img 
                  src={leader.avatar} 
                  alt={leader.name}
                  className="w-20 h-20 rounded-full mx-auto mb-4 ring-2 ring-primary"
                />
                <h3 className="text-xl font-bold mb-2">{leader.name}</h3>
                <p className="text-accent font-semibold mb-4">{leader.role}</p>
                <div className="flex justify-center gap-3 mb-4">
                  <a href={leader.social.facebook} className="text-muted-foreground hover:text-primary transition-colors">
                    <Facebook className="h-4 w-4" />
                  </a>
                  <a href={leader.social.instagram} className="text-muted-foreground hover:text-accent transition-colors">
                    <Instagram className="h-4 w-4" />
                  </a>
                  <a href={leader.social.linkedin} className="text-muted-foreground hover:text-primary transition-colors">
                    <Linkedin className="h-4 w-4" />
                  </a>
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-semibold mb-2 text-muted-foreground">Team Members</p>
                  <ul className="text-sm space-y-1">
                    {leader.team.map((member, idx) => (
                      <li key={idx} className="text-foreground">{member}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Alumni Section */}
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-secondary shadow-md hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-center mb-6 text-primary">
                Former Presidents & Alumni
              </h2>
              <ul className="space-y-2">
                {alumni.map((name, index) => (
                  <li key={index} className="text-center text-foreground font-medium">
                    {name}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NewMembers;
