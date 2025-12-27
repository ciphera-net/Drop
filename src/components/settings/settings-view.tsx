"use client";

import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { UserProfile } from "@/types";
import { ProfileForm } from "./profile-form";
import { PreferencesForm } from "./preferences-form";
import { StorageForm } from "./storage-form";
import { SecurityForm } from "./security-form";
import { IntegrationsForm } from "./integrations-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { User as UserIcon, LockKey, Plug, Sliders, HardDrives } from "@phosphor-icons/react";

interface SettingsViewProps {
  user: User;
  profile: UserProfile | null;
}

type Tab = "general" | "preferences" | "storage" | "security" | "integrations";

export function SettingsView({ user, profile }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("general");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <UserIcon weight="bold" /> },
    { id: "preferences", label: "Preferences", icon: <Sliders weight="bold" /> },
    { id: "storage", label: "Storage", icon: <HardDrives weight="bold" /> },
    { id: "security", label: "Security", icon: <LockKey weight="bold" /> },
    { id: "integrations", label: "Integrations", icon: <Plug weight="bold" /> },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
      {/* Sidebar Navigation */}
      <aside className="lg:w-1/5">
        <nav className="flex lg:flex-col space-x-2 lg:space-x-0 lg:space-y-1 p-1 bg-muted/50 backdrop-blur-sm rounded-xl border border-border/50">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              className={cn(
                "justify-start gap-2 w-full rounded-lg transition-all duration-200",
                activeTab === tab.id 
                  ? "bg-background text-primary shadow-sm ring-1 ring-border font-medium" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </Button>
          ))}
        </nav>
      </aside>

      {/* Content Area */}
      <div className="flex-1 lg:max-w-2xl">
        <div key={activeTab} className="animate-in fade-in slide-in-from-right-4 duration-300">
          {activeTab === "general" && <ProfileForm user={user} profile={profile} />}
          {activeTab === "preferences" && <PreferencesForm user={user} profile={profile} />}
          {activeTab === "storage" && <StorageForm user={user} />}
          {activeTab === "security" && <SecurityForm user={user} />}
          {activeTab === "integrations" && <IntegrationsForm user={user} profile={profile} />}
        </div>
      </div>
    </div>
  );
}
