const { Pool } = require('pg');

class CloudDatabaseService {
  constructor() {
    this.config = this.getDbConfig();
    this.pool = null;
    this.connected = false;
  }

  // Get database configuration based on environment
  getDbConfig() {
    const dbType = process.env.DB_TYPE || 'sqlite'; // sqlite, postgres, mysql
    
    switch (dbType.toLowerCase()) {
      case 'postgres':
      case 'postgresql':
        return {
          type: 'postgres',
          connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
          config: {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME || 'company_logos',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
          }
        };
      
      case 'supabase':
        return {
          type: 'postgres',
          connectionString: process.env.SUPABASE_DB_URL,
          config: {
            host: process.env.SUPABASE_HOST,
            port: 5432,
            database: 'postgres',
            user: 'postgres',
            password: process.env.SUPABASE_PASSWORD,
            ssl: { rejectUnauthorized: false },
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
          }
        };
      
      case 'neon':
        return {
          type: 'postgres',
          connectionString: process.env.NEON_DATABASE_URL,
          config: {
            ssl: { rejectUnauthorized: false },
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
          }
        };
      
      default:
        return {
          type: 'sqlite',
          file: process.env.DB_PATH || './data/companies.db'
        };
    }
  }

  // Initialize database connection
  async initialize() {
    if (this.config.type === 'sqlite') {
      // Keep existing SQLite functionality
      const { initializeDatabase } = require('../database/database');
      await initializeDatabase();
      this.connected = true;
      return;
    }

    // For PostgreSQL-based databases
    try {
      const connectionConfig = this.config.connectionString 
        ? { connectionString: this.config.connectionString, ...this.config.config }
        : this.config.config;

      this.pool = new Pool(connectionConfig);
      
      // Test connection
      const client = await this.pool.connect();
      console.log('✅ Connected to cloud PostgreSQL database');
      
      // Create tables if they don't exist
      await this.createTables(client);
      
      client.release();
      this.connected = true;
    } catch (error) {
      console.error('❌ Cloud database connection failed:', error.message);
      throw error;
    }
  }

  // Create PostgreSQL tables
  async createTables(client) {
    const createCompaniesTable = `
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        domain VARCHAR(255) UNIQUE NOT NULL,
        logo_url TEXT,
        imgbb_id VARCHAR(255),
        imgbb_url TEXT,
        imgbb_delete_url TEXT,
        proxy_url TEXT,
        logo_format VARCHAR(50),
        logo_size INTEGER,
        logo_width INTEGER,
        logo_height INTEGER,
        extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createLogoAttemptsTable = `
      CREATE TABLE IF NOT EXISTS logo_attempts (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        attempt_url TEXT NOT NULL,
        success BOOLEAN DEFAULT FALSE,
        error_message TEXT,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(domain);
      CREATE INDEX IF NOT EXISTS idx_companies_updated_at ON companies(updated_at);
      CREATE INDEX IF NOT EXISTS idx_logo_attempts_company_id ON logo_attempts(company_id);
    `;

    await client.query(createCompaniesTable);
    await client.query(createLogoAttemptsTable);
    await client.query(createIndexes);
    
    // Add missing columns if they don't exist (migration)
    try {
      await client.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS imgbb_url TEXT');
      console.log('✅ Cloud database schema updated');
    } catch (error) {
      console.log('ℹ️  Schema migration not needed or failed:', error.message);
    }
    
    console.log('✅ Cloud database tables initialized');
  }

  // Company operations for cloud database
  async createCompany(companyData) {
    if (this.config.type === 'sqlite') {
      const { companyDb } = require('../database/database');
      return companyDb.create(companyData);
    }

    const query = `
      INSERT INTO companies (name, domain, logo_url, imgbb_id, imgbb_url, imgbb_delete_url, proxy_url, logo_format, logo_size, logo_width, logo_height)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      companyData.name,
      companyData.domain,
      companyData.logo_url,
      companyData.imgbb_id,
      companyData.imgbb_url,
      companyData.imgbb_delete_url,
      companyData.proxy_url,
      companyData.logo_format,
      companyData.logo_size,
      companyData.logo_width,
      companyData.logo_height
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findByDomain(domain) {
    if (this.config.type === 'sqlite') {
      const { companyDb } = require('../database/database');
      return companyDb.findByDomain(domain);
    }

    const query = 'SELECT * FROM companies WHERE domain = $1';
    const result = await this.pool.query(query, [domain]);
    return result.rows[0];
  }

  async findById(id) {
    if (this.config.type === 'sqlite') {
      const { companyDb } = require('../database/database');
      return companyDb.findById(id);
    }

    const query = 'SELECT * FROM companies WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async updateCompany(id, updateData) {
    if (this.config.type === 'sqlite') {
      const { companyDb } = require('../database/database');
      return companyDb.updateLogo(id, updateData);
    }

    const fields = Object.keys(updateData).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const query = `UPDATE companies SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;
    const values = [id, ...Object.values(updateData)];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getAllCompanies(limit = 50, offset = 0) {
    if (this.config.type === 'sqlite') {
      const { companyDb } = require('../database/database');
      return companyDb.getAll(limit, offset);
    }

    const query = 'SELECT * FROM companies ORDER BY updated_at DESC LIMIT $1 OFFSET $2';
    const result = await this.pool.query(query, [limit, offset]);
    return result.rows;
  }

  async deleteCompany(id) {
    if (this.config.type === 'sqlite') {
      const { companyDb } = require('../database/database');
      return companyDb.delete(id);
    }

    const query = 'DELETE FROM companies WHERE id = $1 RETURNING *';
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  // Logo attempts operations
  async logAttempt(companyId, attemptUrl, success, errorMessage = null) {
    if (this.config.type === 'sqlite') {
      const { logoAttemptsDb } = require('../database/database');
      return logoAttemptsDb.logAttempt(companyId, attemptUrl, success, errorMessage);
    }

    const query = `
      INSERT INTO logo_attempts (company_id, attempt_url, success, error_message)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [companyId, attemptUrl, success, errorMessage]);
    return result.rows[0];
  }

  async getAttemptsByCompanyId(companyId) {
    if (this.config.type === 'sqlite') {
      const { logoAttemptsDb } = require('../database/database');
      return logoAttemptsDb.getByCompanyId(companyId);
    }

    const query = 'SELECT * FROM logo_attempts WHERE company_id = $1 ORDER BY attempted_at DESC';
    const result = await this.pool.query(query, [companyId]);
    return result.rows;
  }

  // Get database info
  getDatabaseInfo() {
    return {
      type: this.config.type,
      connected: this.connected,
      provider: this.getProviderName(),
      features: this.getFeatures(),
    };
  }

  getProviderName() {
    if (this.config.type === 'sqlite') return 'SQLite (Local)';
    
    const url = this.config.connectionString || '';
    if (url.includes('supabase')) return 'Supabase (PostgreSQL)';
    if (url.includes('neon')) return 'Neon (PostgreSQL)';
    if (url.includes('railway')) return 'Railway (PostgreSQL)';
    if (url.includes('planetscale')) return 'PlanetScale (MySQL)';
    
    return 'PostgreSQL (Cloud)';
  }

  getFeatures() {
    const baseFeatures = {
      transactions: true,
      indexes: true,
      constraints: true,
      backups: this.config.type !== 'sqlite',
    };

    if (this.config.type === 'sqlite') {
      return {
        ...baseFeatures,
        scalability: 'Limited',
        concurrent_users: 'Low',
        storage: 'Local file',
      };
    }

    return {
      ...baseFeatures,
      scalability: 'High',
      concurrent_users: 'High',
      storage: 'Cloud',
      ssl: true,
      connection_pooling: true,
    };
  }

  // Close connection
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.connected = false;
      console.log('🔌 Cloud database connection closed');
    }
  }
}

module.exports = CloudDatabaseService;
