/**
 * Upload API calls
 */

import axios from 'axios'
import type { UploadRequest, UploadResponse } from '../types/api'
import { arrayBufferToBase64 } from '../crypto/encryption'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

/**
 * Upload an encrypted file
 */
export async function uploadFile(
  request: UploadRequest,
  onProgress?: (progress: number, loaded: number, total: number) => void
): Promise<UploadResponse> {
  // * Convert encrypted data to base64 for JSON transmission
  const encryptedDataBase64 = arrayBufferToBase64(request.encryptedData)
  const ivBase64 = arrayBufferToBase64(request.iv)

  const body = {
    encryptedData: encryptedDataBase64,
    encryptedFilename: request.encryptedFilename,
    iv: ivBase64,
    fileSize: request.file.size,
    mimeType: request.file.type,
    expirationMinutes: request.expirationMinutes || 10080, // Default 7 days
    password: request.password,
    downloadLimit: request.downloadLimit,
    oneTimeDownload: request.oneTimeDownload,
    captcha_id: request.captcha_id,
    captcha_solution: request.captcha_solution,
    captcha_token: request.captcha_token,
  }

  try {
    const response = await axios.post(`${API_URL}/api/v1/upload`, body, {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percentCompleted, progressEvent.loaded, progressEvent.total)
        }
      }
    })
    return response.data
  } catch (error: any) {
    const errorMessage = error.response?.data?.details 
      ? `${error.response.data.error}: ${error.response.data.details}` 
      : (error.response?.data?.message || error.message || 'Request failed')
    throw new Error(errorMessage)
  }
}

/**
 * Upload an encrypted file to a specific request
 */
export async function uploadToRequest(
  requestId: string,
  request: UploadRequest,
  onProgress?: (progress: number, loaded: number, total: number) => void
): Promise<UploadResponse> {
  // * Convert encrypted data to base64 for JSON transmission
  const encryptedDataBase64 = arrayBufferToBase64(request.encryptedData)
  const ivBase64 = arrayBufferToBase64(request.iv)

  const body = {
    encryptedData: encryptedDataBase64,
    encryptedFilename: request.encryptedFilename,
    iv: ivBase64,
    fileSize: request.file.size,
    mimeType: request.file.type,
    // Expiration and limits are controlled by the Request config, not the uploader
    captcha_id: request.captcha_id,
    captcha_solution: request.captcha_solution,
    captcha_token: request.captcha_token,
  }

  try {
    const response = await axios.post(`${API_URL}/api/v1/requests/${requestId}/upload`, body, {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percentCompleted, progressEvent.loaded, progressEvent.total)
        }
      }
    })
    return response.data
  } catch (error: any) {
     const errorMessage = error.response?.data?.details 
      ? `${error.response.data.error}: ${error.response.data.details}` 
      : (error.response?.data?.message || error.message || 'Request failed')
    throw new Error(errorMessage)
  }
}
