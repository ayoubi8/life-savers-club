'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';

interface FormField {
  id: number;
  question: string;
  type: 'text' | 'choice' | 'birthday';
  options: string[];
  is_required: boolean;
}

export default function ManageJoinUsForm() {
  const [fields, setFields] = useState<FormField[]>([]);
  const [newField, setNewField] = useState<Omit<FormField, 'id'>>({
    question: '',
    type: 'text',
    options: [],
    is_required: false,
  });
  const [editingField, setEditingField] = useState<FormField | null>(null);

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    const { data, error } = await supabase
      .from('join_us_form_fields')
      .select('*')
      .order('id', { ascending: true });
    if (error) {
      console.error('Error fetching fields:', error);
    } else {
      setFields(data as FormField[]);
    }
  };

  const handleCreate = async () => {
    if (!newField.question || !newField.type) {
        toast({ title: 'Error', description: 'Question and type are required.', variant: 'destructive' });
        return;
    }
    const { data, error } = await supabase
      .from('join_us_form_fields')
      .insert([{
        ...newField,
        options: newField.type === 'choice' ? newField.options : []
      }])
      .select();

    if (error) {
      console.error('Error creating field:', error);
      toast({ title: 'Error creating field', description: error.message, variant: 'destructive' });
    } else if (data) {
      setFields([...fields, data[0]]);
      setNewField({ question: '', type: 'text', options: [], is_required: false });
       toast({ title: 'Success', description: 'New field created.' });
    }
  };

  const handleUpdate = async () => {
    if (!editingField) return;

    const { data, error } = await supabase
      .from('join_us_form_fields')
      .update({
        ...editingField,
        options: editingField.type === 'choice' ? editingField.options : []
      })
      .eq('id', editingField.id)
      .select();

    if (error) {
      console.error('Error updating field:', error);
      toast({ title: 'Error updating field', description: error.message, variant: 'destructive' });
    } else if(data) {
      setFields(fields.map(f => f.id === editingField.id ? data[0] : f));
      setEditingField(null);
      toast({ title: 'Success', description: 'Field updated.' });
    }
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from('join_us_form_fields').delete().eq('id', id);
    if (error) {
      console.error('Error deleting field:', error);
      toast({ title: 'Error deleting field', description: error.message, variant: 'destructive' });
    } else {
      setFields(fields.filter(f => f.id !== id));
      toast({ title: 'Success', description: 'Field deleted.' });
    }
  };

  const renderEditForm = (field: FormField, setField: (field: FormField) => void) => (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold">{field.id ? 'Editing Field' : 'Create New Field'}</h3>
        <Input
            placeholder="Question"
            value={field.question}
            onChange={(e) => setField({ ...field, question: e.target.value })}
        />
        <Select value={field.type} onValueChange={(value) => setField({ ...field, type: value as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="choice">Choice</SelectItem>
                <SelectItem value="birthday">Birthday</SelectItem>
            </SelectContent>
        </Select>
        {field.type === 'choice' && (
            <Input
                placeholder="Comma-separated options (e.g., A,B,C)"
                value={field.options.join(',')}
                onChange={(e) => setField({ ...field, options: e.target.value.split(',') })}
            />
        )}
        <div className="flex items-center space-x-2">
            <Checkbox
                id={`is_required_${field.id || 'new'}`}
                checked={field.is_required}
                onCheckedChange={(checked) => setField({ ...field, is_required: !!checked })}
            />
            <label htmlFor={`is_required_${field.id || 'new'}`}>Required</label>
        </div>
        <div className="flex justify-end space-x-2">
             {field.id && <Button variant="outline" onClick={() => setEditingField(null)}>Cancel</Button>}
             <Button onClick={field.id ? handleUpdate : handleCreate}>{field.id ? 'Save Changes' : 'Create Field'}</Button>
        </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Manage 'Join Us' Form Fields</h1>
      
      {renderEditForm(editingField || newField as FormField, editingField ? setEditingField : (f => setNewField(f as any)))}
      
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Existing Fields</h2>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {fields.map(field => (
                    <TableRow key={field.id}>
                        <TableCell>{field.question}</TableCell>
                        <TableCell>{field.type}</TableCell>
                        <TableCell>{field.is_required ? 'Yes' : 'No'}</TableCell>
                        <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => setEditingField(field)} className="mr-2">Edit</Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(field.id)}>Delete</Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      </div>
    </div>
  );
}
