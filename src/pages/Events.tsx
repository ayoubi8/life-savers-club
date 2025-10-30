import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

const Events = () => {
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: false });

    if (!error && data) {
      const upcoming = data.filter(e => e.status === 'upcoming');
      const past = data.filter(e => e.status === 'past');
      
      setUpcomingEvents(upcoming.map(e => ({
        id: e.id,
        title: e.title,
        date: new Date(e.event_date).toLocaleDateString(),
        description: e.description,
        images: Array.isArray(e.images) && e.images.length > 0 ? e.images : ["/placeholder.svg"],
        hasExplore: e.show_explore_button
      })));
      
      setPastEvents(past.map(e => ({
        id: e.id,
        title: e.title,
        date: new Date(e.event_date).toLocaleDateString(),
        description: e.description,
        images: Array.isArray(e.images) && e.images.length > 0 ? e.images : ["/placeholder.svg"],
        hasExplore: e.show_explore_button
      })));
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div className="bg-[var(--gradient-hero)] text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Our Events & Community Invitations
          </h1>
          <p className="text-xl opacity-90">
            Join us in our mission to advance science and healthcare
          </p>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="sticky top-16 bg-background/95 backdrop-blur-sm border-b border-border z-40">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="w-full md:w-auto grid grid-cols-2 rounded-full">
              <TabsTrigger value="upcoming" className="rounded-full">
                Life Savers Events
              </TabsTrigger>
              <TabsTrigger value="past" className="rounded-full">
                Invitations
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="py-12">
              <div className="grid md:grid-cols-2 gap-8">
                {upcomingEvents.map((event) => (
                  <Card key={event.id} className="overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105">
                    <Carousel
                      opts={{ loop: true }}
                      plugins={event.images.length > 1 ? [Autoplay({ delay: 3000 })] : []}
                    >
                      <CarouselContent>
                        {event.images.map((img, idx) => (
                          <CarouselItem key={idx}>
                            <img 
                              src={img} 
                              alt={`${event.title} ${idx + 1}`}
                              className="w-full h-64 object-cover"
                            />
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                    </Carousel>
                    <CardContent className="p-6">
                      <Badge className="mb-3 bg-accent text-accent-foreground">
                        Upcoming
                      </Badge>
                      <h3 className="text-2xl font-bold mb-2">{event.title}</h3>
                      <p className="text-muted-foreground text-sm mb-4">{event.date}</p>
                      <p className="text-foreground mb-6">{event.description}</p>
                      {event.hasExplore && (
                        <Button variant="pill">
                          Explore Event
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="past" className="py-12">
              <div className="grid md:grid-cols-2 gap-8">
                {pastEvents.map((event) => (
                  <Card key={event.id} className="overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105">
                    <Carousel
                      opts={{ loop: true }}
                      plugins={event.images.length > 1 ? [Autoplay({ delay: 3000 })] : []}
                    >
                      <CarouselContent>
                        {event.images.map((img, idx) => (
                          <CarouselItem key={idx}>
                            <img 
                              src={img} 
                              alt={`${event.title} ${idx + 1}`}
                              className="w-full h-64 object-cover"
                            />
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                    </Carousel>
                    <CardContent className="p-6">
                      <Badge variant="secondary" className="mb-3">
                        Past
                      </Badge>
                      <h3 className="text-2xl font-bold mb-2">{event.title}</h3>
                      <p className="text-muted-foreground text-sm mb-4">{event.date}</p>
                      <p className="text-foreground mb-6">{event.description}</p>
                      {event.hasExplore && (
                        <Button variant="pill">
                          Explore Event
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Events;
