import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type User = {
  id: string;
  email: string | undefined;
  role: string | null;
};

const ManageRoles = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsersAndRoles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();

      if (authError) {
        toast({ title: "Error fetching users", description: authError.message, variant: "destructive" });
        return;
      }

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) {
        toast({ title: "Error fetching roles", description: rolesError.message, variant: "destructive" });
        return;
      }
      
      const { data: appRoles, error: appRolesError } = await supabase
        .rpc('get_enum_values', { enum_type: 'app_role' });

      if (appRolesError) {
        toast({ title: "Error fetching app roles", description: appRolesError.message, variant: "destructive" });
        return;
      }
      
      setRoles(appRoles as string[]);

      const combinedUsers = authUsers.map(user => {
        const userRole = roles.find(role => role.user_id === user.id);
        return {
          id: user.id,
          email: user.email,
          role: userRole ? userRole.role : null,
        };
      });

      setUsers(combinedUsers);
    };

    fetchUsersAndRoles();
  }, [toast]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (currentUser?.id === userId) {
      toast({
        title: "Action Forbidden",
        description: "You cannot change your own role.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: newRole }, { onConflict: "user_id" });

    if (error) {
      toast({ title: "Error updating role", description: error.message, variant: "destructive" });
    } else {
      setUsers(users.map(user => user.id === userId ? { ...user, role: newRole } : user));
      toast({ title: "Role Updated", description: `Successfully updated role for ${users.find(u => u.id === userId)?.email}.` });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Manage User Roles</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.id}>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.role || "Not assigned"}</TableCell>
              <TableCell>
                <Select onValueChange={(value) => handleRoleChange(user.id, value)} value={user.role || ''}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Assign Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ManageRoles;