import { identifyAndCleanupOrphans } from '../src/lib/storage-cleanup';

// Mock process.env if needed, but usually loading from .env is done before running this.
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Error: Missing Environment Variables.");
    console.error("Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.");
    console.error("Usage: export $(cat .env.local | xargs) && npx tsx scripts/manual-cleanup.ts");
    process.exit(1);
}

async function run() {
    console.log("Running Manual Cleanup...");
    try {
        const dryRun = process.argv.includes('--dry-run');
        
        const results = await identifyAndCleanupOrphans(dryRun);
        console.log("Cleanup Results:", JSON.stringify(results, null, 2));
    } catch (e) {
        console.error("Cleanup Failed:", e);
        process.exit(1);
    }
}

run();

