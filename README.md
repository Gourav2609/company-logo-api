# Company Logo API 🏢✨

A fast, reliable REST API for extracting and serving company logos with cloud storage and format conversion. **Perfect for blogs and websites** that need company logos on-demand.

## ✨ Features

- **🚀 Auto-extraction**: Logos extracted automatically on first request
- **🔄 ICO → PNG conversion**: Handles ICO files with `icojs` package  
- **☁️ Cloud storage**: ImgBB integration for unlimited image storage
- **🐘 Cloud database**: Neon PostgreSQL for fast, reliable data storage
- **🔗 Direct image URLs**: Perfect for `<img>` tags and Markdown
- **🛡️ Smart fallback**: Uses Clearbit if extraction fails
- **⚡ Cached**: Fast subsequent requests from database

## 🎯 Blog-Friendly Usage

### Simple HTML (Just works!)
```html
<img src="https://company-logo-api-production.up.railway.app/api/logos/auto/github.com" alt="GitHub logo">
<img src="https://company-logo-api-production.up.railway.app/api/logos/auto/google.com" alt="Google logo">
<img src="https://company-logo-api-production.up.railway.app/api/logos/auto/openai.com" alt="OpenAI logo">
```

### Markdown Ready
```markdown
![GitHub logo](https://company-logo-api-production.up.railway.app/api/logos/auto/github.com)
![Google logo](https://company-logo-api-production.up.railway.app/api/logos/auto/google.com)
```

### With Options
```html
<!-- With fallback (recommended) -->
<img src="https://company-logo-api-production.up.railway.app/api/logos/auto/github.com?fallback=true" alt="GitHub">

<!-- Custom size -->
<img src="https://company-logo-api-production.up.railway.app/api/logos/auto/github.com?size=128" alt="GitHub">
```

## 🚀 Quick Setup

### 1. Clone & Install
```bash
git clone https://github.com/Gourav2609/company-logo-api.git
cd company-logo-api
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your credentials
```

**Required Environment Variables:**
```env
# Neon Database (3GB free tier)
NEON_DATABASE_URL=postgresql://user:pass@host.neon.tech/db

# ImgBB API (unlimited free tier)
IMGBB_API_KEY=your_imgbb_api_key
```

### 3. Start Server
```bash
npm start
# Server runs on http://localhost:3000
```

## 📡 API Endpoints

| Endpoint | Method | Description | Perfect For |
|----------|--------|-------------|-------------|
| `/api/logos` | GET | Get all companies | Admin dashboard |
| `/api/logos/auto/:domain` | GET | **Auto-extract logo image** | `<img>` tags |
| `/api/logos/:id` | DELETE | Delete company logo | Admin cleanup |

### Main Endpoint: `/api/logos/auto/:domain`
- **Auto-extracts** if logo not cached
- **Returns image data** directly (works in `<img>` tags)
- **Smart fallback** to Clearbit if extraction fails
- **Cached** for fast subsequent requests

## 📋 Response Examples

### Auto Logo Endpoint
```bash
GET /api/logos/auto/github.com
# Returns: PNG image data (ready for <img> tags)
```

### All Companies
```bash
GET /api/logos
```
```json
{
  "data": [
    {
      "id": 1,
      "name": "GitHub",
      "domain": "github.com",
      "logo_url": "https://company-logo-api-production.up.railway.app/api/logos/auto/github.com",
      "logo_format": "ico",
      "logo_size": 869,
      "cloud_storage": {
        "enabled": true,
        "provider": "ImgBB"
      }
    }
  ]
}
```

## 🔧 Tech Stack

- **Runtime**: Node.js 14+
- **Framework**: Express.js
- **Database**: Neon PostgreSQL (3GB free)
- **Storage**: ImgBB (unlimited free)
- **Image Processing**: Sharp + icojs
- **Deployment**: Railway/Render/Vercel ready

## 🌐 Free Hosting Options

### 🚂 Railway (Recommended)
**Step-by-step deployment:**

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Deploy company logo API"
   git push origin main
   ```

2. **Deploy to Railway:**
   - Go to [railway.app](https://railway.app)
   - Click "Deploy from GitHub"
   - Select your `company-logo-api` repository
   - Railway will auto-detect Node.js and deploy

3. **Add Environment Variables:**
   - In Railway dashboard → Variables tab
   - Add these variables:
   ```env
   NEON_DATABASE_URL=your_neon_database_url
   IMGBB_API_KEY=your_imgbb_api_key
   NODE_ENV=production
   ```

4. **Get your Railway URL:**
   - After deployment, Railway provides a URL like:
   - `https://company-logo-api-production.up.railway.app`

5. **Test your API:**
   ```bash
   curl https://your-app.up.railway.app/api/logos/auto/github.com
   ```

### 🎨 Render
```bash
# 1. Connect GitHub repo
# 2. Runtime: Node.js
# 3. Build: npm install
# 4. Start: npm start
```

### ⚡ Vercel (Serverless)
```bash
npm i -g vercel
vercel
# Follow prompts
```

## 🔐 Environment Variables

```env
# Server
PORT=3000
NODE_ENV=production

# Database (Required)
NEON_DATABASE_URL=postgresql://user:pass@host.neon.tech/db

# Storage (Required)  
IMGBB_API_KEY=your_imgbb_api_key

# Optional
CORS_ORIGIN=*
LOG_LEVEL=info
```

## 🎯 Perfect For

- **📝 Blog websites** - Add company logos easily
- **📰 News sites** - Company logos in articles  
- **💼 Business directories** - Auto-populate company info
- **🔗 Link previews** - Rich social media previews
- **📊 Dashboards** - Company logo widgets

## 🚀 Getting Started (Production)

1. **Get free accounts:**
   - [Neon](https://neon.tech) - PostgreSQL database
   - [ImgBB](https://imgbb.com) - Image storage
   - [Railway](https://railway.app) - Hosting

2. **Deploy in 5 minutes:**
   - Fork this repo
   - Connect to Railway
   - Add environment variables
   - Deploy!

3. **Use in your blog:**
   ```html
   <img src="https://your-app.up.railway.app/api/logos/auto/github.com" alt="GitHub">
   ```

## 📄 License

MIT License - Free for personal and commercial use!

---

**Made with ❤️ for developers who need reliable logo APIs**

🔗 **Live Demo**: `https://your-app.up.railway.app/api/logos/auto/github.com`