"use client";

import React, { useEffect, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  credits: number;
};

export default function UserTable({
  filters,
  onSelectionChange,
}: {
  filters: Record<string, any>;
  onSelectionChange?: (ids: string[]) => void;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    // Placeholder fetch - replace with real admin API
    fetch(`/api/(admin)/users?search=${encodeURIComponent(filters.search || "")}`)
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        setUsers(data?.users || []);
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));

    return () => {
      mounted = false;
    };
  }, [filters]);

  useEffect(() => {
    onSelectionChange && onSelectionChange(Object.keys(selected).filter((k) => selected[k]));
  }, [selected, onSelectionChange]);

  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div className="bg-white rounded-md shadow-sm">
      <table className="w-full table-fixed">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left"><input aria-label="select all" type="checkbox" /></th>
            <th className="p-3 text-left">Name</th>
            <th className="p-3 text-left">Email</th>
            <th className="p-3 text-left">Role</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Credits</th>
            <th className="p-3 text-left">Registered</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td className="p-4" colSpan={8}>Loading...</td></tr>
          ) : users.length === 0 ? (
            <tr><td className="p-4" colSpan={8}>No users found</td></tr>
          ) : (
            users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3"><input aria-label={`select-${u.id}`} type="checkbox" checked={!!selected[u.id]} onChange={() => toggle(u.id)} /></td>
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">{u.status}</td>
                <td className="p-3">{u.credits}</td>
                <td className="p-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="p-3">{/* actions: view/edit/impersonate */}
                  <div className="flex gap-2">
                    <button className="text-sm text-blue-600">View</button>
                    <button className="text-sm text-amber-600">Edit</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
