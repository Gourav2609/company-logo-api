const express = require('express');
const router = express.Router();
const LogoExtractor = require('../services/logoExtractor');
const CloudDatabaseService = require('../services/cloudDatabase');
const CloudStorageService = require('../services/cloudStorage');
const Company = require('../models/Company');

const logoExtractor = new LogoExtractor();
let cloudDb = null;
const cloudStorage = new CloudStorageService();

// Initialize cloud database
async function initCloudDb() {
  if (!cloudDb) {
    cloudDb = new CloudDatabaseService();
    await cloudDb.initialize();
  }
  return cloudDb;
}

// GET /api/logos - Get all companies with logos
router.get('/', async (req, res) => {
  try {
    const db = await initCloudDb();
    const { limit = 50, offset = 0, format } = req.query;
    const companies = await db.getAllCompanies(parseInt(limit), parseInt(offset));
    
    const response = companies.map(company => {
      const companyObj = new Company(company);
      return companyObj.toJSON(format === 'full');
    });

    res.json({
      data: response,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: response.length
      }
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to fetch companies'
    });
  }
});



// DELETE /api/logos/:id - Delete company logo
router.delete('/:id', async (req, res) => {
  try {
    const db = await initCloudDb();
    const { id } = req.params;
    
    const companyData = await db.findById(id);
    
    if (!companyData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Company not found'
      });
    }

    await db.delete(id);
    
    res.json({
      message: 'Company deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete company'
    });
  }
});

// GET /api/logos/auto/:domain - Auto-extract or return logo (Blog-friendly)
router.get('/auto/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const { size = '64', fallback = 'true' } = req.query;
    
    if (!domain) {
      return res.status(400).send('Domain required');
    }

    const db = await initCloudDb();
    const normalizedDomain = Company.normalizeDomain(domain);
    let companyData = await db.findByDomain(normalizedDomain);
    
    if (!companyData) {
      try {
        // Auto-extract for blogs
        console.log(`Auto-extracting logo for blog: ${normalizedDomain}`);
        const company = await logoExtractor.extractLogo(normalizedDomain);
        companyData = await db.createCompany(company);
        await db.logAttempt(companyData.id, company.logo_url, true);
      } catch (extractError) {
        console.error('Auto-extraction failed:', extractError);
        if (fallback === 'true') {
          return res.redirect(`https://logo.clearbit.com/${normalizedDomain}?size=${size}&fallback=default`);
        }
        return res.status(404).send('Logo not found');
      }
    }

    const company = new Company(companyData);
    
    if (company.imgbb_id) {
      try {
        const imageData = await cloudStorage.getImageFromImgBB(company.imgbb_url || company.imgbb_id);
        
        res.set({
          'Content-Type': imageData.contentType,
          'Content-Length': imageData.size,
          'Cache-Control': 'public, max-age=86400', 
          'X-Logo-API': 'company-logo-api'
        });

        return res.send(imageData.buffer);
      } catch (proxyError) {
        console.error('Proxy error:', proxyError);
        // Fall back to Clearbit if proxy fails
        if (fallback === 'true') {
          return res.redirect(`https://logo.clearbit.com/${normalizedDomain}?size=${size}&fallback=default`);
        }
      }
    }
    
    // Fallback if no imgbb_id or proxy failed
    if (fallback === 'true') {
      return res.redirect(`https://logo.clearbit.com/${normalizedDomain}?size=${size}&fallback=default`);
    }
    
    res.status(404).send('Logo not available');

  } catch (error) {
    console.error('Auto-logo error:', error);
    res.status(500).send('Server error');
  }
});



// GET /api/logos - API documentation endpoint (when no other route matches)
router.use('*', (req, res) => {
  res.json({
    name: 'Company Logo API',
    version: '1.0.0',
    description: 'Simple API for extracting and serving company logos - Perfect for Blogs',
    endpoints: {
      'GET /api/logos': 'Get all companies with logos',
      'GET /api/logos/auto/:domain': 'Auto-extract and return logo image (perfect for <img> tags)',
      'DELETE /api/logos/:id': 'Delete company logo'
    },
    blog_usage: {
      'Simple img tag': '<img src="/api/logos/auto/github.com" alt="GitHub logo">',
      'With fallback': '<img src="/api/logos/auto/github.com?fallback=true" alt="GitHub logo">',
      'Custom size': '<img src="/api/logos/auto/github.com?size=128" alt="GitHub logo">',
      'Markdown': '![GitHub logo](/api/logos/auto/github.com)'
    },
    features: [
      'Auto-extracts logos on first request',
      'Returns actual image data for <img> tags',
      'Fallback to Clearbit if extraction fails',
      'Cached for fast subsequent requests',
      'Supports ICO → PNG conversion'
    ]
  });
});

module.exports = router;