'use client'

import { useState } from 'react'
import { downloadFile } from '../lib/api/download'
import { decryptFile, decryptString, base64ToArrayBuffer } from '../lib/crypto/encryption'
import { decodeKeyFromSharing, importEncryptionKey } from '../lib/crypto/key-management'

interface DownloadPageProps {
  shareId: string
  encryptionKey?: string // From URL hash
}

export default function DownloadPage({ shareId, encryptionKey }: DownloadPageProps) {
  const [password, setPassword] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filename, setFilename] = useState<string | null>(null)
  const [isBurned, setIsBurned] = useState(false)

  const handleDownload = async (keyFromHash?: string) => {
    const key = keyFromHash || encryptionKey
    if (!key) {
      setError('Encryption key is required')
      return
    }

    setDownloading(true)
    setError(null)

    try {
      // * Download encrypted file
      const response = await downloadFile(shareId, password || undefined)

      if (response.oneTimeDownload) {
        setIsBurned(true)
      }

      // * Decode encryption key
      const decodedKey = decodeKeyFromSharing(key)
      const cryptoKey = await importEncryptionKey(decodedKey)

      // * Decrypt file
      const { decrypted } = await decryptFile(
        response.encryptedData,
        decodedKey,
        new Uint8Array(response.iv)
      )

      // * Decrypt filename
      const decryptedFilename = await decryptString(
        base64ToArrayBuffer(response.filename),
        cryptoKey,
        new Uint8Array(response.iv)
      )

      setFilename(decryptedFilename)

      // * Create download link
      const blob = new Blob([decrypted])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = decryptedFilename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Download File</h1>
        <p className="text-neutral-600">
          Share ID: {shareId}
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {filename && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            Downloaded: {filename}
          </p>
        </div>
      )}

      {isBurned && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-800 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
            </svg>
            This file has been burned and is no longer available.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Password (if required)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password if file is protected"
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
            disabled={downloading || isBurned}
          />
        </div>

        <button
          onClick={() => handleDownload()}
          disabled={downloading || !encryptionKey || isBurned}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? 'Downloading...' : isBurned ? 'File Burned' : 'Download File'}
        </button>
      </div>

      {!encryptionKey && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Encryption key not found. Please use the full share link.
          </p>
        </div>
      )}
    </div>
  )
}
