import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/utils/supabase/server";

export default async function FaqPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const faqs = [
    {
      question: "Is Drop truly secure?",
      answer: "Yes. Security is our top priority. All files are encrypted at rest and in transit. We use industry-standard encryption protocols to ensure that your data remains private and secure from unauthorized access."
    },
    {
      question: "What is 'Burn on Read'?",
      answer: "Burn on Read is a security feature that automatically deletes a file immediately after it has been downloaded once. This ensures that sensitive information can only be accessed by the intended recipient and leaves no trace behind."
    },
    {
      question: "What are Magic Words?",
      answer: "Magic Words are a human-readable alternative to complex URLs. Instead of sharing a long, random link, you can share three simple words (e.g., 'correct-horse-battery') that uniquely identify your file, making it easier to share verbally or in text."
    },
    {
      question: "How long are files kept?",
      answer: "By default, files are kept until they reach their expiration time or download limit. Once a file expires or is fully consumed (e.g., via Burn on Read), it is permanently deleted from our servers and cannot be recovered."
    },
    {
      question: "Is there a file size limit?",
      answer: "Yes, to ensure fair usage and optimal performance for everyone, there are limits on file sizes. These limits may vary depending on server configuration, but we strive to support large file transfers for your convenience."
    },
    {
      question: "Can I delete a file before it expires?",
      answer: "Absolutely. If you are logged in, you can manage your uploads via the dashboard and delete any active file instantly. Once deleted, the file is immediately removed from storage."
    },
    {
      question: "What file types are allowed?",
      answer: "Drop supports all file types. Whether you're sharing documents, images, videos, or archives, you can upload them securely. However, we strictly prohibit illegal content or malware distribution."
    },
    {
      question: "Is Drop free to use?",
      answer: "Yes, Drop is free to use for secure file sharing. We believe privacy is a right, not a premium feature. We may offer premium tiers in the future for advanced features, but the core secure sharing will always be accessible."
    },
    {
      question: "Do you track what I upload?",
      answer: "No. We have a strict privacy policy. We do not scan your files for advertising purposes, sell your data, or track your sharing habits. We store only the minimum metadata required to facilitate the transfer."
    },
    {
      question: "How do I report illegal content?",
      answer: "We have zero tolerance for illegal content. If you encounter a file that violates our terms of service or local laws, please contact us immediately. We have mechanisms in place to review and remove such content swiftly."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <SiteHeader user={user} />
      
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-16 md:py-24">
        
        <section className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6">
            Frequently Asked <span className="text-primary">Questions</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about securely sharing files with Drop.
          </p>
        </section>

        <section className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="p-6 rounded-lg border border-border bg-card text-card-foreground shadow-sm">
              <h3 className="text-lg font-semibold mb-3 text-foreground">{faq.question}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {faq.answer}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-16 text-center bg-muted/30 rounded-2xl p-8 md:p-12">
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

