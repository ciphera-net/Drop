"use client";

import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { UserProfile } from "@/types";
import { ProfileForm } from "./profile-form";
import { PreferencesForm } from "./preferences-form";
import { SecurityForm } from "./security-form";
import { IntegrationsForm } from "./integrations-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { User as UserIcon, LockKey, Plug, Sliders } from "@phosphor-icons/react";

interface SettingsViewProps {
  user: User;
  profile: UserProfile | null;
}

type Tab = "general" | "preferences" | "security" | "integrations";

export function SettingsView({ user, profile }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("general");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <UserIcon weight="bold" /> },
    { id: "preferences", label: "Preferences", icon: <Sliders weight="bold" /> },
    { id: "security", label: "Security", icon: <LockKey weight="bold" /> },
    { id: "integrations", label: "Integrations", icon: <Plug weight="bold" /> },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
      {/* Sidebar Navigation */}
      <aside className="lg:w-1/5">
        <nav className="flex lg:flex-col space-x-2 lg:space-x-0 lg:space-y-1">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "secondary" : "ghost"}
              className={cn(
                "justify-start gap-2 w-full",
                activeTab === tab.id 
                  ? "bg-muted font-medium" 
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
        {activeTab === "general" && <ProfileForm user={user} profile={profile} />}
        {activeTab === "preferences" && <PreferencesForm user={user} profile={profile} />}
        {activeTab === "security" && <SecurityForm user={user} />}
        {activeTab === "integrations" && <IntegrationsForm user={user} profile={profile} />}
      </div>
    </div>
  );
}
