class Company {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.domain = data.domain || '';
    this.logo_url = data.logo_url || null;
    this.proxy_url = data.proxy_url || null;
    this.imgbb_id = data.imgbb_id || null;
    this.imgbb_url = data.imgbb_url || null; // Full ImgBB URL for proxy retrieval
    this.imgbb_delete_url = data.imgbb_delete_url || null;
    this.logo_data = data.logo_data || null; // For local storage fallback
    this.logo_format = data.logo_format || null;
    this.logo_size = data.logo_size || null;
    this.logo_width = data.logo_width || null;
    this.logo_height = data.logo_height || null;
    this.extracted_at = data.extracted_at || null;
    this.updated_at = data.updated_at || null;
    this.created_at = data.created_at || null;
  }

  // Validation methods
  isValid() {
    return this.validateName() && this.validateDomain();
  }

  validateName() {
    return this.name && this.name.trim().length > 0;
  }

  validateDomain() {
    if (!this.domain) return false;
    
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,})+$/;
    return domainRegex.test(this.domain.toLowerCase());
  }

  // Normalize domain (remove protocol, www, trailing slash)
  static normalizeDomain(domain) {
    if (!domain) return '';
    
    let normalized = domain.toLowerCase().trim();
    
    // Remove protocol
    normalized = normalized.replace(/^https?:\/\//, '');
    
    // Remove www
    normalized = normalized.replace(/^www\./, '');
    
    // Remove trailing slash and path
    normalized = normalized.split('/')[0];
    
    // Remove port number
    normalized = normalized.split(':')[0];
    
    return normalized;
  }

  // Generate potential logo URLs based on domain
  static generateLogoUrls(domain) {
    const normalizedDomain = this.normalizeDomain(domain);
    
    return [
      `https://${normalizedDomain}/favicon.ico`,
      `https://www.${normalizedDomain}/favicon.ico`,
      `https://${normalizedDomain}/logo.png`,
      `https://${normalizedDomain}/logo.svg`,
      `https://${normalizedDomain}/assets/logo.png`,
      `https://${normalizedDomain}/assets/images/logo.png`,
      `https://${normalizedDomain}/static/logo.png`,
      `https://${normalizedDomain}/images/logo.png`,
      `https://${normalizedDomain}/img/logo.png`,
      `https://logo.clearbit.com/${normalizedDomain}`,
      `https://unavatar.io/${normalizedDomain}`,
      `https://logo.uplead.com/${normalizedDomain}`,
    ];
  }

  // Convert to JSON (excluding binary data for API responses)
  toJSON(includeBinaryData = false) {
    const json = {
      id: this.id,
      name: this.name,
      domain: this.domain,
      logo_url: this.proxy_url || this.logo_url, // Prefer proxy URL
      original_url: this.logo_url,
      logo_format: this.logo_format,
      logo_size: this.logo_size,
      logo_width: this.logo_width,
      logo_height: this.logo_height,
      extracted_at: this.extracted_at,
      updated_at: this.updated_at,
      created_at: this.created_at,
      cloud_storage: {
        enabled: !!this.imgbb_id,
        provider: this.imgbb_id ? 'ImgBB' : 'Local'
      }
    };

    if (includeBinaryData && this.logo_data) {
      json.logo_data = this.logo_data;
    }

    return json;
  }

  // Create company from domain
  static fromDomain(domain, name = null) {
    const normalizedDomain = this.normalizeDomain(domain);
    
    return new Company({
      name: name || this.extractCompanyNameFromDomain(normalizedDomain),
      domain: normalizedDomain
    });
  }

  // Extract company name from domain
  static extractCompanyNameFromDomain(domain) {
    const normalizedDomain = this.normalizeDomain(domain);
    const parts = normalizedDomain.split('.');
    
    // Get the main part (before the TLD)
    const mainPart = parts[0];
    
    // Capitalize first letter
    return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
  }

  // Get logo data URL for embedding
  getLogoDataUrl() {
    if (!this.logo_data || !this.logo_format) {
      return null;
    }

    const base64Data = Buffer.from(this.logo_data).toString('base64');
    return `data:image/${this.logo_format};base64,${base64Data}`;
  }

  // Check if company has a valid logo
  hasLogo() {
    return !!(this.proxy_url || this.logo_url || this.logo_data);
  }

  // Get the best logo URL (proxy preferred)
  getBestLogoUrl() {
    return this.proxy_url || this.logo_url;
  }

  // Check if using cloud storage
  isUsingCloudStorage() {
    return !!this.imgbb_id;
  }

  // Get display name
  getDisplayName() {
    return this.name || Company.extractCompanyNameFromDomain(this.domain);
  }
}

module.exports = Company;