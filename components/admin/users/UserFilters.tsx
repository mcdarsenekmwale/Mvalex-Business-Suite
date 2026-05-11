"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React, { useState } from "react";

export default function UserFilters({ value, onChange }: { value: Record<string, any>; onChange: (v: any) => void; }) {
  const [local, setLocal] = useState(value || {});

  const apply = () => onChange(local);

  return (
    <div className="flex items-center gap-2">
      <input
        aria-label="Search users"
        placeholder="Search by name or email"
        value={local.search || ''}
        onChange={(e) => setLocal({ ...local, search: e.target.value })}
        className="px-3 py-2 border rounded-md"
      />
      <Select  value={local.role || ''} onValueChange={(value) => setLocal({ ...local, role: value })}>
        <SelectTrigger className="px-3 py-2 border rounded-md" >
          <SelectValue  placeholder={local.role || "All roles"}/>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All roles</SelectItem>
          <SelectItem value="USER">User</SelectItem>
          <SelectItem value="ADMIN">Admin</SelectItem>
          <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
        </SelectContent>
      </Select>

      <Select  value={local.status || ''} onValueChange={(value) => setLocal({ ...local, status: value })}>
        <SelectTrigger className="px-3 py-2 border rounded-md" >
          <SelectValue  placeholder={local.status || "All status"}/>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All status</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="SUSPENDED">Suspended</SelectItem>
          <SelectItem value="PENDING">Pending</SelectItem>
        </SelectContent>
      </Select>

      <Button onClick={apply} className="px-3 py-2 bg-blue-600 text-white rounded-md">
        Apply
      </Button>
    </div>
  );
}
