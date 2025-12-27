import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/utils/supabase/server";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frequently Asked Questions - Security, Privacy, and How Drop Works",
  description: "Frequently asked questions about Drop's security, encryption, file expiry, and privacy policies.",
  alternates: {
    canonical: '/faq',
  },
};

type FaqCategory = {
  title: string;
  items: { question: string; answer: string }[];
};

export default async function FaqPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  const faqCategories: FaqCategory[] = [
    {
      title: "General & Usage",
      items: [
        {
          question: "Is Drop free to use?",
          answer: "Yes, Drop is free to use for secure file sharing. We believe privacy is a right, not a premium feature. We may offer premium tiers in the future for advanced features, but the core secure sharing will always be accessible."
        },
        {
          question: "What file types are allowed?",
          answer: "Drop supports all file types. Whether you're sharing documents, images, videos, or archives, you can upload them securely. However, we strictly prohibit illegal content or malware distribution."
        },
        {
          question: "Is there a file size limit?",
          answer: "Yes, to ensure fair usage and optimal performance for everyone, there are limits on file sizes. These limits may vary depending on server configuration, but we strive to support large file transfers for your convenience."
        },
        {
          question: "How long are files kept?",
          answer: "By default, files are kept until they reach their expiration time or download limit. Once a file expires or is fully consumed (e.g., via Burn on Read), it is permanently deleted from our servers and cannot be recovered."
        },
        {
          question: "Can I delete a file before it expires?",
          answer: "Absolutely. If you are logged in, you can manage your uploads via the dashboard and delete any active file instantly. Once deleted, the file is immediately removed from storage."
        },
        {
          question: "Why am I seeing a 'Rate Limit Exceeded' message?",
          answer: "To ensure fair usage and prevent abuse (like denial-of-service attacks), we implement rate limiting. If you make too many requests in a short period, you may be temporarily blocked. Please wait a few minutes and try again."
        }
      ]
    },
    {
      title: "Security & Privacy",
      items: [
        {
          question: "Is Drop truly secure?",
          answer: "Yes. Security is our top priority. All files are encrypted at rest and in transit. We use industry-standard encryption protocols (AES-256-GCM) to ensure that your data remains private and secure from unauthorized access."
        },
        {
          question: "What is 'Burn on Read'?",
          answer: "Burn on Read is a security feature that automatically deletes a file immediately after it has been downloaded once. This ensures that sensitive information can only be accessed by the intended recipient and leaves no trace behind."
        },
        {
          question: "Do you track what I upload?",
          answer: "No. We have a strict privacy policy. We do not scan your files for advertising purposes, sell your data, or track your sharing habits. We store only the minimum metadata required to facilitate the transfer."
        },
        {
          question: "What is Smart PGP Support?",
          answer: "If your email provider supports Web Key Directory (WKD), like ProtonMail, Drop automatically encrypts email notifications sent to you using your public PGP key. This adds another layer of security to your communications."
        },
        {
          question: "How do I report illegal content?",
          answer: "We have zero tolerance for illegal content. If you encounter a file that violates our terms of service or local laws, please contact us immediately. We have mechanisms in place to review and remove such content swiftly."
        }
      ]
    },
    {
      title: "Features",
      items: [
        {
          question: "What are Magic Words?",
          answer: "Magic Words are a human-readable alternative to complex URLs. Instead of sharing a long, random link, you can share three simple words (e.g., 'correct-horse-battery') that uniquely identify your file, making it easier to share verbally or in text."
        },
        {
          question: "How do Secure File Requests work?",
          answer: "File Requests allow you to generate a secure link that you can send to others. When they upload a file using your link, it is encrypted using a public key generated by your browser. Only you possess the private key to decrypt and download these files."
        },
        {
          question: "Can I share passwords or text?",
          answer: "Yes. Drop supports encrypted messages. You can paste sensitive text or passwords, and we'll generate a secure link. Like files, these messages are end-to-end encrypted and can be set to burn on read."
        },
        {
          question: "Will I get notified when my file is downloaded?",
          answer: "Yes! If you are a verified user, you can opt-in to receive email notifications when your file is downloaded or when someone uploads a file to your secure request. These notifications can also be PGP-encrypted."
        }
      ]
    },
    {
      title: "Account & Settings",
      items: [
        {
          question: "What can I do in the Dashboard?",
          answer: "The Dashboard allows verified users to manage their active uploads and file requests. You can see a list of your files, check how many times they've been downloaded, and delete them early if needed. You can also manage your secure file requests."
        },
        {
          question: "Is there a limit to how much I can store?",
          answer: "Yes. Each user has a storage quota (e.g., 1GB). You can view your current usage in the Storage section of your settings. If you reach the limit, you'll need to delete old files before uploading new ones."
        },
        {
          question: "Can I save my preferred upload settings?",
          answer: "Yes! In your Profile Settings, you can set your default expiration time and download limit (e.g., always default to 'Burn on Read'). These defaults will be automatically applied to every new upload."
        },
        {
          question: "How do I manage my active sessions?",
          answer: "Go to Settings > Sessions to see a list of all devices and browsers currently logged into your account. You can revoke access to any session instantly if you don't recognize it."
        }
      ]
    }
  ];

  // Flatten FAQs for JSON-LD schema
  const allFaqs = faqCategories.flatMap(cat => cat.items);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": allFaqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader user={user} displayName={profile?.display_name} />
      
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-16 md:py-24">
        
        <section className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6">
            Frequently Asked <span className="text-primary">Questions</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about securely sharing files with Drop.
          </p>
        </section>

        <div className="space-y-16">
          {faqCategories.map((category, catIndex) => (
            <section key={catIndex} className="space-y-6">
              <h2 className="text-2xl font-bold text-foreground border-b pb-2">{category.title}</h2>
              <div className="grid gap-6 md:grid-cols-2">
                {category.items.map((faq, index) => (
                  <div key={index} className="p-6 rounded-lg border border-border bg-card text-card-foreground shadow-sm h-full">
                    <h3 className="text-lg font-semibold mb-3 text-foreground">{faq.question}</h3>
                    <p className="text-muted-foreground leading-relaxed text-sm">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-20 text-center bg-muted/30 rounded-2xl p-8 md:p-12">
          <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
          <p className="text-muted-foreground mb-6">
            We're here to help. Reach out to our support team for any other inquiries.
          </p>
          {/* Placeholder for contact link/button if needed */}
        </section>

      </main>

      <SiteFooter />
    </div>
  );
}
