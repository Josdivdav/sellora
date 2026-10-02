import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { db } from '@/lib/firebaseAdmin';
import { getBaseUrlFromHeaders } from '@/lib/siteUrl';

import { getStoreFullUrl } from '@/lib/storeUrl';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrlFromHeaders(await headers());
  const now = new Date();

  // Static public routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
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
    console.warn('sitemap: failed to fetch products from Firestore', err);
  }

  // Dynamic store storefront routes
  let storeRoutes: MetadataRoute.Sitemap = [];
  try {
    const storesSnap = await db.collection('stores').select('slug', 'name', 'updatedAt', 'joinedDate', 'isPremium', 'plan').get();
    storeRoutes = storesSnap.docs.map((doc) => {
      const data = doc.data();
      const slug = data.slug || doc.id;
      const storeUrl = getStoreFullUrl({
        slug,
        name: data.name || slug,
        isPremium: data.isPremium,
        plan: data.plan,
      });
      return {
        url: storeUrl,
        lastModified: new Date(data.updatedAt || data.joinedDate || now.toISOString()),
        changeFrequency: 'daily' as const,
        priority: 0.9,
      };
    });
  } catch (err) {
    console.warn('sitemap: failed to fetch stores from Firestore', err);
  }

  return [...staticRoutes, ...storeRoutes, ...productRoutes];
}
