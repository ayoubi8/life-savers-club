import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Image as ImageIcon, Video } from "lucide-react";

const Memories = () => {
  const [mediaItems] = useState([
    { id: 1, type: "image", url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500", title: "Health Campaign 2024" },
    { id: 2, type: "image", url: "https://images.unsplash.com/photo-1582560475093-ba66accbc424?w=500", title: "Workshop Session" },
    { id: 3, type: "image", url: "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=500", title: "Team Meeting" },
    { id: 4, type: "image", url: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=500", title: "Community Outreach" },
    { id: 5, type: "image", url: "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=500", title: "Training Program" },
    { id: 6, type: "image", url: "https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?w=500", title: "Annual Event" },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-[var(--gradient-hero)] bg-clip-text text-transparent">
            Our Memories
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Relive the moments that made our journey special
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mediaItems.map((item) => (
            <Card
              key={item.id}
              className="group overflow-hidden border-2 hover:border-primary transition-all hover:shadow-[var(--shadow-card)] cursor-pointer"
            >
              <div className="relative aspect-video overflow-hidden bg-secondary">
                {item.type === "image" ? (
                  <img
                    src={item.url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-card/90 backdrop-blur-sm rounded-full p-2">
                  {item.type === "image" ? (
                    <ImageIcon className="h-4 w-4 text-primary" />
                  ) : (
                    <Video className="h-4 w-4 text-accent" />
                  )}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date().toLocaleDateString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Memories;
