import { identifyAndCleanupOrphans } from '../src/lib/storage-cleanup';

// Mock process.env if needed
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Error: Missing Environment Variables.");
    console.error("Usage: export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/manual-cleanup.ts");
    process.exit(1);
}

async function sendSlackNotification(results: any, dryRun: boolean) {
    const webhookUrl = process.env.SLACK_ORPHAN_CLEANUP_WEBHOOK_URL;
    if (!webhookUrl) {
        console.log("No SLACK_ORPHAN_CLEANUP_WEBHOOK_URL set. Skipping notification.");
        return;
    }

    // User requested notifications even if nothing found
    const title = dryRun ? '🔍 Orphan Scan Report (Dry Run)' : '🧹 Storage Orphan Cleanup';
    const color = results.errors_count > 0 ? '#ff0000' : (results.found_orphans > 0 ? '#ffcc00' : '#36a64f');

    const message = results.found_orphans > 0 
        ? `Identified ${results.found_orphans} orphans. Deleted: ${results.deleted_count}. Errors: ${results.errors_count}.`
        : `System Healthy: No orphan files found in storage bucket.`;

    const payload = {
        username: 'Drop Monitor',
        icon_emoji: ':shield:',
        attachments: [
            {
                color: color,
                title: title,
                text: message,
                fields: [
                    { title: 'Found', value: results.found_orphans.toString(), short: true },
                    { title: 'Deleted', value: results.deleted_count.toString(), short: true },
                    { title: 'Errors', value: results.errors_count.toString(), short: true },
                    { title: 'Mode', value: dryRun ? 'Dry Run' : 'Live', short: true }
                ],
                footer: `Ciphera Drop | ${new Date().toISOString()}`
            }
        ]
    };

    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) console.log("Slack notification sent.");
        else console.error("Failed to send Slack notification:", await res.text());
    } catch (e) {
        console.error("Error sending Slack notification:", e);
    }
}

async function run() {
    console.log("Running Manual Cleanup...");
    try {
        const dryRun = process.argv.includes('--dry-run');
        
        const results = await identifyAndCleanupOrphans(dryRun);
        console.log("Cleanup Results:", JSON.stringify(results, null, 2));

        await sendSlackNotification(results, dryRun);

    } catch (e) {
        console.error("Cleanup Failed:", e);
        process.exit(1);
    }
}

run();
