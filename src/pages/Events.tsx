'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventCard, Event } from '@/components/EventCard';
import { supabase } from '@/integrations/supabase/client'; // Import supabase client

const HeroBanner = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="bg-gray-100 py-12 text-center">
    <h1 className="text-4xl font-bold text-[#2271B6]">{title}</h1>
    <p className="text-lg text-gray-600 mt-2">{subtitle}</p>
  </div>
);

export default function EventsPage() {
  const [activeTab, setActiveTab] = useState('lifesavers');
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase.from('events').select('*');
      if (error) {
        console.error('Error fetching events:', error);
      } else {
        const formattedEvents: Event[] = data.map((event: any) => ({
          id: event.id,
          title: event.title,
          date: event.event_date,
          isUpcoming: new Date(event.event_date) > new Date(),
          imageUrls: event.images || [],
          description: event.description,
          shortDescription: event.short_description,
          category: event.category,
        }));
        setEvents(formattedEvents);
      }
    };

    fetchEvents();
  }, []);

  const lifeSaversEvents = events.filter((event) => event.category === 'Life Savers Events');
  const invitationEvents = events.filter((event) => event.category === 'Invitations');

  return (
    <div>
      <HeroBanner
        title="Our Events & Community Invitations"
        subtitle="Discover our latest activities and collaborations."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm py-4">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 gap-2 p-1 h-auto bg-[hsl(219.02,20%,85%)] rounded-full">
            <TabsTrigger
              value="lifesavers"
              className={`px-4 py-2.5 text-sm font-medium rounded-full transition-all focus-visible:ring-2 focus-visible:ring-offset-2 ${activeTab === 'lifesavers'
                  ? 'text-[#72B6F2] border-2 border-[#72B6F2] bg-background shadow-sm'
                  : 'text-[#2271B6] border-2 border-[#2271B6] hover:text-[#72B6F2] hover:border-[#72B6F2] bg-transparent'}`}>
              Life Savers Events
            </TabsTrigger>
            <TabsTrigger
              value="invitations"
              className={`px-4 py-2.5 text-sm font-medium rounded-full transition-all focus-visible:ring-2 focus-visible:ring-offset-2 ${activeTab === 'invitations'
                  ? 'text-[#72B6F2] border-2 border-[#72B6F2] bg-background shadow-sm'
                  : 'text-[#2271B6] border-2 border-[#2271B6] hover:text-[#72B6F2] hover:border-[#72B6F2] bg-transparent'}`}>
              Invitations
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="lifesavers" className="py-8">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {lifeSaversEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="invitations" className="py-8">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {invitationEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
