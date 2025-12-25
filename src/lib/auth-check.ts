
import { SupabaseClient } from '@supabase/supabase-js';

export class UserNotVerifiedError extends Error {
  constructor(message = 'User is not verified.') {
    super(message);
    this.name = 'UserNotVerifiedError';
  }
}

/**
 * Checks if the currently authenticated user is verified.
 * If the user is not logged in, this function does NOT throw (it returns null for userId).
 * If the user is logged in but not verified, it throws UserNotVerifiedError.
 * 
 * @param supabase The Supabase client instance
 * @returns Object containing the user if verified, or null if not logged in.
 * @throws UserNotVerifiedError if logged in but not verified.
 */
export async function requireVerifiedUser(supabase: SupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return null; // Not logged in
  }

  // Check verification status
  const { data: verification, error: dbError } = await supabase
    .from('user_verifications')
    .select('is_verified')
    .eq('user_id', user.id)
    .single();

  if (dbError) {
    console.error('Error fetching verification status:', dbError);
    // Fail closed if we can't check status, or maybe open? 
    // Safer to fail closed for security features.
    throw new Error('Failed to verify user status');
  }

  if (!verification || !verification.is_verified) {
    throw new UserNotVerifiedError();
  }

  return user;
}

