'use client'

import { useState, useCallback } from 'react'
import { encryptFile, encryptString, arrayBufferToBase64 } from '../lib/crypto/encryption'
import { encodeKeyForSharing } from '../lib/crypto/key-management'
import { uploadFile } from '../lib/api/upload'
import type { UploadRequest } from '../lib/types/api'
import { MAX_FILE_SIZE } from '../lib/constants'

interface FileUploadProps {
  onUploadComplete?: (shareUrl: string) => void
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [expirationDays, setExpirationDays] = useState(7)
  const [password, setPassword] = useState('')
  const [downloadLimit, setDownloadLimit] = useState<number | undefined>()
  const [oneTimeDownload, setOneTimeDownload] = useState(false)

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return
    
    const fileArray = Array.from(selectedFiles)
    const validFiles: File[] = []
    let errorMsg: string | null = null

    fileArray.forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        errorMsg = `File ${file.name} is too large. Max size is 5GB.`
      } else {
        validFiles.push(file)
      }
    })

    if (errorMsg) {
      setError(errorMsg)
    } else {
      setError(null)
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles])
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleUpload = useCallback(async () => {
    if (files.length === 0) {
      setError('Please select at least one file')
      return
    }

    setUploading(true)
    setError(null)
    setProgress(0)

    try {
      // * For now, upload the first file (multi-file support will be added later)
      const file = files[0]

      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File ${file.name} is too large. Max size is 5GB.`)
      }

      // * Encrypt file
      const { encrypted, iv, key } = await encryptFile(file)

      // * Encrypt filename
      const encryptedFilenameBuffer = await encryptString(
        file.name,
        key.key,
        iv
      )
      const encryptedFilename = arrayBufferToBase64(encryptedFilenameBuffer)

      // * Prepare upload request
      const uploadRequest: UploadRequest = {
        file,
        encryptedData: encrypted,
        encryptedFilename,
        iv,
        expirationDays,
        password: password || undefined,
        downloadLimit: downloadLimit || undefined,
        oneTimeDownload,
      }

      // * Upload to backend
      const response = await uploadFile(uploadRequest, (progress) => {
        setProgress(progress)
      })

      // * Generate share URL with encryption key
      const encodedKey = encodeKeyForSharing(key.raw)
      const shareUrl = `${window.location.origin}/${response.shareId}#${encodedKey}`

      setProgress(100)

      if (onUploadComplete) {
        onUploadComplete(shareUrl)
      } else {
        // * Copy to clipboard
        await navigator.clipboard.writeText(shareUrl)
        alert('Share link copied to clipboard!')
      }

      // * Reset form
      setFiles([])
      setPassword('')
      setDownloadLimit(undefined)
      setOneTimeDownload(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [files, expirationDays, password, downloadLimit, oneTimeDownload, onUploadComplete])

  return (
    <div className="w-full mx-auto space-y-6">
      {/* * Drag and drop area */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="group relative border-2 border-dashed border-neutral-200 hover:border-brand-orange bg-neutral-50/50 hover:bg-brand-orange/5 rounded-2xl p-12 text-center transition-all duration-300 ease-in-out cursor-pointer"
      >
        <input
          type="file"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          id="file-input"
          disabled={uploading}
        />
        <label htmlFor="file-input" className="cursor-pointer w-full h-full block">
          <div className="space-y-4 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
              <svg 
                className="w-8 h-8 text-neutral-400 group-hover:text-brand-orange transition-colors" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="space-y-2">
              <p className="text-xl font-semibold text-neutral-700 group-hover:text-brand-orange transition-colors">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-neutral-500 max-w-xs mx-auto">
                Files are encrypted client-side before being uploaded. Maximum file size 5GB.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-400 bg-white/50 px-3 py-1.5 rounded-full border border-neutral-100">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>End-to-end encrypted</span>
            </div>
          </div>
        </label>
      </div>

      {/* * Selected files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">Selected files:</h3>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-neutral-100 rounded-lg"
            >
              <span className="text-sm truncate flex-1">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="ml-2 text-red-500 hover:text-red-700 text-sm"
                disabled={uploading}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* * Upload options */}
      {files.length > 0 && (
        <div className="space-y-4 p-4 bg-neutral-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-2">
              Expiration (days)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={expirationDays}
              onChange={(e) => setExpirationDays(parseInt(e.target.value) || 7)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
              disabled={uploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Password (optional)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Protect with password"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
              disabled={uploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Download limit (optional)
            </label>
            <input
              type="number"
              min="1"
              value={downloadLimit || ''}
              onChange={(e) =>
                setDownloadLimit(
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              placeholder="Unlimited"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
              disabled={uploading}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="one-time"
              checked={oneTimeDownload}
              onChange={(e) => setOneTimeDownload(e.target.checked)}
              className="mr-2"
              disabled={uploading}
            />
            <label htmlFor="one-time" className="text-sm">
              One-time download
            </label>
          </div>
        </div>
      )}

      {/* * Upload button */}
      {files.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? `Uploading... ${progress}%` : 'Upload & Generate Link'}
        </button>
      )}

      {/* * Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  )
}
