"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

const navItems = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
];

const mrrItems = [
  { title: "MRR Overview", href: "/dashboard/mrr", icon: TrendingUp },
  { title: "Subscribers", href: "/dashboard/mrr/subscribers", icon: Users },
  {
    title: "Revenue Leakage",
    href: "/dashboard/mrr/leakage",
    icon: AlertTriangle,
  },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <span className="text-lg font-semibold tracking-tight">
          COO Dashboard
        </span>
        <span className="text-xs text-muted-foreground">TheStorefront</span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton render={<Link href={item.href} />}>
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>MRR & Subscriptions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mrrItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton render={<Link href={item.href} />}>
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-3">
          <UserButton />
          <span className="text-sm text-muted-foreground">Florian</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
