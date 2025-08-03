# Company Logo API 🏢✨

A fast, reliable REST API for extracting and serving company logos with cloud storage and format conversion.

## Features 🚀

- **Logo Extraction**: Automatic logo detection from websites
- **Format Conversion**: ICO → PNG conversion using `icojs`
- **Cloud Storage**: ImgBB integration for unlimited image storage
- **Database**: Neon PostgreSQL for fast, reliable data storage
- **Proxy URLs**: Hide third-party storage URLs behind your API
- **Multiple Sources**: Clearbit, favicons, social media fallbacks

## Quick Start 🏃‍♂️

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd company-logo-api
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your credentials
```

Required environment variables:
- `NEON_DATABASE_URL`: Your Neon PostgreSQL database URL
- `IMGBB_API_KEY`: Your ImgBB API key (free at imgbb.com)

### 3. Deploy
```bash
npm start
```

## API Endpoints 📡

### Extract Logo
```http
POST /api/logos/extract
Content-Type: application/json

{
  "domain": "github.com"
}
```

### Get All Logos
```http
GET /api/logos
```

### Get Specific Logo
```http
GET /api/logos/:id
```

### Proxy Image (Hidden URLs)
```http
GET /api/logos/proxy/:imgbb_id
```

### Health Check
```http
GET /health
```

## Response Format 📋

```json
{
  "message": "Logo extracted successfully",
  "data": {
    "id": 1,
    "name": "GitHub",
    "domain": "github.com",
    "logo_url": "http://your-api.com/api/logos/proxy/abc123",
    "original_url": "https://i.ibb.co/xyz/github-logo.png",
    "logo_format": "ico",
    "logo_size": 869,
    "logo_width": 32,
    "logo_height": 32,
    "cloud_storage": {
      "enabled": true,
      "provider": "ImgBB"
    }
  }
}
```

## Tech Stack 🔧

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Neon PostgreSQL
- **Storage**: ImgBB Cloud Storage
- **Image Processing**: Sharp + icojs
- **Deployment**: Railway/Render/Vercel ready

## Free Services Used 💰

- **Neon**: 3GB PostgreSQL database (free tier)
- **ImgBB**: Unlimited image storage with API key (free)
- **Railway/Render**: API hosting (free tier available)

## Deployment Platforms 🌐

### Recommended: Railway (Free Tier)
1. Connect your GitHub repo
2. Set environment variables
3. Deploy automatically

### Alternative: Render (Free Tier)
1. Connect your GitHub repo  
2. Set environment variables
3. Deploy with zero config

### Alternative: Vercel (Serverless)
1. Install Vercel CLI
2. Configure `vercel.json`
3. Deploy with `vercel`

## Environment Variables 🔐

```env
# Server
PORT=3000
NODE_ENV=production
BASE_URL=https://your-api-domain.com

# Database
DB_TYPE=neon
NEON_DATABASE_URL=postgresql://user:password@host/db

# Storage
IMGBB_API_KEY=your_imgbb_api_key

# Optional
CORS_ORIGIN=*
LOG_LEVEL=info
```

## License 📄

MIT License - feel free to use this in your projects!

---

Made with ❤️ for developers who need reliable logo APIs