
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";

interface FormField {
  id: number;
  question: string;
  type: 'text' | 'choice' | 'birthday';
  options: string[];
  is_required: boolean;
}

const ManageJoinUsPage = () => {
  const [fields, setFields] = useState<FormField[]>([]);
  const [newField, setNewField] = useState({
    question: "",
    type: "text" as FormField['type'],
    options: "",
    is_required: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('join_us_form_fields')
      .select('*')
      .order('id', { ascending: true });
    if (error) {
      console.error("Error fetching fields:", error);
    } else {
      setFields(data as FormField[]);
    }
    setLoading(false);
  };

  const addField = async () => {
    if (fields.length >= 20) {
      alert("You can have a maximum of 20 fields.");
      return;
    }

    const { data, error } = await supabase
      .from('join_us_form_fields')
      .insert([
        {
          question: newField.question,
          type: newField.type,
          options: newField.type === 'choice' ? newField.options.split(',').map(o => o.trim()) : undefined,
          is_required: newField.is_required,
        }
      ])
      .select();

    if (error) {
      console.error("Error adding field:", error);
    } else if (data) {
      setFields([...fields, ...data as FormField[]]);
      setNewField({ question: "", type: "text", options: "", is_required: false });
    }
  };

  const updateField = async (id: number, updatedField: Partial<FormField>) => {
    const { error } = await supabase
      .from('join_us_form_fields')
      .update(updatedField)
      .eq('id', id);

    if (error) {
      console.error("Error updating field:", error);
    } else {
      setFields(fields.map(field => field.id === id ? { ...field, ...updatedField } : field));
    }
  };


  const deleteField = async (id: number) => {
    const { error } = await supabase
      .from('join_us_form_fields')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting field:", error);
    } else {
      setFields(fields.filter(field => field.id !== id));
    }
  };

  if (loading) {
    return <div>Loading form fields...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Manage "Join Us" Page Form</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add New Field</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              placeholder="Question"
              value={newField.question}
              onChange={(e) => setNewField({ ...newField, question: e.target.value })}
            />
            <Select onValueChange={(value) => setNewField({ ...newField, type: value as FormField['type'] })} value={newField.type}>
              <SelectTrigger>
                <SelectValue placeholder="Field Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="choice">Choice</SelectItem>
                <SelectItem value="birthday">Birthday</SelectItem>
              </SelectContent>
            </Select>
            {newField.type === 'choice' && (
              <Input
                placeholder="Options (comma-separated)"
                value={newField.options}
                onChange={(e) => setNewField({ ...newField, options: e.target.value })}
              />
            )}
            <div className="flex items-center space-x-2">
              <Switch
                id="is_required"
                checked={newField.is_required}
                onCheckedChange={(checked) => setNewField({ ...newField, is_required: checked })}
              />
              <Label htmlFor="is_required">Required</Label>
            </div>
            <Button onClick={addField}>Add Field</Button>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-bold mb-4">Current Form Fields</h2>
      <div className="space-y-4">
        {fields.map((field) => (
          <Card key={field.id}>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{field.question}</p>
                <p className="text-sm text-gray-500">Type: {field.type}</p>
                {field.type === 'choice' && <p className="text-sm text-gray-500">Options: {field.options.join(', ')}</p>}
                <div className="flex items-center space-x-2 mt-2">
                  <Switch
                    id={`is_required-${field.id}`}
                    checked={field.is_required}
                    onCheckedChange={(checked) => updateField(field.id, { is_required: checked })}
                  />
                  <Label htmlFor={`is_required-${field.id}`}>Required</Label>
                </div>
              </div>
              <Button variant="destructive" size="icon" onClick={() => deleteField(field.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ManageJoinUsPage;
