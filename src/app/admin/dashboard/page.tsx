'use client';
import { useState, useEffect } from 'react';
import { collection, query, updateDoc, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/header';
import { EditUserForm } from '@/components/admins/edit-user-form';
import FullScreenLoader from '@/components/layout/full-screen-loader';
import { Button } from '@/components/ui/button';


export default function AdminDashboardPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const userProfileRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const { data: users, isLoading: areUsersLoading, error } = useCollection<UserProfile>(usersQuery);
  
  useEffect(() => {
    if (error) {
      console.error("Error fetching users: ", error);
      toast({ title: 'Error', description: 'Could not fetch user data.', variant: 'destructive' });
    }
  }, [error, toast]);
  
  // Auth Guard
  useEffect(() => {
      if (isUserLoading || isProfileLoading) return;
      if (!user) {
          router.replace('/admin/login');
      } else if (userProfile && !userProfile.isAdmin) {
          toast({ title: 'Access Denied', description: 'You do not have permission to view this page.', variant: 'destructive'});
          router.replace('/');
      }
  }, [user, isUserLoading, userProfile, isProfileLoading, router, toast]);

  const handleValidityToggle = async (userToUpdate: UserProfile) => {
    if (!firestore) return;
    const userRef = doc(firestore, 'users', userToUpdate.uid);
    try {
      await updateDoc(userRef, { isLive: !userToUpdate.isLive });
      toast({ title: 'Success', description: `${userToUpdate.email}'s validity has been updated.` });
    } catch (e) {
      console.error("Error updating user validity: ", e);
      toast({ title: 'Error', description: 'Could not update user validity.', variant: 'destructive' });
    }
  };
  
  const handleEditUser = (userToUpdate: UserProfile) => {
    setEditingUser(userToUpdate);
  }

  const handleSaveUser = () => {
    setEditingUser(null);
    // The collection will refetch automatically
  }

  if (isUserLoading || isProfileLoading || !userProfile || !userProfile.isAdmin) {
    return <FullScreenLoader />;
  }

  return (
    <>
      <Header showSignOutButton={true} />
      <main className="p-4 md:p-6 lg:p-8">
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl mb-6">Admin Panel</h2>
        <Card>
          <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                View and manage user accounts. To make a user an admin, manually edit the `isAdmin` field to `true` in the Firestore database.
              </CardDescription>
          </CardHeader>
          <CardContent>
            {areUsersLoading ? (
                 <div className="flex justify-center mt-8"><LoaderCircle className="animate-spin h-8 w-8 text-primary" /></div>
            ) : users && users.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map((u) => (
                  <Card key={u.uid} className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="truncate text-lg flex justify-between items-center" title={u.email}>
                        <span className="truncate">{u.email}</span>
                         <Button variant="ghost" size="icon" onClick={() => handleEditUser(u)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                      </CardTitle>
                      <CardDescription>
                        {u.isAdmin ? <Badge>Admin</Badge> : <Badge variant="outline">User</Badge>}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-sm text-muted-foreground">
                        Joined on: {u.createdAt ? format(u.createdAt.toDate(), 'PPP') : 'N/A'}
                      </p>
                    </CardContent>
                    <CardFooter className="flex justify-between items-center bg-muted/50 p-4 border-t">
                       <span className={`text-sm font-medium ${u.isLive ? 'text-secondary' : 'text-destructive'}`}>
                          {u.isLive ? 'Active' : 'Inactive'}
                        </span>
                      <Switch
                        checked={u.isLive}
                        onCheckedChange={() => handleValidityToggle(u)}
                        aria-label={`Toggle validity for ${u.email}`}
                      />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
               <p className="text-center text-muted-foreground py-8">No users found.</p>
            )}
          </CardContent>
        </Card>
        <div className="mt-6 p-4 border rounded-lg bg-muted/50">
          <h3 className="font-semibold text-lg">Important Notes:</h3>
          <ul className="list-disc pl-5 mt-2 text-sm text-muted-foreground space-y-1">
              <li>Toggling "Live Status" to inactive will immediately block the user from accessing the app, showing them a "Validity Expired" message upon login.</li>
              <li>Editing a user's email here only changes it in the database profile, not their login credentials. Changing login emails requires developer intervention.</li>
          </ul>
        </div>
      </main>
      {editingUser && (
        <EditUserForm
          isOpen={!!editingUser}
          setIsOpen={(isOpen) => !isOpen && setEditingUser(null)}
          user={editingUser}
          onSave={handleSaveUser}
        />
      )}
    </>
  );
}
