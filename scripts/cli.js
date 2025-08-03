#!/usr/bin/env node

const { program } = require('commander');
const LogoExtractor = require('../src/services/logoExtractor');
const { companyDb, initializeDatabase } = require('../src/database/database');
const Company = require('../src/models/Company');
const fs = require('fs');
const path = require('path');

const logoExtractor = new LogoExtractor();

program
  .name('company-logo-cli')
  .description('CLI tool for extracting company logos')
  .version('1.0.0');

// Extract logo command
program
  .command('extract <domain>')
  .description('Extract logo for a company domain')
  .option('-n, --name <name>', 'Company name')
  .option('-o, --output <path>', 'Output directory for logo file')
  .option('--force', 'Force re-extraction even if logo exists')
  .action(async (domain, options) => {
    try {
      await initializeDatabase();
      
      console.log(`🔍 Extracting logo for: ${domain}`);
      
      const normalizedDomain = Company.normalizeDomain(domain);
      
      // Check if already exists
      const existing = await companyDb.findByDomain(normalizedDomain);
      if (existing && !options.force) {
        console.log(`✅ Logo already exists for ${domain}`);
        console.log(`   Company: ${existing.name}`);
        console.log(`   Logo URL: ${existing.logo_url}`);
        console.log(`   Use --force to re-extract`);
        return;
      }
      
      const company = await logoExtractor.extractLogo(normalizedDomain, options.name);
      
      // Save to database
      let savedCompany;
      if (existing) {
        await companyDb.updateLogo(existing.id, {
          logo_url: company.logo_url,
          logo_data: company.logo_data,
          logo_format: company.logo_format,
          logo_size: company.logo_size
        });
        savedCompany = await companyDb.findById(existing.id);
      } else {
        savedCompany = await companyDb.create(company);
      }
      
      console.log(`✅ Logo extracted successfully!`);
      console.log(`   Company: ${savedCompany.name}`);
      console.log(`   Domain: ${savedCompany.domain}`);
      console.log(`   Logo URL: ${savedCompany.logo_url}`);
      console.log(`   Format: ${savedCompany.logo_format}`);
      console.log(`   Size: ${savedCompany.logo_size} bytes`);
      
      // Save to file if output directory specified
      if (options.output && savedCompany.logo_data) {
        const outputDir = path.resolve(options.output);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const filename = `${savedCompany.domain}.${savedCompany.logo_format}`;
        const filepath = path.join(outputDir, filename);
        
        fs.writeFileSync(filepath, savedCompany.logo_data);
        console.log(`💾 Logo saved to: ${filepath}`);
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// List companies command
program
  .command('list')
  .description('List all companies with logos')
  .option('-l, --limit <number>', 'Number of companies to show', '10')
  .action(async (options) => {
    try {
      await initializeDatabase();
      
      const companies = await companyDb.getAll(parseInt(options.limit));
      
      if (companies.length === 0) {
        console.log('No companies found.');
        return;
      }
      
      console.log(`\n📋 Found ${companies.length} companies:\n`);
      
      companies.forEach((company, index) => {
        console.log(`${index + 1}. ${company.name}`);
        console.log(`   Domain: ${company.domain}`);
        console.log(`   Logo: ${company.logo_url || 'No logo URL'}`);
        console.log(`   Format: ${company.logo_format || 'N/A'}`);
        console.log(`   Updated: ${company.updated_at}`);
        console.log('');
      });
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Get company info command
program
  .command('info <domain>')
  .description('Get information about a company')
  .action(async (domain) => {
    try {
      await initializeDatabase();
      
      const normalizedDomain = Company.normalizeDomain(domain);
      const company = await companyDb.findByDomain(normalizedDomain);
      
      if (!company) {
        console.log(`❌ No company found for domain: ${domain}`);
        return;
      }
      
      console.log(`\n📊 Company Information:\n`);
      console.log(`Name: ${company.name}`);
      console.log(`Domain: ${company.domain}`);
      console.log(`Logo URL: ${company.logo_url || 'N/A'}`);
      console.log(`Logo Format: ${company.logo_format || 'N/A'}`);
      console.log(`Logo Size: ${company.logo_size ? `${company.logo_size} bytes` : 'N/A'}`);
      console.log(`Extracted: ${company.extracted_at}`);
      console.log(`Updated: ${company.updated_at}`);
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Delete company command
program
  .command('delete <domain>')
  .description('Delete a company and its logo')
  .action(async (domain) => {
    try {
      await initializeDatabase();
      
      const normalizedDomain = Company.normalizeDomain(domain);
      const company = await companyDb.findByDomain(normalizedDomain);
      
      if (!company) {
        console.log(`❌ No company found for domain: ${domain}`);
        return;
      }
      
      await companyDb.delete(company.id);
      console.log(`✅ Deleted company: ${company.name} (${company.domain})`);
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Database migration command
program
  .command('migrate')
  .description('Initialize/migrate the database')
  .action(async () => {
    try {
      console.log('🔄 Running database migration...');
      await initializeDatabase();
      console.log('✅ Database migration completed successfully');
    } catch (error) {
      console.error(`❌ Migration failed: ${error.message}`);
      process.exit(1);
    }
  });

// Export logos command
program
  .command('export <directory>')
  .description('Export all logos to a directory')
  .action(async (directory) => {
    try {
      await initializeDatabase();
      
      const outputDir = path.resolve(directory);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const companies = await companyDb.getAll(1000); // Get all companies
      
      console.log(`📦 Exporting ${companies.length} logos to ${outputDir}...`);
      
      let exported = 0;
      for (const company of companies) {
        if (company.logo_data && company.logo_format) {
          const filename = `${company.domain}.${company.logo_format}`;
          const filepath = path.join(outputDir, filename);
          
          fs.writeFileSync(filepath, company.logo_data);
          exported++;
        }
      }
      
      console.log(`✅ Exported ${exported} logos to ${outputDir}`);
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parse();