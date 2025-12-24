"use client";

import { useState } from "react";
import { DashboardList } from "./dashboard-list";
import { RequestList } from "./request-list";
import { CreateRequestDialog } from "./create-request-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"; // Assuming shadcn Tabs exists or I use generic logic
// Wait, I might not have Tabs component installed. Let's check. 
// If not, I'll build a simple switcher.

export function DashboardView({ uploads, requests }: { uploads: any[], requests: any[] }) {
  const [activeTab, setActiveTab] = useState<'uploads' | 'requests'>('uploads');

  return (
    <div>
        <div className="mb-6 flex flex-col md:flex-row justify-between items-end gap-4">
              <div>
                 <h2 className="text-2xl font-bold text-foreground">
                    {activeTab === 'uploads' ? 'Active Transfers' : 'File Requests'}
                 </h2>
                 <p className="text-muted-foreground text-sm mt-1">
                    {activeTab === 'uploads' 
                        ? 'Manage your sent files.' 
                        : 'Manage secure upload links you created.'}
                 </p>
              </div>
              
              <div className="flex gap-2">
                  {activeTab === 'requests' && <CreateRequestDialog />}
                  {activeTab === 'uploads' && (
                     <a href="/">
                        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm">
                            New Transfer
                        </button>
                     </a>
                  )}
              </div>
          </div>

        <div className="mb-6">
            <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                <button 
                    onClick={() => setActiveTab('uploads')}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${activeTab === 'uploads' ? 'bg-background text-foreground shadow-sm' : ''}`}
                >
                    My Uploads
                </button>
                <button 
                    onClick={() => setActiveTab('requests')}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${activeTab === 'requests' ? 'bg-background text-foreground shadow-sm' : ''}`}
                >
                    File Requests
                </button>
            </div>
        </div>

        {activeTab === 'uploads' ? (
            <DashboardList uploads={uploads} />
        ) : (
            <RequestList requests={requests} />
        )}
    </div>
  );
}

