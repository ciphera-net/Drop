import { AliasApi, SimpleLoginConfig } from 'simplelogin-client/tscBuild/src';

const STORAGE_KEY = 'simplelogin_api_key';

export class SimpleLoginService {
  static getApiKey(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
  }

  static setApiKey(key: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, key);
  }

  static clearApiKey() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  }

  static async createRandomAlias(apiKey: string, note: string = 'Drop File Sharing'): Promise<string> {
    const config = new SimpleLoginConfig({ apiKey });
    const aliasApi = new AliasApi(config);

    // SimpleLogin API might throw errors, we let them bubble up to be handled by the UI
    const alias = await aliasApi.createRandomAlias({ 
        aliasRandomNewPost: { note } 
    });
    return alias.email; // Use .email instead of .alias
  }
}

