
import { useParams } from "react-router-dom";
import { Calendar, Clock, Facebook, Instagram, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const EventDetail = () => {
  const { eventId } = useParams();

  // Mock data - replace with actual data from Firestore
  const event = {
    title: "Community Charity Gala",
    date: "2024-10-26",
    time: "18:00",
    images: [
      "/placeholder.svg",
      "/placeholder.svg",
      "/placeholder.svg",
    ],
    description: "Join us for an evening of elegance and philanthropy at our annual Community Charity Gala. This year, we're raising funds for local schools and educational programs. The event will feature a silent auction, live music, and a gourmet dinner.",
    social: {
      instagram: "#",
      facebook: "#",
    },
    comments: [
      { id: 1, author: "Jane Doe", text: "So excited for this event!" },
      { id: 2, author: "John Smith", text: "Can't wait to support a great cause." },
    ],
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Event Title */}
      <h1 className="text-4xl font-bold mb-4">{event.title}</h1>

      {/* Event Date and Time */}
      <div className="flex items-center text-muted-foreground mb-8">
        <Calendar className="h-5 w-5 mr-2" />
        <span>{event.date}</span>
        <Clock className="h-5 w-5 ml-6 mr-2" />
        <span>{event.time}</span>
      </div>

      {/* Image Carousel */}
      <Carousel className="w-full mb-8">
        <CarouselContent>
          {event.images.map((image, index) => (
            <CarouselItem key={index}>
              <div className="aspect-video relative">
                <img src={image} alt={`Event image ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>

      {/* Social Media Links */}
      <div className="flex items-center space-x-4 mb-8">
        <Button variant="outline" size="icon" asChild>
          <a href={event.social.instagram} target="_blank" rel="noopener noreferrer">
            <Instagram className="h-5 w-5" />
          </a>
        </Button>
        <Button variant="outline" size="icon" asChild>
          <a href={event.social.facebook} target="_blank" rel="noopener noreferrer">
            <Facebook className="h-5 w-5" />
          </a>
        </Button>
      </div>

      {/* Event Description */}
      <div className="prose dark:prose-invert max-w-none mb-12">
        <p>{event.description}</p>
      </div>

      {/* Comments Section */}
      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {event.comments.map((comment) => (
              <div key={comment.id} className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold">
                  {comment.author.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{comment.author}</p>
                  <p className="text-muted-foreground">{comment.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Textarea placeholder="Write a comment..." className="mb-2" />
            <Button>Post Comment</Button>
          </div>
        </CardContent>
      </Card>

      {/* Floating Share Button */}
      <div className="fixed bottom-8 right-8">
        <Button size="icon" className="rounded-full shadow-lg">
          <Share2 className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default EventDetail;
