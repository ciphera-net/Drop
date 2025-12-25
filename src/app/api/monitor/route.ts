import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendSlackAlert } from '@/lib/slack';
import { subMinutes } from 'date-fns';

export async function GET(request: Request) {
  // 1. Security: Only allow Cron or Admin Secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  let statusColor: '#36a64f' | '#ff0000' | '#ffcc00' = '#36a64f';
  let statusMsg = 'All systems operational.';
  
  // --- TEST 1: Database Connectivity & Stats ---
  let activeCount = 0;
  let dbStatus = 'Unknown';
  
  try {
    const { count, error } = await supabase
        .from('uploads')
        .select('*', { count: 'exact', head: true })
        .eq('file_deleted', false);
        
    if (error) throw error;
    activeCount = count || 0;
    dbStatus = 'Connected';
  } catch (e: any) {
    dbStatus = 'Failed';
    statusColor = '#ff0000';
    statusMsg = `🚨 Critical: Database connection failed. ${e.message}`;
  }

  // --- TEST 2: Zombie File Check (Privacy Compliance) ---
  // Look for files expired more than 90 mins ago that are NOT deleted.
  // We use 90 mins to allow the hourly cleanup cron a generous buffer.
  const zombieThreshold = subMinutes(new Date(), 90).toISOString();
  let zombieCount = 0;

  try {
    const { count, error } = await supabase
      .from('uploads')
      .select('*', { count: 'exact', head: true })
      .lt('expiration_time', zombieThreshold)
      .eq('file_deleted', false);

    if (error) throw error;
    zombieCount = count || 0;

    if (zombieCount > 0) {
      statusColor = '#ff0000';
      statusMsg = `⚠️ Privacy Alert: ${zombieCount} files are expired >90mins but NOT deleted. Cleanup cron may be broken.`;
    }
  } catch (e: any) {
    // If DB failed above, this will likely fail too
    console.error("Monitor: Zombie check failed", e);
  }

  // --- REPORTING ---
  // Only send if there is an issue OR it's a "Heartbeat" (you can toggle this)
  // For now, we send it every time so you get your "Overview"
  
  await sendSlackAlert(
    statusColor === '#ff0000' ? 'System Alert' : 'System Status Report',
    statusMsg,
    statusColor,
    [
      { title: 'Database', value: dbStatus, short: true },
      { title: 'Active Files', value: activeCount.toString(), short: true },
      { title: 'Zombie Files', value: zombieCount.toString(), short: true },
      { title: 'Environment', value: process.env.NODE_ENV || 'development', short: true }
    ]
  );

  return NextResponse.json({ 
    status: statusColor === '#36a64f' ? 'healthy' : 'unhealthy', 
    db: dbStatus,
    active_files: activeCount,
    zombies: zombieCount
  });
}

