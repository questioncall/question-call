"use client";

import { AdminSidebarContent } from "./admin-sidebar-content";

export function AdminSidebar() {
  return (
    <aside className="no-scrollbar flex w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-background py-6">
      <AdminSidebarContent />
    </aside>
  );
}