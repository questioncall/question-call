"use client"

import Link from "next/link"
import {
  MoreVertical,
  LogOut,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { getSignOutPath } from "@/lib/user-paths"
import { useAppSelector } from "@/store/hooks"

const PLAN_NAME_MAP: Record<string, string> = {
  free: "Trial",
  go: "GO",
  plus: "Plus",
  pro: "Pro",
  max: "Max",
}

function getPlanDisplayName(planSlug: string | null): string | null {
  if (!planSlug) return null
  return PLAN_NAME_MAP[planSlug] || null
}

export function NavUser({
  user: fallbackUser,
  loading = false,
}: {
  user: {
    name: string
    email: string
    userImage?: string
  }
  loading?: boolean
}) {
const { isMobile } = useSidebar()
  const profile = useAppSelector((state) => state.user)

  const name = profile.name || fallbackUser.name || "Student"
  const email = profile.email || fallbackUser.email || ""
  const avatar = profile.userImage || fallbackUser.userImage || ""
  const planSlug = profile.planSlug
  const planDisplayName = getPlanDisplayName(planSlug)

  const fallback = name ? name.substring(0, 2).toUpperCase() : "U"

  if (loading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            aria-hidden="true"
            disabled
            size="lg"
            className="opacity-100 hover:bg-transparent"
          >
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="grid flex-1 gap-1">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="ml-auto h-4 w-4 rounded-sm" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
<Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={avatar} alt={name} />
                <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{name}</span>
                  {planDisplayName && (
                    <span className="shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      {planDisplayName}
                    </span>
                  )}
                </div>
                <span className="truncate text-xs text-muted-foreground">
                  {email}
                </span>
              </div>
              <MoreVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatar} alt={name} />
                  <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
<DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={getSignOutPath()}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

