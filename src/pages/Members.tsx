import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Crown, Star, User } from "lucide-react";

const Members = () => {
  const hierarchy = {
    president: { name: "Alex Johnson", role: "President" },
    vicePresident: { name: "Sarah Williams", role: "Vice President" },
    secretary: { name: "Michael Chen", role: "Secretary" },
    members: [
      "Emma Davis",
      "James Wilson",
      "Olivia Brown",
      "Liam Martinez",
      "Sophia Garcia",
      "Noah Rodriguez",
    ],
  };

  const alumni = [
    "Dr. John Smith - 2020",
    "Dr. Emily Parker - 2021",
    "Dr. David Lee - 2022",
    "Dr. Rachel Green - 2023",
  ];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-[var(--gradient-hero)] bg-clip-text text-transparent">
            Our Team
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Meet the passionate individuals leading Life Savers
          </p>
        </div>

        {/* Leadership */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            Leadership Team
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* President */}
            <Card className="border-2 border-primary/50 hover:border-primary transition-all hover:shadow-[var(--shadow-card)]">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Avatar className="h-24 w-24 border-4 border-primary/20">
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {getInitials(hierarchy.president.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-xl">{hierarchy.president.name}</CardTitle>
                <div className="flex items-center justify-center gap-2 text-primary font-semibold">
                  <Crown className="h-4 w-4" />
                  {hierarchy.president.role}
                </div>
              </CardHeader>
            </Card>

            {/* Vice President */}
            <Card className="border-2 hover:border-accent transition-all hover:shadow-[var(--shadow-card)]">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Avatar className="h-24 w-24 border-4 border-accent/20">
                    <AvatarFallback className="text-2xl bg-accent text-accent-foreground">
                      {getInitials(hierarchy.vicePresident.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-xl">{hierarchy.vicePresident.name}</CardTitle>
                <div className="flex items-center justify-center gap-2 text-accent font-semibold">
                  <Star className="h-4 w-4" />
                  {hierarchy.vicePresident.role}
                </div>
              </CardHeader>
            </Card>

            {/* Secretary */}
            <Card className="border-2 hover:border-primary transition-all hover:shadow-[var(--shadow-card)]">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Avatar className="h-24 w-24 border-4 border-primary/20">
                    <AvatarFallback className="text-2xl bg-secondary text-secondary-foreground">
                      {getInitials(hierarchy.secretary.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-xl">{hierarchy.secretary.name}</CardTitle>
                <div className="flex items-center justify-center gap-2 text-foreground font-semibold">
                  <User className="h-4 w-4" />
                  {hierarchy.secretary.role}
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Active Members */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-bold mb-6">Active Members</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {hierarchy.members.map((member, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <Avatar className="border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(member)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{member}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alumni */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Former Presidents & Alumni</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="grid sm:grid-cols-2 gap-3">
                {alumni.map((person, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Crown className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="text-muted-foreground">{person}</span>
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
