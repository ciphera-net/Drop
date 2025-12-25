import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/d/', '/r/', '/dashboard/', '/api/'],
    },
    sitemap: 'https://drop.ciphera.net/sitemap.xml',
  };
}

