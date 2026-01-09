# Drop API Documentation

## Base URL

- **Development**: `http://localhost:8080`
- **Production**: `https://drop-api.ciphera.net`

All API endpoints are prefixed with `/api/v1`.

## Authentication

Authentication is handled by the **Ciphera Auth** service (`auth.ciphera.net`) using OAuth 2.0 with PKCE.

### Base URL (Auth)
- **Development**: `http://localhost:8081`
- **Production**: `https://auth.ciphera.net`

### Token Endpoint
**Endpoint**: `POST /oauth/token`

**Request Body**:
```json
{
  "grant_type": "authorization_code",
  "code": "auth-code-from-callback",
  "client_id": "drop-app",
  "redirect_uri": "https://drop.ciphera.net/auth/callback",
  "code_verifier": "pkce-verifier-string"
}
```

### Refresh Token Endpoint
**Endpoint**: `POST /api/v1/auth/refresh`

**Request Body**:
```json
{
  "refresh_token": "your-refresh-token"
}
```

## API Endpoints (Backend)

All backend endpoints (except Health and Feedback) require the JWT token in the `Authorization` header:
`Authorization: Bearer <token>`

### File Upload (Multipart/Chunked)

For large files, use the multipart upload flow.

#### 1. Initialize Upload
**Endpoint**: `POST /api/v1/upload/init`

**Request Body**:
```json
{
  "fileSize": 104857600,
  "mimeType": "application/zip",
  "captcha_id": "optional-captcha-id",
  "captcha_solution": "optional-captcha-solution",
  "captcha_token": "optional-captcha-token"
}
```

**Response**:
```json
{
  "uploadId": "upload-session-id",
  "key": "internal-file-uuid"
}
```

#### 2. Upload Part
**Endpoint**: `POST /api/v1/upload/part`

**Query Parameters**: `uploadId`, `key`, `partNumber`

**Body**: Binary data of the chunk.

#### 3. Complete Upload
**Endpoint**: `POST /api/v1/upload/complete`

**Request Body**:
```json
{
  "uploadId": "upload-session-id",
  "key": "internal-file-uuid",
  "parts": [{ "ETag": "...", "PartNumber": 1 }],
  "encryptedFilename": "base64...",
  "iv": "base64...",
  "fileSize": 104857600,
  "mimeType": "application/zip",
  "expirationMinutes": 10080
}
```

### User Files

#### List User Files
**Endpoint**: `GET /api/v1/user/files`

#### Delete File
**Endpoint**: `DELETE /api/v1/files/:id`

### File Requests

#### Create Request
**Endpoint**: `POST /api/v1/requests`

#### Upload to Request
**Endpoint**: `POST /api/v1/requests/:requestId/upload`

#### List User Requests
**Endpoint**: `GET /api/v1/requests`

### Feedback

Submit anonymous feedback.

**Endpoint**: `POST /api/v1/feedback`

**Request Body**:
```json
{
  "message": "User feedback text",
  "captcha_token": "optional-captcha-token"
}
```

## System

#### Health Check
**Endpoint**: `GET /health`

## Encryption

All files are encrypted client-side using AES-256-GCM before upload. The encryption key is never sent to the server and is embedded in the share URL hash.
