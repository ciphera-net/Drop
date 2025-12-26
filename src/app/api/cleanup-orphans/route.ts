import { NextResponse } from 'next/server';
import { identifyAndCleanupOrphans } from '@/lib/storage-cleanup';
import { sendSlackAlert } from '@/lib/slack';

export async function POST(request: Request) {
  // 1. Security Check
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const dryRun = url.searchParams.get('dryRun') === 'true';

    const results = await identifyAndCleanupOrphans(dryRun);

    // 2. Send Slack Alert (to separate channel if configured)
    // We use a specific environment variable for this webhook
    const orphanWebhookUrl = process.env.SLACK_ORPHAN_CLEANUP_WEBHOOK_URL;
    
    if (orphanWebhookUrl) {
        // Only alert if action was taken or it's a dry run that found something?
        // Usually, we want to know it ran.
        // But if it runs daily and finds nothing, maybe silence is golden?
        // User asked for a separate channel, implying they want visibility.
        // Let's report if found > 0 OR if errors > 0.
        
        const hasIssues = results.found_orphans > 0 || results.errors_count > 0;
        
        if (hasIssues) {
            const title = dryRun ? '🔍 Orphan Scan Report (Dry Run)' : '🧹 Storage Orphan Cleanup';
            const color = results.errors_count > 0 ? '#ff0000' : (results.found_orphans > 0 ? '#ffcc00' : '#36a64f');
            
            await sendSlackAlert(
                title,
                `Identified ${results.found_orphans} orphans. Deleted: ${results.deleted_count}. Errors: ${results.errors_count}.`,
                color,
                [
                    { title: 'Found', value: results.found_orphans.toString(), short: true },
                    { title: 'Deleted', value: results.deleted_count.toString(), short: true },
                    { title: 'Errors', value: results.errors_count.toString(), short: true },
                    { title: 'Mode', value: dryRun ? 'Dry Run' : 'Live', short: true }
                ],
                orphanWebhookUrl
            );
        }
    }

    return NextResponse.json({ success: true, ...results });
  } catch (error: any) {
    // Attempt to notify about the crash too
    const orphanWebhookUrl = process.env.SLACK_ORPHAN_CLEANUP_WEBHOOK_URL;
    if (orphanWebhookUrl) {
         await sendSlackAlert(
            '🚨 Cleanup Job Failed',
            `The orphan cleanup job crashed: ${error.message}`,
            '#ff0000',
            undefined,
            orphanWebhookUrl
        );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
