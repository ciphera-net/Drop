'use client'

import { useState } from 'react'
import FileUpload from '../components/FileUpload'
import ShareLink from '../components/ShareLink'

export default function HomePage() {
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  return (
    <main className="min-h-screen flex items-center justify-center p-4 py-12 relative overflow-hidden bg-neutral-50/50">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-brand-orange/5 to-transparent opacity-50" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <div className="max-w-2xl w-full space-y-8 relative z-10">
        <div className="text-center space-y-4">
          <div className="inline-block p-3 rounded-2xl bg-brand-orange/10 mb-2">
            <svg 
              className="w-10 h-10 text-brand-orange" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-neutral-900">
            Drop
          </h1>
          <p className="text-lg md:text-xl text-neutral-600 max-w-md mx-auto leading-relaxed">
            Privacy-first file sharing.<br/>
            <span className="text-neutral-400">We cannot see what you upload.</span>
          </p>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl shadow-brand-orange/5 border border-neutral-100/50 backdrop-blur-sm">
          {shareUrl ? (
            <ShareLink shareUrl={shareUrl} onReset={() => setShareUrl(null)} />
          ) : (
            <FileUpload onUploadComplete={setShareUrl} />
          )}
        </div>
      </div>
    </main>
  )
}
