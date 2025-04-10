import { getToken } from './tokenManager.js';

(async () => {
  try {
    const githubToken = await getToken('github');
    console.log('✅ GitHub Token:', githubToken);

    const cloudflareToken = await getToken('cloudflare');
    console.log('✅ Cloudflare Token:', cloudflareToken);
  } catch (error) {
    console.error('❌ Error while testing tokens:', error);
  }
})();
