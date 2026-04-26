"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import {
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AdminSidebarContent } from "./admin-sidebar-content";

export function AdminLayoutClient() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button - Fixed position */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-4 left-4 z-50"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 border-r">
          <DialogTitle className="sr-only">Admin Navigation Menu</DialogTitle>
          <DialogDescription className="sr-only">
            Navigate to different admin sections including transactions, users, settings, and more.
          </DialogDescription>
          <AdminSidebarContent onLinkClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}