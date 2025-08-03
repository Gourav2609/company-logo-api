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

// POST /api/logos/extract - Extract logo for a domain
router.post('/extract', async (req, res) => {
  try {
    const db = await initCloudDb();
    const { domain, name, force = false } = req.body;

    if (!domain) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Domain is required'
      });
    }

    const normalizedDomain = Company.normalizeDomain(domain);
    
    // Check if company already exists
    const existingCompany = await cloudDb.findByDomain(normalizedDomain);
    
    if (existingCompany && !force) {
      const company = new Company(existingCompany);
      return res.json({
        message: 'Logo already exists for this domain',
        data: company.toJSON(),
        cached: true
      });
    }

    // Extract logo
    console.log(`🔍 Extracting logo for: ${normalizedDomain}`);
    const company = await logoExtractor.extractLogo(normalizedDomain, name);
    
    let savedCompany;
    if (existingCompany) {
      // Update existing company
      const updateData = {
        logo_url: company.logo_url,
        proxy_url: company.proxy_url,
        imgbb_id: company.imgbb_id,
        imgbb_delete_url: company.imgbb_delete_url,
        logo_format: company.logo_format,
        logo_size: company.logo_size,
        logo_width: company.logo_width,
        logo_height: company.logo_height
      };
      
      savedCompany = await cloudDb.updateCompany(existingCompany.id, updateData);
      await cloudDb.logAttempt(existingCompany.id, company.logo_url, true);
    } else {
      // Create new company
      savedCompany = await cloudDb.createCompany(company);
      await cloudDb.logAttempt(savedCompany.id, company.logo_url, true);
    }

    const responseCompany = new Company(savedCompany);
    
    res.status(201).json({
      message: 'Logo extracted successfully',
      data: responseCompany.toJSON(),
      cached: false
    });

  } catch (error) {
    console.error('Logo extraction error:', error);
    
    // Log failed attempt if we have company info
    try {
      const normalizedDomain = Company.normalizeDomain(req.body.domain);
      const existingCompany = await cloudDb.findByDomain(normalizedDomain);
      if (existingCompany) {
        await cloudDb.logAttempt(existingCompany.id, req.body.domain, false, error.message);
      }
    } catch (logError) {
      console.error('Failed to log attempt:', logError);
    }

    res.status(422).json({
      error: 'Extraction Failed',
      message: error.message || 'Failed to extract logo for the provided domain'
    });
  }
});

// GET /api/logos/proxy/:imgbbId - Proxy endpoint to hide ImgBB URLs
router.get('/proxy/:imgbbId', async (req, res) => {
  try {
    const { imgbbId } = req.params;
    
    if (!imgbbId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Image ID is required'
      });
    }

    // First, try to find the company with this imgbb_id to get the stored URL
    const database = await initCloudDb();
    const companies = await database.getAllCompanies();
    const company = companies.find(c => c.imgbb_id === imgbbId);
    
    let imgbbUrl = null;
    if (company && company.imgbb_url) {
      imgbbUrl = company.imgbb_url;
    }

    // Get image from ImgBB through proxy (pass URL if we have it)
    const imageData = await cloudStorage.getImageFromImgBB(imgbbUrl || imgbbId);
    
    // Set appropriate headers
    res.set({
      'Content-Type': imageData.contentType,
      'Content-Length': imageData.size,
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'X-Proxy': 'company-logo-api'
    });

    res.send(imageData.buffer);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(404).json({
      error: 'Not Found',
      message: 'Image not found or unavailable'
    });
  }
});

// GET /api/logos/:id - Get specific company logo
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { format } = req.query;

    const companyData = await cloudDb.findById(id);
    
    if (!companyData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Company not found'
      });
    }

    const company = new Company(companyData);
    
    res.json({
      data: company.toJSON(format === 'full')
    });

  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch company'
    });
  }
});

// GET /api/logos/:id/image - Get logo image file
router.get('/:id/image', async (req, res) => {
  try {
    const { id } = req.params;
    
    const companyData = await companyDb.findById(id);
    
    if (!companyData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Company not found'
      });
    }

    const company = new Company(companyData);
    
    if (!company.logo_data) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Logo image not found for this company'
      });
    }

    // Set appropriate content type
    const contentType = company.logo_format === 'svg' ? 'image/svg+xml' : `image/${company.logo_format}`;
    
    res.set({
      'Content-Type': contentType,
      'Content-Length': company.logo_size,
      'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
    });

    res.send(company.logo_data);

  } catch (error) {
    console.error('Error serving logo image:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to serve logo image'
    });
  }
});

// GET /api/logos/domain/:domain - Get company by domain
router.get('/domain/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const { format } = req.query;
    
    const normalizedDomain = Company.normalizeDomain(domain);
    const companyData = await companyDb.findByDomain(normalizedDomain);
    
    if (!companyData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Company not found for this domain'
      });
    }

    const company = new Company(companyData);
    
    res.json({
      data: company.toJSON(format === 'full')
    });

  } catch (error) {
    console.error('Error fetching company by domain:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch company'
    });
  }
});

// DELETE /api/logos/:id - Delete company logo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const companyData = await companyDb.findById(id);
    
    if (!companyData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Company not found'
      });
    }

    await companyDb.delete(id);
    
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

// GET /api/logos/:id/attempts - Get extraction attempts for a company
router.get('/:id/attempts', async (req, res) => {
  try {
    const { id } = req.params;
    
    const companyData = await companyDb.findById(id);
    
    if (!companyData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Company not found'
      });
    }

    const attempts = await logoAttemptsDb.getByCompanyId(id);
    
    res.json({
      data: attempts
    });

  } catch (error) {
    console.error('Error fetching attempts:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch extraction attempts'
    });
  }
});

// GET /api/logos - API documentation endpoint (when no other route matches)
router.use('*', (req, res) => {
  res.json({
    name: 'Company Logo API',
    version: '1.0.0',
    description: 'API for extracting and managing company logos',
    endpoints: {
      'GET /api/logos': 'Get all companies with logos',
      'POST /api/logos/extract': 'Extract logo for a domain',
      'GET /api/logos/:id': 'Get specific company logo',
      'GET /api/logos/:id/image': 'Get logo image file',
      'GET /api/logos/domain/:domain': 'Get company by domain',
      'DELETE /api/logos/:id': 'Delete company logo',
      'GET /api/logos/:id/attempts': 'Get extraction attempts for a company'
    },
    examples: {
      extract: {
        method: 'POST',
        url: '/api/logos/extract',
        body: {
          domain: 'example.com',
          name: 'Example Company',
          force: false
        }
      }
    }
  });
});

module.exports = router;