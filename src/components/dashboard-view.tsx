"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { DashboardList } from "./dashboard-list";
import { RequestList } from "./request-list";
import { CreateRequestDialog } from "./create-request-dialog";

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
                        ? 'Manage your uploads.' 
                        : 'Manage your requests.'}
                 </p>
              </div>
              
              <div className="flex gap-2">
                  {activeTab === 'requests' && <CreateRequestDialog />}
                  {activeTab === 'uploads' && (
                     <Button asChild className="shadow-orange-500/20 shadow-lg">
                        <Link href="/">
                            <Plus className="mr-2" weight="bold" /> New Transfer
                        </Link>
                     </Button>
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

