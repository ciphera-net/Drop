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
             <FeatureCard 
               icon={<ShieldCheck className="w-6 h-6 text-primary" weight="fill" />}
               title="Secure File Requests"
               desc="Create a secure link to receive files from anyone, encrypted for your eyes only."
            />
             <FeatureCard 
               icon={<Lock className="w-6 h-6 text-primary" weight="fill" />}
               title="Encrypted Messaging"
               desc="Share passwords or sensitive text that self-destruct after reading."
            />
             <FeatureCard 
               icon={<Globe className="w-6 h-6 text-primary" weight="fill" />}
               title="Smart PGP Support"
               desc="Email notifications are automatically PGP encrypted for compatible providers."
            />
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
   return (
      <div className="group flex flex-col items-center text-center p-6 bg-card rounded-2xl shadow-sm border border-border hover:shadow-md transition-all hover:-translate-y-1 duration-300">
         <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
            {icon}
         </div>
         <h3 className="font-semibold text-foreground mb-2">{title}</h3>
         <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
   )
}

