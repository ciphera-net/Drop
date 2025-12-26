import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/utils/supabase/server";
import { ShieldCheck, LockKey, EyeSlash, FileLock, Bug, NumberCircleOne, NumberCircleTwo, NumberCircleThree, NumberCircleFour, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security Architecture - Zero Knowledge Encryption",
  description: "Learn how Drop uses AES-256-GCM, client-side encryption, and zero-knowledge architecture to keep your files safe.",
  alternates: {
    canonical: '/security',
  },
};

export default async function SecurityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <SiteHeader user={user} />
      
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-16 md:py-24">
        
        {/* Header */}
        <section className="mb-16 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-6">
            <ShieldCheck weight="fill" className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6">
            Security is our Mission
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            We built Drop with a "paranoid-first" approach. We assume everything is compromised, 
            so we designed a system where we don't need to trust our own servers.
          </p>
        </section>

        {/* Core Principles Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-20">
            <div className="bg-card border rounded-xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <LockKey weight="fill" className="w-6 h-6 text-blue-500" />
                    <h3 className="text-xl font-bold">End-to-End Encryption</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                    Your files are encrypted in your browser using <strong>AES-256-GCM</strong> before they ever leave your device. 
                    The server only receives a blob of encrypted data that looks like random noise.
                </p>
            </div>
            
            <div className="bg-card border rounded-xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <EyeSlash weight="fill" className="w-6 h-6 text-purple-500" />
                    <h3 className="text-xl font-bold">Zero Knowledge</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                    The encryption key is generated on your device and is part of the share link (in the URL fragment). 
                    It is never sent to our servers, which means <strong>we cannot read your files</strong> even if we wanted to.
                </p>
            </div>

            <div className="bg-card border rounded-xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <FileLock weight="fill" className="w-6 h-6 text-green-500" />
                    <h3 className="text-xl font-bold">Privacy by Design</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                    We don't sell your data because we don't have it. No ads, no third-party trackers, and no analysis of your file contents. 
                    Your business is your business.
                </p>
            </div>

            <div className="bg-card border rounded-xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <Bug weight="fill" className="w-6 h-6 text-red-500" />
                    <h3 className="text-xl font-bold">Vulnerability Reporting</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                    Security is an ongoing process. If you find a vulnerability, please report it to 
                    <a href="mailto:security@ciphera.com" className="text-primary hover:underline ml-1">security@ciphera.com</a>. 
                    We take all reports seriously.
                </p>
            </div>
        </div>

        {/* Step-by-Step Architecture */}
        <section className="mb-20">
             <h2 className="text-3xl font-bold mb-10 text-foreground text-center">How It Works</h2>
             
             <div className="grid md:grid-cols-2 gap-12">
                 {/* Uploader Flow */}
                 <div>
                     <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                         <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">Step 1</span>
                         The Upload
                     </h3>
                     <div className="space-y-6 relative pl-6 border-l border-border">
                         <div className="relative">
                             <div className="absolute -left-[29px] top-1 bg-background">
                                 <NumberCircleOne size={24} className="text-muted-foreground" />
                             </div>
                             <h4 className="font-semibold text-foreground">Key Generation</h4>
                             <p className="text-sm text-muted-foreground mt-1">
                                 Your browser generates a random <strong>256-bit AES key</strong> using the Web Crypto API. 
                                 This happens entirely locally on your machine.
                             </p>
                         </div>
                         <div className="relative">
                             <div className="absolute -left-[29px] top-1 bg-background">
                                 <NumberCircleTwo size={24} className="text-muted-foreground" />
                             </div>
                             <h4 className="font-semibold text-foreground">Encryption</h4>
                             <p className="text-sm text-muted-foreground mt-1">
                                 The file is encrypted using <strong>AES-GCM</strong>. A unique 96-bit Initialization Vector (IV) is generated for each file. 
                                 Metadata (like filename) is also encrypted separately.
                             </p>
                         </div>
                         <div className="relative">
                             <div className="absolute -left-[29px] top-1 bg-background">
                                 <NumberCircleThree size={24} className="text-muted-foreground" />
                             </div>
                             <h4 className="font-semibold text-foreground">Upload</h4>
                             <p className="text-sm text-muted-foreground mt-1">
                                 The encrypted blobs (file + metadata) are uploaded to our storage. 
                                 We store the encrypted data but we never see the key.
                             </p>
                         </div>
                     </div>
                 </div>

                 {/* Downloader Flow */}
                 <div>
                     <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                         <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">Step 2</span>
                         The Download
                     </h3>
                     <div className="space-y-6 relative pl-6 border-l border-border">
                         <div className="relative">
                             <div className="absolute -left-[29px] top-1 bg-background">
                                 <NumberCircleOne size={24} className="text-muted-foreground" />
                             </div>
                             <h4 className="font-semibold text-foreground">Link Sharing</h4>
                             <p className="text-sm text-muted-foreground mt-1">
                                 You send the share link to the recipient. The link format is: <br/>
                                 <code className="text-xs bg-muted p-1 rounded">domain.com/d/file-id#decryption-key</code> <br/>
                                 The part after the <code className="text-xs">#</code> is never sent to the server.
                             </p>
                         </div>
                         <div className="relative">
                             <div className="absolute -left-[29px] top-1 bg-background">
                                 <NumberCircleTwo size={24} className="text-muted-foreground" />
                             </div>
                             <h4 className="font-semibold text-foreground">Retrieval</h4>
                             <p className="text-sm text-muted-foreground mt-1">
                                 The recipient's browser downloads the encrypted blobs from our server.
                             </p>
                         </div>
                         <div className="relative">
                             <div className="absolute -left-[29px] top-1 bg-background">
                                 <NumberCircleThree size={24} className="text-muted-foreground" />
                             </div>
                             <h4 className="font-semibold text-foreground">Decryption</h4>
                             <p className="text-sm text-muted-foreground mt-1">
                                 The browser extracts the key from the URL fragment and uses it to decrypt the file locally. 
                                 If the authentication tag fails (tampering detected), decryption is aborted.
                             </p>
                         </div>
                     </div>
                 </div>
             </div>
        </section>

        {/* Technical Deep Dive */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-foreground">Technical Specifications</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Encryption Primitives</h3>
                    <ul className="space-y-2 text-muted-foreground text-sm">
                        <li className="flex items-start gap-2">
                            <CheckCircle weight="fill" className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <span><strong>AES-GCM (256-bit):</strong> Used for file data and metadata encryption. Provides authenticated encryption.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle weight="fill" className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <span><strong>PBKDF2-SHA256:</strong> Used for password-protected files. 100,000 iterations to derive a strong key from your password.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle weight="fill" className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <span><strong>RSA-OAEP (2048-bit):</strong> Used for secure file requests to encrypt AES keys.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle weight="fill" className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <span><strong>OpenPGP.js:</strong> Used for encrypting email notifications for users with WKD-enabled email providers.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle weight="fill" className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <span><strong>Web Crypto API:</strong> We use the browser's native, optimized cryptographic implementations.</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="space-y-6">
                 <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Transport & Infrastructure</h3>
                    <ul className="space-y-2 text-muted-foreground text-sm">
                         <li className="flex items-start gap-2">
                            <CheckCircle weight="fill" className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <span>
                                <strong>TLS 1.3 / HTTPS:</strong> We score an 
                                <a href="https://www.ssllabs.com/ssltest/analyze.html?d=drop.ciphera.net" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mx-1 font-bold">A+ on SSL Labs</a>.
                                All data in transit is encrypted using standard transport layer security.
                            </span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle weight="fill" className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <span><strong>Resumable Uploads:</strong> Large files are chunked (20MB) and uploaded securely to ensure reliability.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle weight="fill" className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <span><strong>Ephemeral Storage:</strong> Files are automatically deleted after expiration or 1 download (if configured).</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle weight="fill" className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <span><strong>Rate Limiting:</strong> We implement intelligent rate limiting at the application level to prevent abuse and denial-of-service attacks.</span>
                        </li>
                    </ul>
                </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
