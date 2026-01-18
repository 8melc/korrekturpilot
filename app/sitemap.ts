import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.korrekturpilot.de';
  const currentDate = new Date().toISOString();

  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/impressum`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/datenschutz`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/agb`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/hilfe-upload`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/beispielauswertung`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];
}







