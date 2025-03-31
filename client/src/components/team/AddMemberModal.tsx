import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { User } from '@shared/schema';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  onSuccess: () => void;
}

export function AddMemberModal({ isOpen, onClose, teamId, onSuccess }: AddMemberModalProps) {
  const { toast } = useToast();
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  // Fetch available users (users not in this team)
  useEffect(() => {
    if (isOpen) {
      fetchAvailableUsers();
    }
  }, [isOpen, teamId]);

  const fetchAvailableUsers = async () => {
    setFetchLoading(true);
    try {
      // Get all users
      const allUsersResponse = await fetch('/api/users');
      if (!allUsersResponse.ok) {
        throw new Error('Failed to fetch users');
      }
      const allUsers = await allUsersResponse.json();
      
      // Get team members
      const teamMembersResponse = await fetch(`/api/teams/${teamId}/users`);
      if (!teamMembersResponse.ok) {
        throw new Error('Failed to fetch team members');
      }
      const teamMembers = await teamMembersResponse.json();
      
      // Filter out users already in the team
      const teamMemberIds = teamMembers.map((member: User) => member.id);
      const available = allUsers.filter((user: User) => !teamMemberIds.includes(user.id));
      
      setAvailableUsers(available);
    } catch (error) {
      console.error('Error fetching available users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch available users',
        variant: 'destructive',
      });
    } finally {
      setFetchLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast({
        title: 'Error',
        description: 'Please select a user to add',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: parseInt(selectedUserId) }),
      });

      if (!response.ok) {
        throw new Error('Failed to add member to team');
      }

      toast({
        title: 'Success',
        description: 'Member added to team successfully',
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding member to team:', error);
      toast({
        title: 'Error',
        description: 'Failed to add member to team',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Add a user to your team. They will have access to team resources.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="user" className="text-right">
              User
            </Label>
            <div className="col-span-3">
              <Select 
                disabled={fetchLoading || loading}
                value={selectedUserId} 
                onValueChange={setSelectedUserId}
              >
                <SelectTrigger id="user">
                  <SelectValue placeholder={fetchLoading ? "Loading users..." : "Select a user"} />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.length === 0 ? (
                    <SelectItem value="none" disabled>No available users</SelectItem>
                  ) : (
                    availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.displayName || user.username} ({user.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAddMember} disabled={!selectedUserId || loading || fetchLoading}>
            {loading ? "Adding..." : "Add to Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}