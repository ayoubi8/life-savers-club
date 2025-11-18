'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Facebook, Instagram, Mail, MessageCircle } from 'lucide-react';

interface Sponsor {
  id: string;
  name: string;
  logo: string;
  facebook_url?: string | null;
  instagram_url?: string | null;
  whatsapp_url?: string | null;
  email?: string | null;
  display_order?: number | null;
}

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  useEffect(() => {
    fetchSponsors();
  }, []);

  const fetchSponsors = async () => {
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching sponsors:', error);
    } else {
      setSponsors(data as Sponsor[]);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-extrabold text-center mb-12">Our Valued Sponsors</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {sponsors.map(sponsor => (
          <Card key={sponsor.id} className="overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300">
            <CardHeader className="p-0">
              <img src={sponsor.logo} alt={`${sponsor.name} logo`} className="w-full h-48 object-cover" />
            </CardHeader>
            <CardContent className="p-6">
              <CardTitle className="text-2xl font-bold mb-4">{sponsor.name}</CardTitle>
              <div className="flex items-center space-x-4">
                {sponsor.facebook_url && (
                  <a href={sponsor.facebook_url} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600">
                    <Facebook size={24} />
                  </a>
                )}
                {sponsor.instagram_url && (
                  <a href={sponsor.instagram_url} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-pink-600">
                    <Instagram size={24} />
                  </a>
                )}
                {sponsor.whatsapp_url && (
                  <a href={`https://wa.me/${sponsor.whatsapp_url}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-green-600">
                    <MessageCircle size={24} />
                  </a>
                )}
                {sponsor.email && (
                  <a href={`mailto:${sponsor.email}`} className="text-gray-500 hover:text-red-600">
                    <Mail size={24} />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
