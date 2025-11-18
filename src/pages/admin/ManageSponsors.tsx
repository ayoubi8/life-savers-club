'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

// Matches the database schema
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

// Initial state for a new sponsor
const initialSponsorState: Omit<Sponsor, 'id' | 'logo'> & { logo: string } = {
  name: '',
  logo: '',
  facebook_url: '',
  instagram_url: '',
  whatsapp_url: '',
  email: '',
  display_order: 0,
};

export default function ManageSponsors() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [newSponsor, setNewSponsor] = useState(initialSponsorState);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    fetchSponsors();
  }, []);

  const fetchSponsors = async () => {
    const { data, error } = await supabase.from('sponsors').select('*').order('display_order', { ascending: true });
    if (error) {
      console.error('Error fetching sponsors:', error);
      toast({ title: 'Error', description: 'Could not fetch sponsors.', variant: 'destructive' });
    } else {
      setSponsors(data as Sponsor[]);
    }
  };

  const handleLogoUpload = async (file: File): Promise<string> => {
    if (!file) return '';
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `sponsors/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading logo:', uploadError);
      toast({ title: 'Error', description: `Could not upload logo: ${uploadError.message}`, variant: 'destructive' });
      return '';
    }
    
    const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleCreate = async () => {
    if (!newSponsor.name || !logoFile) {
      toast({ title: 'Error', description: 'Name and logo are required.', variant: 'destructive' });
      return;
    }

    const logoUrl = await handleLogoUpload(logoFile);
    if (!logoUrl) return;

    // Prepare the sponsor object, removing the local logo property
    const { logo, ...sponsorToInsert } = newSponsor;

    const { data, error } = await supabase
      .from('sponsors')
      .insert([{ ...sponsorToInsert, logo: logoUrl }])
      .select()
      .single();

    if (error) {
      console.error('Error creating sponsor:', error);
      toast({ title: 'Error', description: `Could not create sponsor: ${error.message}`, variant: 'destructive' });
    } else if (data) {
      setSponsors([...sponsors, data].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)));
      setNewSponsor(initialSponsorState);
      setLogoFile(null);
      toast({ title: 'Success', description: 'Sponsor created.' });
    }
  };

  const handleUpdate = async () => {
    if (!editingSponsor) return;

    let logoUrl = editingSponsor.logo;
    if (logoFile) {
      logoUrl = await handleLogoUpload(logoFile);
      if(!logoUrl) return;
    }
    
    const { data, error } = await supabase
      .from('sponsors')
      .update({ ...editingSponsor, logo: logoUrl })
      .eq('id', editingSponsor.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating sponsor:', error);
      toast({ title: 'Error', description: `Could not update sponsor: ${error.message}`, variant: 'destructive' });
    } else if (data) {
      setSponsors(sponsors.map(s => s.id === editingSponsor.id ? data : s).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)));
      setEditingSponsor(null);
      setLogoFile(null);
      toast({ title: 'Success', description: 'Sponsor updated.' });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('sponsors').delete().eq('id', id);
    if (error) {
      console.error('Error deleting sponsor:', error);
      toast({ title: 'Error', description: `Could not delete sponsor: ${error.message}`, variant: 'destructive' });
    } else {
      setSponsors(sponsors.filter(s => s.id !== id));
      toast({ title: 'Success', description: 'Sponsor deleted.' });
    }
  };

  // A generic form for creating and editing sponsors
  const renderSponsorForm = (sponsor: any, setSponsor: Function, handler: () => void, submitText: string) => (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <Input 
        placeholder="Sponsor Name" 
        value={sponsor.name} 
        onChange={e => setSponsor({ ...sponsor, name: e.target.value })}
      />
      <Input 
        type="file" 
        onChange={e => setLogoFile(e.target.files ? e.target.files[0] : null)}
      />
      <Input 
        placeholder="Email" 
        type="email"
        value={sponsor.email || ''} 
        onChange={e => setSponsor({ ...sponsor, email: e.target.value })}
      />
      <Input 
        placeholder="Facebook URL" 
        value={sponsor.facebook_url || ''} 
        onChange={e => setSponsor({ ...sponsor, facebook_url: e.target.value })}
      />
      <Input 
        placeholder="Instagram URL" 
        value={sponsor.instagram_url || ''} 
        onChange={e => setSponsor({ ...sponsor, instagram_url: e.target.value })}
      />
      <Input 
        placeholder="WhatsApp URL" 
        value={sponsor.whatsapp_url || ''} 
        onChange={e => setSponsor({ ...sponsor, whatsapp_url: e.target.value })}
      />
      <Input 
        placeholder="Display Order" 
        type="number"
        value={sponsor.display_order || ''} 
        onChange={e => setSponsor({ ...sponsor, display_order: parseInt(e.target.value) || 0 })}
      />
      <Button onClick={handler} className="w-full">{submitText}</Button>
      {editingSponsor && <Button variant="outline" onClick={() => setEditingSponsor(null)} className="w-full mt-2">Cancel</Button>}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Manage Sponsors</h1>
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">{editingSponsor ? 'Edit Sponsor' : 'Add New Sponsor'}</h2>
        {editingSponsor 
          ? renderSponsorForm(editingSponsor, setEditingSponsor, handleUpdate, 'Save Changes') 
          : renderSponsorForm(newSponsor, setNewSponsor, handleCreate, 'Add Sponsor')}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Logo</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sponsors.map(sponsor => (
            <TableRow key={sponsor.id}>
              <TableCell><img src={sponsor.logo} alt={sponsor.name} className="h-12 w-12 object-cover rounded-full" /></TableCell>
              <TableCell>{sponsor.name}</TableCell>
              <TableCell>{sponsor.display_order}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingSponsor(sponsor)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(sponsor.id)}>Delete</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
