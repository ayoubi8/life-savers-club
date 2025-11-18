'use client';

import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AspectRatio } from './ui/aspect-ratio';

export interface Event {
  id: string;
  title: string;
  date: string;
  isUpcoming: boolean;
  imageUrls: string[];
  description: string;
  shortDescription: string;
  category: string;
}

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const formattedDate = new Date(event.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105">
      <div className="relative">
        <AspectRatio ratio={16 / 9}>
          <img src={event.imageUrls[0]} alt={event.title} className="object-cover w-full h-full" />
        </AspectRatio>
        <Badge
          className={`absolute top-2 right-2 ${event.isUpcoming
              ? "bg-[#EB4064] text-white"
              : "bg-gray-500 text-white"
            }`}
        >
          {event.isUpcoming ? "Upcoming" : "Past"}
        </Badge>
      </div>
      <CardContent className="flex flex-col flex-grow p-4">
        <p className="text-sm text-gray-500 mb-1">{formattedDate}</p>
        <h3 className="text-2xl font-bold mb-2">{event.title}</h3>
        <p className="text-md text-gray-700 flex-grow">{event.shortDescription}</p>
        <div className="mt-4 text-center">
          <Link to={`/events/${event.id}`}>
            <Button
              className="rounded-full border-[3px] border-[#EB4064] text-[#EB4064] bg-white hover:bg-[#72B6F2] hover:text-white px-6 py-2 transition-colors duration-300"
            >
              Explore
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
