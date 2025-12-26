import { NextResponse } from 'next/server';
import { PGPService } from '@/lib/pgp';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const key = await PGPService.lookupPublicKey(email);
    
    return NextResponse.json({ 
        hasKey: !!key,
        provider: email.endsWith('@proton.me') || email.endsWith('@protonmail.com') || email.endsWith('@pm.me') ? 'Proton Mail' : 'WKD'
    });

  } catch (error) {
    console.error('WKD check error:', error);
    return NextResponse.json({ hasKey: false }, { status: 500 });
  }
}

