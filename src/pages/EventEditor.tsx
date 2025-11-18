'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Facebook, Instagram, Music } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// Add custom fonts and sizes to Quill
const Size = Quill.import('attributors/style/size');
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '24px', '36px'];
Quill.register(Size, true);

const modules = {
  toolbar: {
    container: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'size': Size.whitelist }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'image', 'video'],
      ['clean'],
    ],
  },
};

export default function EventEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);
  const [category, setCategory] = useState('Life Savers Events');
  const [images, setImages] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState({ facebook: '', instagram: '', tiktok: '' });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id && id !== 'new') {
      fetchEventDetails(id);
    }
  }, [id]);

  const fetchEventDetails = async (eventId: string) => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      console.error('Error fetching event details:', error);
    } else if (data) {
      setTitle(data.title);
      setShortDescription(data.short_description);
      setDescription(data.description);
      setEventDate(new Date(data.event_date));
      setImages(data.images || []);
      setSocialLinks(data.social_media_links || { facebook: '', instagram: '', tiktok: '' });
      setCategory(data.category || 'Life Savers Events');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    const uploadedImageUrls: string[] = [];

    for (const file of files) {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('event-media')
        .upload(fileName, file, { contentType: file.type });

      if (error) {
        console.error('Error uploading file:', error);
      } else if (data) {
        const { data: urlData } = supabase.storage.from('event-media').getPublicUrl(data.path);
        if (file.type.startsWith('image')) {
          uploadedImageUrls.push(urlData.publicUrl);
        } 
      }
    }
    setImages([...images, ...uploadedImageUrls]);
    setIsUploading(false);
  };

  const handleSave = async () => {
    if (!eventDate) {
      alert('Please select an event date before saving.');
      return;
    }

    const eventData = {
      title,
      short_description: shortDescription,
      description,
      event_date: eventDate,
      images,
      social_media_links: socialLinks,
      category,
    };

    let error;
    if (id === 'new') {
      ({ error } = await supabase.from('events').insert([eventData]));
    } else {
      ({ error } = await supabase.from('events').update(eventData).eq('id', id));
    }

    if (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event.');
    } else {
      alert('Event saved successfully!');
      navigate('/manage-events');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6">{id === 'new' ? 'Create Event' : 'Edit Event'}</h1>
      <div className="space-y-6">
        <Input placeholder="Event Title" value={title} onChange={(e) => setTitle(e.target.value)} className="text-2xl h-14" />
        <Input placeholder="Short Description" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
        <div className="grid gap-2">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory} id="category">
            <SelectTrigger>
              <SelectValue placeholder="Select event category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Life Savers Events">Life Savers Events</SelectItem>
              <SelectItem value="Invitations">Invitations</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ReactQuill theme="snow" value={description} onChange={setDescription} modules={modules} />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {eventDate ? eventDate.toLocaleDateString() : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={eventDate} onSelect={setEventDate} initialFocus />
          </PopoverContent>
        </Popover>

        <Card>
          <CardHeader>
            <CardTitle>Media</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload Media'}
            </Button>
            <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,video/*" />
            <div className="mt-4 grid grid-cols-3 gap-4">
              {images.map(url => <img key={url} src={url} className="rounded-lg" />)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Social Media Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
                <Facebook/>
                <Input placeholder="Facebook URL" value={socialLinks.facebook} onChange={(e) => setSocialLinks({...socialLinks, facebook: e.target.value})} />
            </div>
            <div className="flex items-center gap-2">
                <Instagram/>
                <Input placeholder="Instagram URL" value={socialLinks.instagram} onChange={(e) => setSocialLinks({...socialLinks, instagram: e.target.value})} />
            </div>
            <div className="flex items-center gap-2">
                <Music/>
                <Input placeholder="TikTok URL" value={socialLinks.tiktok} onChange={(e) => setSocialLinks({...socialLinks, tiktok: e.target.value})} />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full">Save Event</Button>
      </div>
    </div>
  );
}
