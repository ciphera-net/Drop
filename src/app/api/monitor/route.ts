import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendSlackAlert } from '@/lib/slack';
import { subHours } from 'date-fns';

export async function GET(request: Request) {
  // 1. Security Check
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const startTime = Date.now();
  
  // --- METRICS GATHERING ---
  
  // 1. Storage & File Stats
  const { data: fileStats, error: fileError } = await supabase
    .from('uploads')
    .select('size, created_at')
    .eq('file_deleted', false);
    
  // 2. User Stats
  const { data: userStats, error: userError } = await supabase
    .from('user_verifications') // Using this as proxy for "Users" since auth.users isn't directly queryable easily
    .select('created_at');

  // 3. Rate Limit / Security Check
  const { count: rateLimitCount } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true });

  if (fileError || userError) {
      console.error("Monitor Error:", fileError, userError);
      return NextResponse.json({ status: 'unhealthy', error: 'DB Read Failed' }, { status: 500 });
  }

  // --- ANALYSIS ---
  
  // A. Storage
  const activeCount = fileStats?.length || 0;
  const totalSizeBytes = fileStats?.reduce((acc, curr) => acc + curr.size, 0) || 0;
  const totalSizeGB = (totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2);
  
  // B. Growth (Last 24h)
  const oneDayAgo = subHours(new Date(), 24);
  const newFiles24h = fileStats?.filter(f => new Date(f.created_at) > oneDayAgo).length || 0;
  const newUsers24h = userStats?.filter(u => new Date(u.created_at) > oneDayAgo).length || 0;
  const totalUsers = userStats?.length || 0;

  // --- REPORTING ---

  const statusColor = '#36a64f'; // Green
  const statusMsg = 'System Operational';

  await sendSlackAlert(
    'Daily System Status',
    `Ciphera Drop is running smoothly.`,
    statusColor,
    [
      { title: '📦 Storage Usage', value: `${totalSizeGB} GB (${activeCount} active files)`, short: true },
      { title: '👥 Total Users', value: `${totalUsers}`, short: true },
      { title: '📈 New Files (24h)', value: `${newFiles24h}`, short: true },
      { title: '👤 New Users (24h)', value: `${newUsers24h}`, short: true },
      { title: '🛡️ Active Rate Limits', value: `${rateLimitCount || 0} IPs tracked`, short: true },
      { title: '⏱️ Response Time', value: `${Date.now() - startTime}ms`, short: true },
      { title: 'Environment', value: process.env.NODE_ENV || 'development', short: true }
    ]
  );

  return NextResponse.json({ 
    status: 'healthy', 
    storage: { gb: totalSizeGB, files: activeCount },
    growth_24h: { files: newFiles24h, users: newUsers24h },
    security: { rate_limits: rateLimitCount }
  });
}

