'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar as CalendarIcon, PlayCircle, Share2, Send, MessageSquare, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Facebook, Instagram } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface Comment {
  id: number;
  user: string;
  comment: string;
}

interface EventData {
  id: string;
  title: string;
  date: string;
  isUpcoming: boolean;
  images: string[];
  videos: string[];
  description: string;
  shortDescription: string;
  socialLinks: { [key: string]: string };
  comments: Comment[];
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventData | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState<any>(null);
  const [showAllComments, setShowAllComments] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);


  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (id) {
      const fetchEventAndComments = async () => {
        // Fetch event details
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (eventError) {
          console.error('Error fetching event:', eventError);
          return;
        }

        // Fetch comments for the event
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('*, user:user_id!left(email)')
          .eq('event_id', id)
          .order('id', { ascending: false });

        if (commentsError) {
            console.error('Error fetching comments:', commentsError);
        }

        if (eventData) {
          const formattedEvent: EventData = {
            id: eventData.id,
            title: eventData.title,
            date: eventData.event_date,
            isUpcoming: new Date(eventData.event_date) > new Date(),
            images: eventData.images || [],
            videos: eventData.videos || [],
            description: eventData.description,
            shortDescription: eventData.short_description,
            socialLinks: eventData.social_media_links || {},
            comments: (commentsData || []).map((c: any) => ({
              id: c.id,
              user: c.user?.email || 'Anonymous',
              comment: c.content,
            })),
          };
          setEvent(formattedEvent);
          setDate(new Date(formattedEvent.date));
        }
      };

      fetchEventAndComments();
    }
  }, [id]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim() && id) {
      const { data, error } = await supabase
        .from('comments')
        .insert([{ content: newComment, event_id: id, user_id: user ? user.id : null }])
        .select()
        .single();

      if (error) {
        console.error('Error posting comment:', error);
      } else if (data && event) {
        const addedComment: Comment = {
          id: data.id,
          user: user ? user.email : 'Anonymous',
          comment: data.content,
        };
        setEvent({ ...event, comments: [addedComment, ...event.comments] });
        setNewComment('');
      }
    }
  };

  const handleShare = () => {
    if (navigator.share && event) {
      navigator.share({
        title: event.title,
        text: `Check out this event: ${event.title}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      // Fallback for browsers that don't support navigator.share
      alert('Sharing is not supported on this browser, but you can copy this link: ' + window.location.href);
    }
  };

  const handlePlayVideo = (index: number) => {
    const video = videoRefs.current[index];
    if (video) {
      video.play();
      video.controls = true;
      const playButton = video.nextElementSibling as HTMLElement;
      if(playButton) playButton.style.display = 'none';
    }
  };

  if (!event) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  const visibleComments = showAllComments ? event.comments : event.comments.slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-5xl font-bold text-[#2271B6] mb-4 md:mb-0">{event.title}</h1>
        <div className="flex items-center space-x-4">
          <Badge
            className={`${event.isUpcoming ? "bg-[#EB4064] text-white" : "bg-gray-500 text-white"}`}>
            {event.isUpcoming ? "Upcoming" : "Past"}
          </Badge>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={'outline'}
                className={`w-[280px] justify-start text-left font-normal`}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? date.toLocaleDateString() : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <p className="text-xl text-gray-600 mb-8">{event.shortDescription}</p>

      <Carousel className="w-full mb-8 shadow-lg rounded-lg overflow-hidden bg-gray-100">
        <CarouselContent>
          {event.images.map((url, index) => (
            <CarouselItem key={`img-${index}`}>
              <img loading="lazy" src={url} alt={`${event.title} image ${index + 1}`} className="w-full h-auto object-cover aspect-video" />
            </CarouselItem>
          ))}
          {event.videos && event.videos.map((url, index) => (
             <CarouselItem key={`vid-${index}`}>
               <div className='relative w-full h-auto aspect-video bg-black flex items-center justify-center'>
                  <video ref={el => videoRefs.current[index] = el} src={url} className='max-h-full w-full' loop playsInline />
                  <div onClick={() => handlePlayVideo(index)} className='absolute inset-0 flex items-center justify-center cursor-pointer'>
                    <PlayCircle className='text-white/80 h-24 w-24' />
                  </div>
               </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2 bg-white/50 hover:bg-white" />
        <CarouselNext className="right-2 bg-white/50 hover:bg-white" />
      </Carousel>

       <div className="flex items-center space-x-4 mb-8">
        {event.socialLinks.facebook && <a href={event.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#EB4064]"><Facebook size={28}/></a>}
        {event.socialLinks.instagram && <a href={event.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#EB4064]"><Instagram size={28}/></a>}
        {event.socialLinks.tiktok && <a href={event.socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#EB4064]"><Music size={28}/></a>}
      </div>

      <div
        className="prose max-w-none text-gray-800"
        dangerouslySetInnerHTML={{ __html: event.description }}
      />

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4 flex items-center"><MessageSquare className='mr-2'/>Comments</h2>
        <div className="space-y-4 mb-6">
          {visibleComments.map(comment => (
            <div key={comment.id} className="flex items-start space-x-3 bg-gray-50 p-3 rounded-lg">
              <Avatar>
                <AvatarImage src={`https://i.pravatar.cc/40?u=${comment.user}`} />
                <AvatarFallback>{comment.user.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{comment.user}</p>
                <p className="text-gray-600">{comment.comment}</p>
              </div>
            </div>
          ))}
        </div>
        {event.comments.length > 3 && (
          <Button variant="link" onClick={() => setShowAllComments(!showAllComments)} className="mb-6">
            {showAllComments ? 'Show Less Comments' : 'Show More Comments'}
          </Button>
        )}
        <form onSubmit={handleCommentSubmit} className="flex space-x-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
          />
          <Button type="submit" className="bg-[#EB4064] hover:bg-[#72B6F2] text-white" disabled={!newComment.trim()}>
             <Send size={18}/>
          </Button>
        </form>
      </div>

      <div className="fixed bottom-8 right-8 z-50">
         <Button onClick={handleShare} className="rounded-full w-16 h-16 bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg flex items-center justify-center">
            <Share2 size={28}/>
         </Button>
      </div>

    </div>
  );
}
