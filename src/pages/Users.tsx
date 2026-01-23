import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users as UsersIcon, Shield, UserCheck, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  created_at: string;
  role: 'owner' | 'attendant';
}

export default function Users() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      return profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role || 'attendant',
        } as UserWithRole;
      });
    },
  });

  const owners = users.filter((u) => u.role === 'owner');
  const attendants = users.filter((u) => u.role === 'attendant');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground">View and manage system users</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-primary/10 p-3">
              <UsersIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-success/10 p-3">
              <Shield className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Owners</p>
              <p className="text-2xl font-bold">{owners.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-info/10 p-3">
              <UserCheck className="h-6 w-6 text-info" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Attendants</p>
              <p className="text-2xl font-bold">{attendants.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">No users found</p>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className={`rounded-full p-2 ${
                      user.role === 'owner' ? 'bg-success/10' : 'bg-info/10'
                    }`}>
                      {user.role === 'owner' ? (
                        <Shield className="h-5 w-5 text-success" />
                      ) : (
                        <UserCheck className="h-5 w-5 text-info" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Joined {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={user.role === 'owner' ? 'default' : 'secondary'}
                    className={user.role === 'owner' ? 'bg-success' : ''}
                  >
                    {user.role === 'owner' ? 'Owner' : 'Attendant'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="text-center">
            <UsersIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-medium">Adding New Users</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              To add a new attendant, have them sign up through the login page. 
              The first user to sign up becomes the Owner, and all subsequent users 
              become Attendants automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
