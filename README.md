# Company Logo API 🏢✨

A fast, reliable REST API for extracting and serving company logos with cloud storage and format conversion. **Perfect for blogs and websites** that need company logos on-demand.

## 🌐 Live API
**Base URL**: `https://company-logo-api.vercel.app`

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
<img src="https://company-logo-api.vercel.app/api/logos/auto/github.com" alt="GitHub logo">
<img src="https://company-logo-api.vercel.app/api/logos/auto/google.com" alt="Google logo">
<img src="https://company-logo-api.vercel.app/api/logos/auto/openai.com" alt="OpenAI logo">
```

### Markdown Ready
```markdown
![GitHub logo](https://company-logo-api.vercel.app/api/logos/auto/github.com)
![Google logo](https://company-logo-api.vercel.app/api/logos/auto/google.com)
```

## 📋 API Endpoints

### 🎯 **Auto-Extract Logo** (Main endpoint)
```http
GET /api/logos/auto/:domain
```

**Perfect for direct image embedding:**
```html
<img src="https://company-logo-api.vercel.app/api/logos/auto/github.com" alt="GitHub">
```

### 📄 **List All Logos**
```http
GET /api/logos
```

### 🗑️ **Delete Logo**
```http
DELETE /api/logos/:id
```

## 🔍 Examples

### Test with curl:
```bash
# Get GitHub logo directly as image
curl https://company-logo-api.vercel.app/api/logos/auto/github.com

# List all cached logos
curl https://company-logo-api.vercel.app/api/logos
```

### Response Example:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "GitHub",
    "domain": "github.com",
    "logo_url": "https://company-logo-api.vercel.app/api/logos/auto/github.com",
    "imgbb_url": "https://i.ibb.co/xyz123/logo.png",
    "logo_format": "png",
    "logo_size": 12584,
    "logo_width": 32,
    "logo_height": 32
  }
}
```

## 🔧 Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: Neon PostgreSQL (Cloud)
- **Storage**: ImgBB (Cloud)
- **Hosting**: Vercel
- **Image Processing**: Sharp + icojs

## 📖 How It Works

1. **Request**: `/api/logos/auto/github.com`
2. **Check Cache**: Look for existing logo in database
3. **Extract**: If not cached, extract from website
4. **Convert**: ICO files converted to PNG using `icojs`
5. **Upload**: Store in ImgBB cloud storage
6. **Save**: Cache metadata in Neon database
7. **Serve**: Return direct image or JSON response

## 🚀 Environment Variables

Add these in your Vercel dashboard:

```bash
# Database (Required)
NEON_DATABASE_URL=postgresql://user:pass@host/db

# Storage (Required)  
IMGBB_API_KEY=your_imgbb_api_key

# Optional
NODE_ENV=production
```

## 🎉 Perfect for:

- **Blog platforms** showing company logos
- **Documentation sites** with company references  
- **Portfolio websites** displaying client logos
- **Directory sites** with business listings
- **Any website** needing reliable company logos

## 📄 License

MIT License - feel free to use in your projects!

---

🔗 **Live Demo**: `https://company-logo-api.vercel.app/api/logos/auto/github.com`