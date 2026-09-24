import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { getBaseUrlFromHeaders } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = getBaseUrlFromHeaders(await headers());

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/account/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
