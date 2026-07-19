"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BanknoteIcon,
  BookOpenIcon,
  CircleDollarSignIcon,
  CreditCardIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  ReceiptIcon,
  SettingsIcon,
  ShieldAlertIcon,
  TagIcon,
  UserCheckIcon,
  UsersIcon,
  VideoIcon,
  BellIcon,
  MegaphoneIcon,
  KeyRoundIcon,
  Share2Icon,
  Zap,
  Code2,
  ClapperboardIcon,
  HelpCircle,
  NotebookTextIcon,
  Layers3Icon,
  UserXIcon,
} from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_ITEMS } from "@/lib/admin-portal";

const iconMap: Record<string, React.ElementType> = {
  "Transactions": CircleDollarSignIcon,
  "Withdrawals": BanknoteIcon,
  "Receipts": ReceiptIcon,
  "Settings": SettingsIcon,
  "Social Media": Share2Icon,
  "Users": UsersIcon,
  "Account Deletions": UserXIcon,
  "Subscription": TagIcon,
  "Payment config": CreditCardIcon,
  "Format config": LayoutDashboardIcon,
  "Notifications": BellIcon,
  "Notices": MegaphoneIcon,
  "Quiz management": UserCheckIcon,
  "AI Keys": KeyRoundIcon,
  "Courses": BookOpenIcon,
  "Chapters": Layers3Icon,
  "Coupons": FileTextIcon,
  "Subscription coupons": TagIcon,
  "Live sessions": VideoIcon,
  "Onboarding Videos": ClapperboardIcon,
  "Legal": ShieldAlertIcon,
  "Security": ShieldAlertIcon,
  "Services": Zap,
  "Developer": Code2,
  "Questions": HelpCircle,
  "Notes": NotebookTextIcon,
};

const groupedItems = [
  {
    category: "OPERATIONS",
    items: ADMIN_NAV_ITEMS.filter(item => ["Transactions", "Withdrawals", "Receipts", "Users", "Account Deletions"].includes(item.label))
  },
  {
    category: "COMMUNICATION",
    items: ADMIN_NAV_ITEMS.filter(item => ["Notifications", "Notices"].includes(item.label))
  },
  {
    category: "CONTENT",
    items: ADMIN_NAV_ITEMS.filter(item => ["Quiz management", "Questions", "Notes", "Courses", "Chapters", "Coupons", "Subscription coupons", "Live sessions", "Onboarding Videos"].includes(item.label))
  },
  {
    category: "PLATFORM",
    items: ADMIN_NAV_ITEMS.filter(item => ["Services", "Developer", "Settings", "Social Media", "Subscription", "Payment config", "Format config", "AI Keys", "Legal", "Security"].includes(item.label))
  }
];

interface AdminSidebarContentProps {
  onLinkClick?: () => void;
  className?: string;
}

export function AdminSidebarContent({ onLinkClick, className }: AdminSidebarContentProps) {
  const pathname = usePathname();

  return (
    <aside className={cn("no-scrollbar flex h-full flex-col overflow-y-auto border-r border-border bg-background py-6", className)}>
      <div className="px-6 mb-8">
        <Logo href="/admin/transactions" prefetch={false} showTagline={false} />
      </div>

      <nav className="flex-1 space-y-8 px-4">
        {groupedItems.map((group) => (
          <div key={group.category}>
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {group.category}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = iconMap[item.label] || LayoutDashboardIcon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={onLinkClick}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors group",
                      isActive
                        ? "bg-primary/[0.08] text-primary"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <Icon 
                      className={cn(
                        "size-4 shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )} 
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
