import { PGPService } from './src/lib/pgp';

async function run() {
  const email = 'mubaig@proton.me';
  console.log(`Looking up key for ${email}...`);
  
  const key = await PGPService.lookupPublicKey(email);
  
  if (key) {
    console.log('✅ SUCCESS! Found key:');
    console.log(key.substring(0, 50) + '...');
  } else {
    console.log('❌ FAILED: No key found.');
  }
}

run();
