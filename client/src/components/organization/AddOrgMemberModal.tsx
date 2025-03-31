import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { User } from '@shared/schema';

interface AddOrgMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: number;
  onSuccess: () => void;
}

export function AddOrgMemberModal({ isOpen, onClose, organizationId, onSuccess }: AddOrgMemberModalProps) {
  const { toast } = useToast();
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  // Fetch available users (users not in this organization)
  useEffect(() => {
    if (isOpen) {
      fetchAvailableUsers();
    }
  }, [isOpen, organizationId]);

  const fetchAvailableUsers = async () => {
    setFetchLoading(true);
    try {
      // Get all users
      const allUsersResponse = await fetch('/api/users');
      if (!allUsersResponse.ok) {
        throw new Error('Failed to fetch users');
      }
      const allUsers = await allUsersResponse.json();
      
      // Get organization members
      const orgMembersResponse = await fetch(`/api/organizations/${organizationId}/users`);
      if (!orgMembersResponse.ok) {
        throw new Error('Failed to fetch organization members');
      }
      const orgMembers = await orgMembersResponse.json();
      
      // Filter out users already in the organization
      const orgMemberIds = orgMembers.map((member: User) => member.id);
      const available = allUsers.filter((user: User) => !orgMemberIds.includes(user.id));
      
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
      const response = await fetch(`/api/organizations/${organizationId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: parseInt(selectedUserId) }),
      });

      if (!response.ok) {
        throw new Error('Failed to add member to organization');
      }

      toast({
        title: 'Success',
        description: 'Member added to organization successfully',
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding member to organization:', error);
      toast({
        title: 'Error',
        description: 'Failed to add member to organization',
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
          <DialogTitle>Add Organization Member</DialogTitle>
          <DialogDescription>
            Add a user to your organization. They will have access to organization resources.
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
            {loading ? "Adding..." : "Add to Organization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}