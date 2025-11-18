
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

// Reverted: Removed 'role' from the interface
interface Member {
  id: string;
  full_name: string;
  bio: string | null;
  photo_url: string | null;
  socials: any | null;
  active: boolean;
  order_index: number;
}

const MemberForm = ({ member, onSave, onCancel }: { member?: Member | null, onSave: (member: Partial<Member>) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState<Partial<Member>>(member || {});

  const handleChange = (field: keyof Member, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-4">
        <Label>Full Name</Label>
        <Input value={formData.full_name || ''} onChange={(e) => handleChange('full_name', e.target.value)} />

        {/* Reverted: Removed the Role Select input */}

        <Label>Bio</Label>
        <Textarea value={formData.bio || ''} onChange={(e) => handleChange('bio', e.target.value)} />
        <div className="flex items-center space-x-2">
            <Switch id="active-switch" checked={formData.active} onCheckedChange={(value) => handleChange('active', value)} />
            <Label htmlFor="active-switch">Active</Label>
        </div>
        <Label>Order Index</Label>
        <Input type="number" value={formData.order_index || 0} onChange={(e) => handleChange('order_index', parseInt(e.target.value, 10))} />

        <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
        </div>
    </div>
  );
};

const AdminMembersPage = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const fetchMembers = async () => {
    setIsLoading(true);
    // Reverted: Removed .order('role', ...)
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching members:', error);
      setError('Failed to fetch members. You may not have the required permissions.');
    } else {
      setMembers(data as Member[]);
      setError(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleSaveMember = async (memberData: Partial<Member>) => {
    const { id, ...updateData } = memberData;
    let error;
    if (id) {
        const { error: updateError } = await supabase.from('members').update(updateData).eq('id', id);
        error = updateError;
    } else {
        const { error: insertError } = await supabase.from('members').insert(updateData);
        error = insertError;
    }

    if (error) {
        console.error('Error saving member:', error);
        alert('Failed to save member.');
    } else {
        setIsFormOpen(false);
        setEditingMember(null);
        fetchMembers();
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (window.confirm('Are you sure you want to delete this member?')) {
      const { error } = await supabase.from('members').delete().eq('id', memberId);
      if (error) {
        console.error('Error deleting member:', error);
        alert('Failed to delete member.');
      } else {
        fetchMembers();
      }
    }
  };

  if (isLoading) return <div>Loading members...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-12">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manage Members</CardTitle>
          <Button onClick={() => { setEditingMember(null); setIsFormOpen(true); }}>Add Member</Button>
        </CardHeader>
        <CardContent>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingMember ? 'Edit Member' : 'Add New Member'}</DialogTitle>
              </DialogHeader>
              <MemberForm
                member={editingMember}
                onSave={handleSaveMember}
                onCancel={() => { setIsFormOpen(false); setEditingMember(null); }}
              />
            </DialogContent>
          </Dialog>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {/* Reverted: Removed Role column header */}
                <TableHead>Active</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.full_name}</TableCell>
                  {/* Reverted: Removed Role cell */}
                  <TableCell>{member.active ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{member.order_index}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingMember(member); setIsFormOpen(true); }}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteMember(member.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMembersPage;
