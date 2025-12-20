import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { DashboardList } from "@/components/dashboard-list";
import { UserMenu } from "@/components/user-menu";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: uploads } = await supabase
    .from('uploads')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-slate-50/50">
       <header className="bg-white/80 backdrop-blur-sm border-b py-4 px-4 md:px-8 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
             <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl text-gray-900">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm">
                        D
                    </div>
                    <span className="hidden sm:inline">Drop</span>
                </Link>
             </div>
             <UserMenu user={user} />
          </div>
       </header>
       <main className="max-w-4xl mx-auto p-4 py-8 md:p-8">
          <div className="mb-6 flex justify-between items-end">
              <div>
                 <h2 className="text-2xl font-bold text-gray-900">Active Transfers</h2>
                 <p className="text-gray-500 text-sm mt-1">Manage your active file shares.</p>
              </div>
              <Link href="/">
                 <Button variant="default" size="sm" className="shadow-sm">
                    New Transfer
                 </Button>
              </Link>
          </div>
          <DashboardList uploads={uploads || []} />
       </main>
    </div>
  )
}

// Simple wrapper for button in server component if needed, but we can import Client Button
import { Button } from "@/components/ui/button";

