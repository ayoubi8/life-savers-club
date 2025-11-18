'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface Event {
  id: string;
  title: string;
  event_date: string;
}

export default function ManageEvents() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, event_date')
      .order('event_date', { ascending: false });
    if (error) {
      console.error('Error fetching events:', error);
    } else {
      setEvents(data);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event.');
      } else {
        alert('Event deleted successfully.');
        fetchEvents(); // Refresh the list
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Events</h1>
        <Button asChild>
          <Link to="/admin/event/new">Create New Event</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Existing Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">{event.title}</h3>
                  <p className="text-sm text-muted-foreground">{new Date(event.event_date).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <Link to={`/admin/event/${event.id}`}>Edit</Link>
                  </Button>
                  <Button variant="destructive" onClick={() => deleteEvent(event.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
