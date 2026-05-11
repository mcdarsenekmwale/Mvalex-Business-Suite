// components/admin/users/UserActionDialog.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface UserActionDialogProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    creditsBalance: number;
  };
  onConfirm: (action: string, value: any) => void;
  children: React.ReactNode;
}

export function UserActionDialog({ user, onConfirm, children }: UserActionDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [creditsAmount, setCreditsAmount] = useState<number>(0);
  const [selectedRole, setSelectedRole] = useState<string>("");

  const handleConfirm = () => {
    let value: any = {};
    
    switch (selectedAction) {
      case "add-credits":
        value = { amount: creditsAmount };
        break;
      case "change-role":
        value = { role: selectedRole };
        break;
      case "suspend":
        value = { suspended: true };
        break;
      case "delete":
        value = { confirmed: true };
        break;
    }
    
    onConfirm(selectedAction, value);
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedAction("");
    setCreditsAmount(0);
    setSelectedRole("");
  };

  const getDialogTitle = () => {
    switch (selectedAction) {
      case "add-credits": return "Add Credits";
      case "change-role": return "Change User Role";
      case "suspend": return "Suspend User";
      case "delete": return "Delete User";
      default: return "User Action";
    }
  };

  const getDialogDescription = () => {
    switch (selectedAction) {
      case "add-credits": return `Add credits to ${user?.name || user?.email}'s account`;
      case "change-role": return `Change role for ${user?.name || user?.email}`;
      case "suspend": return `Are you sure you want to suspend ${user?.name || user?.email}?`;
      case "delete": return `This action cannot be undone. This will permanently delete ${user?.name || user?.email}'s account.`;
      default: return "Select an action to perform";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="action" className="text-right">
              Action
            </Label>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select an action..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add-credits">Add Credits</SelectItem>
                <SelectItem value="change-role">Change Role</SelectItem>
                <SelectItem value="suspend">Suspend User</SelectItem>
                <SelectItem value="delete">Delete User</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {selectedAction === "add-credits" && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="credits" className="text-right">
                Amount
              </Label>
              <Input
                id="credits"
                type="number"
                value={creditsAmount}
                onChange={(e) => setCreditsAmount(parseInt(e.target.value))}
                className="col-span-3"
                placeholder="Enter credit amount"
              />
            </div>
          )}
          
          {selectedAction === "change-role" && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={
              !selectedAction || 
              (selectedAction === "add-credits" && creditsAmount <= 0) ||
              (selectedAction === "change-role" && !selectedRole)
            }
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}