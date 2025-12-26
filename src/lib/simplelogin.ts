import { AliasApi, SimpleLoginConfig } from 'simplelogin-client/tscBuild/src';
import { createClient } from '@/utils/supabase/client';

export class SimpleLoginService {
  
  static async getApiKey(): Promise<string | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    // First try to get from profile
    const { data, error } = await supabase
      .from('user_profiles')
      .select('simplelogin_api_key')
      .eq('id', user.id)
      .single();

    if (error || !data) return null;
    return data.simplelogin_api_key;
  }

  static async setApiKey(key: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error("User must be logged in to save API key");

    // Upsert the profile
    const { error } = await supabase
      .from('user_profiles')
      .upsert({ 
        id: user.id, 
        simplelogin_api_key: key 
      });

    if (error) throw error;
  }

  static async clearApiKey() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    await supabase
      .from('user_profiles')
      .update({ simplelogin_api_key: null })
      .eq('id', user.id);
  }

  static async createRandomAlias(apiKey: string, note: string = 'Drop File Sharing'): Promise<string> {
    const config = new SimpleLoginConfig({ apiKey });
    const aliasApi = new AliasApi(config);

    // SimpleLogin API might throw errors, we let them bubble up to be handled by the UI
    const alias = await aliasApi.createRandomAlias({ 
        aliasRandomNewPost: { note } 
    });
    return alias.email;
  }
}
