import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { db } from '@/lib/firebaseAdmin';
import { getBaseUrlFromHeaders } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrlFromHeaders(await headers());
  const now = new Date();

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Dynamic product routes — fetched live from Firestore
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const snapshot = await db.collection('products').select('slug', 'updatedAt', 'createdAt').get();
    productRoutes = snapshot.docs.map((doc) => {
      const data = doc.data();
      const lastMod = data.updatedAt || data.createdAt || now.toISOString();
      const slug = data.slug || doc.id;
      return {
        url: `${baseUrl}/products/${slug}`,
        lastModified: new Date(lastMod),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      };
    });
  } catch (err) {
    console.error('sitemap: failed to fetch products from Firestore', err);
  }

  return [...staticRoutes, ...productRoutes];
}
