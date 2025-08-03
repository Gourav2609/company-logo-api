const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/companies.db');

// Create database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('📁 Connected to SQLite database');
  }
});

// Initialize database with tables
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const createCompaniesTable = `
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        domain TEXT UNIQUE NOT NULL,
        logo_url TEXT,
        proxy_url TEXT,
        imgbb_id TEXT,
        imgbb_url TEXT,
        imgbb_delete_url TEXT,
        logo_data BLOB,
        logo_format TEXT,
        logo_size INTEGER,
        logo_width INTEGER,
        logo_height INTEGER,
        extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createLogoAttemptsTable = `
      CREATE TABLE IF NOT EXISTS logo_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER,
        attempt_url TEXT NOT NULL,
        success BOOLEAN DEFAULT FALSE,
        error_message TEXT,
        attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies (id)
      )
    `;

    db.serialize(() => {
      db.run(createCompaniesTable, (err) => {
        if (err) {
          console.error('Error creating companies table:', err);
          reject(err);
          return;
        }
      });

      db.run(createLogoAttemptsTable, (err) => {
        if (err) {
          console.error('Error creating logo_attempts table:', err);
          reject(err);
          return;
        }
      });

      // Add missing columns for cloud storage if they don't exist
      const addColumnsIfMissing = [
        'ALTER TABLE companies ADD COLUMN proxy_url TEXT',
        'ALTER TABLE companies ADD COLUMN imgbb_id TEXT',
        'ALTER TABLE companies ADD COLUMN imgbb_url TEXT',
        'ALTER TABLE companies ADD COLUMN imgbb_delete_url TEXT',
        'ALTER TABLE companies ADD COLUMN logo_width INTEGER',
        'ALTER TABLE companies ADD COLUMN logo_height INTEGER'
      ];

      let addedColumns = 0;
      addColumnsIfMissing.forEach((sql, index) => {
        db.run(sql, (err) => {
          addedColumns++;
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding column:', err.message);
          }
          
          // Complete when all columns are processed
          if (addedColumns === addColumnsIfMissing.length) {
            console.log('✅ Database tables initialized successfully');
            resolve();
          }
        });
      });
    });
  });
}

// Company database operations
const companyDb = {
  // Create a new company record
  create: (companyData) => {
    return new Promise((resolve, reject) => {
      const { 
        name, domain, logo_url, proxy_url, imgbb_id, imgbb_url, imgbb_delete_url,
        logo_data, logo_format, logo_size, logo_width, logo_height 
      } = companyData;
      
      const sql = `
        INSERT INTO companies (
          name, domain, logo_url, proxy_url, imgbb_id, imgbb_url, imgbb_delete_url,
          logo_data, logo_format, logo_size, logo_width, logo_height
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      db.run(sql, [
        name, domain, logo_url, proxy_url, imgbb_id, imgbb_url, imgbb_delete_url,
        logo_data, logo_format, logo_size, logo_width, logo_height
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...companyData });
        }
      });
    });
  },

  // Find company by domain
  findByDomain: (domain) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM companies WHERE domain = ?';
      db.get(sql, [domain], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  // Find company by ID
  findById: (id) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM companies WHERE id = ?';
      db.get(sql, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  // Update company logo
  updateLogo: (id, logoData) => {
    return new Promise((resolve, reject) => {
      const { logo_url, logo_data, logo_format, logo_size } = logoData;
      const sql = `
        UPDATE companies 
        SET logo_url = ?, logo_data = ?, logo_format = ?, logo_size = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      db.run(sql, [logo_url, logo_data, logo_format, logo_size, id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  },

  // Get all companies
  getAll: (limit = 50, offset = 0) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM companies ORDER BY updated_at DESC LIMIT ? OFFSET ?';
      db.all(sql, [limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  },

  // Delete company
  delete: (id) => {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM companies WHERE id = ?';
      db.run(sql, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }
};

// Logo attempts database operations
const logoAttemptsDb = {
  // Log an attempt
  logAttempt: (companyId, attemptUrl, success, errorMessage = null) => {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO logo_attempts (company_id, attempt_url, success, error_message)
        VALUES (?, ?, ?, ?)
      `;
      
      db.run(sql, [companyId, attemptUrl, success, errorMessage], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      });
    });
  },

  // Get attempts for a company
  getByCompanyId: (companyId) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM logo_attempts WHERE company_id = ? ORDER BY attempted_at DESC';
      db.all(sql, [companyId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
};

module.exports = {
  db,
  initializeDatabase,
  companyDb,
  logoAttemptsDb
};