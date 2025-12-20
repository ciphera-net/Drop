"use client";
import { ShieldCheck, Lock, Globe } from "@phosphor-icons/react";

export function FeatureSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
               icon={<Lock className="w-6 h-6 text-primary" weight="fill" />}
               title="End-to-End Encryption"
               desc="Files are encrypted in your browser. We never see your data."
            />
            <FeatureCard 
               icon={<Globe className="w-6 h-6 text-primary" weight="fill" />}
               title="Open Source"
               desc="Code you can trust. Audit our security on GitHub."
            />
             <FeatureCard 
               icon={<ShieldCheck className="w-6 h-6 text-primary" weight="fill" />}
               title="No Tracking"
               desc="We don't log your IP or sell your data. Pure privacy."
            />
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
   return (
      <div className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
         <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mb-4">
            {icon}
         </div>
         <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
         <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
      </div>
   )
}

