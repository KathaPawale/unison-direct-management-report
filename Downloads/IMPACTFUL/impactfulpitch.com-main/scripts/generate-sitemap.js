import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Recreate __filename and __dirname using the standard ES module method
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const baseUrl = 'https://www.impactfulpitch.com';
const outputPath = path.join(__dirname, '..', 'public', 'sitemap.xml');

// Routes with their metadata
const routes = [
  {
    url: '',
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly',
    priority: 1.0,
  },
  {
    url: '/about',
    lastModified: new Date().toISOString(),
    changeFrequency: 'monthly',
    priority: 0.9,
  },
  {
    url: '/services',
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly',
    priority: 0.9,
  },
  {
    url: '/portfolio',
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    url: '/success-stories',
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    url: '/contact',
    lastModified: new Date().toISOString(),
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    url: '/privacy-policy',
    lastModified: new Date().toISOString(),
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    url: '/terms-conditions',
    lastModified: new Date().toISOString(),
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    url: '/nikhil-parmar',
    lastModified: new Date().toISOString(),
    changeFrequency: 'monthly', // It won't change often, but it's an important page
    priority: 0.7, // A good priority for a key profile page
  },
];

// Write sitemap to file
function writeSitemap(routesToWrite) {
  try {
    // Ensure the public directory exists
    const publicDir = path.dirname(outputPath);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Generate and write the sitemap
    const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${routesToWrite
      .map(
        (route) => `  <url>
        <loc>${baseUrl}${route.url}</loc>
        <lastmod>${route.lastModified}</lastmod>
        <changefreq>${route.changeFrequency}</changefreq>
        <priority>${route.priority}</priority>
      </url>`
      )
      .join('\n')}
    </urlset>`;
    fs.writeFileSync(outputPath, sitemapXML, 'utf8');

    console.log('✅ Sitemap generated successfully!');
    console.log(`📍 Location: ${outputPath}`);
    console.log(`🔗 URLs included: ${routesToWrite.length}`);
    console.log('🌐 Preview at: http://localhost:3000/sitemap.xml');
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    process.exit(1);
  }
}

// Auto-discovery function (optional enhancement)
function discoverRoutes() {
  const appDir = path.join(__dirname, '..', 'app');
  const discoveredRoutes = [];

  function scanDirectory(dir, basePath = '') {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('_')) {
          const routePath = basePath + '/' + entry.name;
          const pagePath = path.join(dir, entry.name, 'page.tsx');

          // Check if this directory has a page.tsx
          if (fs.existsSync(pagePath)) {
            discoveredRoutes.push(routePath);
          }

          // Recursively scan subdirectories
          scanDirectory(path.join(dir, entry.name), routePath);
        }
      }
    } catch {
      // Silently ignore errors in directory scanning
    }
  }

  // Add root route
  const rootPagePath = path.join(appDir, 'page.tsx');
  if (fs.existsSync(rootPagePath)) {
    discoveredRoutes.push('');
  }

  // Scan for other routes
  scanDirectory(appDir);

  return discoveredRoutes;
}

// Enhanced version with auto-discovery
function generateEnhancedSitemap() {
  const discoveredRoutes = discoverRoutes();
  const currentTime = new Date().toISOString();

  // Create a map of configured routes for quick lookup
  const configuredRoutes = new Map(routes.map((r) => [r.url, r]));

  // Merge discovered routes with configured metadata
  const allRoutes = discoveredRoutes.map((route) => {
    const configured = configuredRoutes.get(route);

    if (configured) {
      return configured;
    } else {
      // Default metadata for discovered routes
      return {
        url: route,
        lastModified: currentTime,
        changeFrequency: 'monthly',
        priority: 0.5,
      };
    }
  });

  console.log(`🔍 Discovered ${discoveredRoutes.length} routes automatically`);

  return allRoutes;
}

// Main execution
const isMainScript = path.resolve(process.argv[1]) === path.resolve(__filename);

if (isMainScript) {
  console.log('🚀 Generating sitemap.xml...');
  const allRoutes = generateEnhancedSitemap();
  writeSitemap(allRoutes);
}

export { writeSitemap, routes, baseUrl };
