const axios = require('axios');
const cheerio = require('cheerio');
const sharp = require('sharp');
const Company = require('../models/Company');
const CloudStorageService = require('./cloudStorage');

class LogoExtractor {
  constructor() {
    this.timeout = 10000; // 10 seconds
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
    this.supportedFormats = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'];
    this.cloudStorage = new CloudStorageService();
  }

  // Main method to extract logo for a company
  async extractLogo(domain, name = null) {
    const company = Company.fromDomain(domain, name);
    
    if (!company.isValid()) {
      throw new Error('Invalid company domain provided');
    }

    try {
      // Try multiple extraction methods
      const logoData = await this.tryMultipleExtractionMethods(company.domain);
      
      if (logoData) {
        // Upload to cloud storage (ImgBB)
        const filename = `${company.domain}_logo.${logoData.format}`;
        
        try {
          const cloudUpload = await this.cloudStorage.uploadToImgBB(logoData.buffer, filename);
          
          // Set cloud storage data
          company.logo_url = cloudUpload.original_url;
          company.imgbb_id = cloudUpload.imgbb_id;
          company.imgbb_url = cloudUpload.imgbb_full_url || cloudUpload.original_url;
          company.imgbb_delete_url = cloudUpload.delete_url;
          company.logo_format = logoData.format;
          company.logo_size = cloudUpload.size;
          company.logo_width = cloudUpload.width;
          company.logo_height = cloudUpload.height;
          
          console.log(`☁️  Logo uploaded to cloud: ${cloudUpload.imgbb_url}`);
        } catch (uploadError) {
          console.warn('Cloud upload failed, using local storage:', uploadError.message);
          
          // Fallback to local storage
          company.logo_url = logoData.url;
          company.logo_data = logoData.buffer;
          company.logo_format = logoData.format;
          company.logo_size = logoData.size;
          company.logo_width = logoData.width;
          company.logo_height = logoData.height;
        }
      }

      return company;
    } catch (error) {
      console.error(`Logo extraction failed for ${company.domain}:`, error.message);
      throw error;
    }
  }

 
  async tryMultipleExtractionMethods(domain) {
    
    const problematicDomains = [
      'mastercard.com', 'visa.com', 'amex.com', 'americanexpress.com',
      'jpmorgan.com', 'wellsfargo.com', 'bankofamerica.com',
      'cloudflare.com', 'fastly.com'
    ];
    
    const methods = [
      () => this.extractFromThirdPartyServices(domain), 
      () => this.extractFromFavicon(domain),
      () => this.extractFromCommonPaths(domain)
    ];
    
   
    if (!problematicDomains.some(pd => domain.includes(pd))) {
      methods.splice(2, 0, () => this.extractFromWebpage(domain));
    }

    for (const method of methods) {
      try {
        const result = await method();
        if (result) {
          console.log(`✅ Logo found for ${domain}: ${result.url}`);
          return result;
        }
      } catch (error) {
        console.log(`⚠️  Method failed for ${domain}: ${error.message}`);
        continue;
      }
    }

    throw new Error(`No logo found for domain: ${domain}`);
  }

  // Extract favicon
  async extractFromFavicon(domain) {
    const faviconUrls = [
      `https://${domain}/favicon.ico`,
      `https://www.${domain}/favicon.ico`,
      `https://${domain}/apple-touch-icon.png`,
      `https://${domain}/apple-touch-icon-precomposed.png`
    ];

    for (const url of faviconUrls) {
      try {
        const logoData = await this.downloadAndProcessImage(url);
        if (logoData) return logoData;
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  // Extract logo from webpage by parsing HTML
  async extractFromWebpage(domain) {
    try {
      // Better headers to avoid bot detection
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      };

      const response = await axios.get(`https://${domain}`, {
        timeout: this.timeout,
        headers,
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 400; // Accept redirects
        }
      });

      const $ = cheerio.load(response.data);
      const logoUrls = this.findLogoUrlsInHtml($, domain);

      for (const url of logoUrls) {
        try {
          const logoData = await this.downloadAndProcessImage(url);
          if (logoData) return logoData;
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      if (error.response?.status === 403) {
        console.log(` Access denied for ${domain} (403) - website blocks automated requests`);
      } else if (error.response?.status === 503) {
        console.log(` Service unavailable for ${domain} (503) - likely behind protection`);
      } else {
        console.log(`Failed to fetch webpage for ${domain}:`, error.message);
      }
    }

    return null;
  }

  findLogoUrlsInHtml($, domain) {
    const logoUrls = new Set();

    const logoSelectors = [
      'img[alt*="logo" i]',
      'img[src*="logo" i]',
      'img[class*="logo" i]',
      'img[id*="logo" i]',
      '.logo img',
      '.header-logo img',
      '.navbar-brand img',
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
      'meta[property="og:image"]'
    ];

    logoSelectors.forEach(selector => {
      $(selector).each((i, element) => {
        let url = $(element).attr('src') || $(element).attr('href') || $(element).attr('content');
        if (url) {
          url = this.resolveUrl(url, domain);
          if (this.isValidImageUrl(url)) {
            logoUrls.add(url);
          }
        }
      });
    });

    return Array.from(logoUrls).sort((a, b) => {
      const scoreA = this.calculateLogoRelevanceScore(a);
      const scoreB = this.calculateLogoRelevanceScore(b);
      return scoreB - scoreA;
    });
  }

  calculateLogoRelevanceScore(url) {
    let score = 0;
    const urlLower = url.toLowerCase();

    if (urlLower.includes('logo')) score += 10;
    
    if (urlLower.includes('.svg')) score += 8;
    if (urlLower.includes('.png')) score += 6;
    if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) score += 4;
    
  
    if (urlLower.includes('/assets/')) score += 3;
    if (urlLower.includes('/images/')) score += 3;
    if (urlLower.includes('/static/')) score += 2;
    
   
    if (urlLower.match(/\d+x\d+/) && urlLower.match(/(\d+)x\d+/)[1] < 50) score -= 5;

    return score;
  }


  async extractFromCommonPaths(domain) {
    const commonPaths = Company.generateLogoUrls(domain);

    for (const url of commonPaths) {
      try {
        const logoData = await this.downloadAndProcessImage(url);
        if (logoData) return logoData;
      } catch (error) {
        continue;
      }
    }

    return null;
  }

 
  async extractFromThirdPartyServices(domain) {
    const services = [
      `https://logo.clearbit.com/${domain}`,
      `https://unavatar.io/${domain}`,
      `https://logo.uplead.com/${domain}`,
      `https://img.logo.dev/${domain}?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ`, 
      `https://api.brandfetch.io/v2/assets/${domain}`, 
      `https://logo.devapi.ai/${domain}`, 
      `https://favicongrabber.com/api/grab/${domain}` 
    ];

    for (const url of services) {
      try {
        const logoData = await this.downloadAndProcessImage(url);
        if (logoData) return logoData;
      } catch (error) {
        continue;
      }
    }

    return null;
  }


  async downloadAndProcessImage(url, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }

        
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site',
          'Referer': `https://${new URL(url).hostname}/`
        };

        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: this.timeout,
          maxContentLength: this.maxFileSize,
          headers,
          maxRedirects: 3,
          validateStatus: function (status) {
            return status === 200; 
          }
        });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = Buffer.from(response.data);
      
   
      if (buffer.length < 100) {
        throw new Error('Image too small');
      }


      try {
        const image = sharp(buffer);
        const metadata = await image.metadata();
        
      
        if (metadata.width < 16 || metadata.height < 16) {
          throw new Error('Image dimensions too small');
        }

    
        let processedBuffer = buffer;
        let format = metadata.format;

        if (format !== 'svg') {
          if (metadata.width > 512 || metadata.height > 512) {
            processedBuffer = await image
              .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
              .png()
              .toBuffer();
            format = 'png';
          } else if (format !== 'png') {
            processedBuffer = await image.png().toBuffer();
            format = 'png';
          }
        }

        return {
          url,
          buffer: processedBuffer,
          format,
          size: processedBuffer.length,
          width: metadata.width,
          height: metadata.height
        };

      } catch (sharpError) {
        return {
          url,
          buffer,
          format: this.detectFormatFromUrl(url) || 'unknown',
          size: buffer.length
        };
      }

    } catch (error) {
      if (attempt === retries) {
        throw new Error(`Failed to download ${url} after ${retries + 1} attempts: ${error.message}`);
      }
      console.log(`Attempt ${attempt + 1} failed for ${url}, retrying...`);
    }
    }
    
    throw new Error(`Failed to download ${url} after all attempts`);
  }


  resolveUrl(url, domain) {
    if (url.startsWith('http')) {
      return url;
    } else if (url.startsWith('//')) {
      return `https:${url}`;
    } else if (url.startsWith('/')) {
      return `https://${domain}${url}`;
    } else {
      return `https://${domain}/${url}`;
    }
  }

  isValidImageUrl(url) {
    if (!url) return false;
    const urlLower = url.toLowerCase();
    return this.supportedFormats.some(format => 
      urlLower.includes(`.${format}`) || urlLower.includes(`format=${format}`)
    );
  }

  detectFormatFromUrl(url) {
    const urlLower = url.toLowerCase();
    for (const format of this.supportedFormats) {
      if (urlLower.includes(`.${format}`)) {
        return format === 'jpg' ? 'jpeg' : format;
      }
    }
    return 'png'; // default
  }
}

module.exports = LogoExtractor;