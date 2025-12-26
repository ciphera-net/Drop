# Drop

**Drop** is a secure, ephemeral file sharing service designed for privacy and simplicity. Share files securely with magic words, password protection, and automatic cleanup.

## Features

- **Ephemeral Storage**: Files are automatically deleted after a set duration or download count.
- **Secure File Requests**: Generate a secure link to receive files from anyone.
- **Magic Words**: Share files using memorable 3-word combinations (e.g., `happy-blue-tiger`) instead of complex URLs.
- **Encrypted Messages**: Securely share sensitive text or passwords that burn on read.
- **Smart PGP Notifications**: Email notifications are automatically encrypted if your provider supports WKD (e.g., ProtonMail).
- **End-to-End Encryption**: Client-side encryption ensures your files remain private.
- **Password Protection**: Add an extra layer of security with optional passwords.
- **Download Limits**: Restrict the number of times a file can be downloaded.
- **User Verification**: Verify your email to manage your uploads and file requests.
- **User Dashboard**: Manage your active uploads, delete files early, and track your file requests.
- **Download Notifications**: Get notified via email when your shared files are downloaded.
- **Rate Limiting**: Intelligent abuse prevention ensures fair usage and service availability.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Storage**: Supabase Storage

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- A Supabase project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ciphera-net/Drop.git
   cd Drop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Copy the example environment file and update it with your Supabase credentials:
   ```bash
   cp .env.example .env.local
   ```
   
   Open `.env.local` and add your:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY` (for email notifications)
   - `CRON_SECRET` (for cleanup jobs)
   - `SLACK_WEBHOOK_URL` (optional, for monitoring alerts)
   - `NEXT_PUBLIC_APP_URL` (e.g. http://localhost:3000)

4. **Run Database Migrations**
   The database schema is managed via Supabase migrations.
   
   1. Execute `supabase/schema.sql` in your Supabase SQL Editor to set up the base schema.
   2. Apply all SQL files from the `migrations/` directory in sequential order to bring the database up to date.

5. **Start the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the app.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and our code of conduct.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
