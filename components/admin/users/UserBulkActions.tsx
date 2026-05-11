"use client";

import React from "react";

export default function UserBulkActions({ selectedIds, onAction }: { selectedIds: string[]; onAction: (action: string, ids: string[]) => void; }) {
  return (
    <div className="flex items-center gap-2">
      <select aria-label="bulk-action" className="px-3 py-2 border rounded-md" onChange={(e) => { if (e.target.value) onAction(e.target.value, selectedIds); e.currentTarget.selectedIndex = 0; }}>
        <option value="">Bulk actions</option>
        <option value="suspend">Suspend</option>
        <option value="delete">Delete</option>
        <option value="assign-role">Assign role</option>
        <option value="add-credits">Add credits</option>
      </select>
      <button className="px-3 py-2 bg-gray-100 rounded-md">Apply</button>
    </div>
  );
}
