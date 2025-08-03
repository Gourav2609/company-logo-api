const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');

class CloudStorageService {
  constructor() {
    this.imgbbApiKey = process.env.IMGBB_API_KEY;
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.supportedFormats = ['png', 'jpg', 'jpeg', 'gif', 'webp']; // ImgBB supported formats
    this.convertFormats = ['ico', 'svg', 'bmp', 'tiff']; // Formats to convert to PNG
  }

  // Convert unsupported formats to PNG
  async convertToPNG(imageBuffer, originalFormat) {
    try {
      console.log(`🔄 Converting ${originalFormat} to PNG for ImgBB upload...`);
      
      if (originalFormat === 'ico') {
        // Handle ICO files using icojs (dynamic import for ES module)
        const { parseICO } = await import('icojs');
        const images = await parseICO(imageBuffer);
        if (images.length === 0) {
          throw new Error('No images found in ICO file');
        }
        
        // Find the largest image in the ICO file
        const largestImage = images.reduce((prev, current) => {
          return (current.width * current.height) > (prev.width * prev.height) ? current : prev;
        });
        
        console.log(`📐 Selected ICO image: ${largestImage.width}x${largestImage.height}`);
        
        // Convert the selected image buffer to PNG using Sharp
        return await sharp(Buffer.from(largestImage.buffer))
          .png()
          .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
          .toBuffer();
          
      } else if (originalFormat === 'svg') {
        // For SVG, we need special handling
        return await sharp(imageBuffer)
          .png()
          .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
          .toBuffer();
      } else {
        // For BMP, TIFF, etc.
        return await sharp(imageBuffer)
          .png()
          .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
          .toBuffer();
      }
    } catch (error) {
      console.error('Format conversion failed:', error.message);
      throw new Error(`Failed to convert ${originalFormat} to PNG: ${error.message}`);
    }
  }

  // Check if format needs conversion for ImgBB
  needsConversion(format) {
    return this.convertFormats.includes(format.toLowerCase());
  }

  // Detect format from file extension
  detectFormatFromFilename(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const formatMap = {
      'ico': 'ico',
      'bmp': 'bmp', 
      'tiff': 'tiff',
      'tif': 'tiff',
      'webp': 'webp',
      'avif': 'avif',
      'svg': 'svg',
      'png': 'png',
      'jpg': 'jpeg',
      'jpeg': 'jpeg',
      'gif': 'gif'
    };
    return formatMap[ext] || 'unknown';
  }

  // Detect format from buffer magic bytes
  detectFormatFromBuffer(buffer) {
    if (!buffer || buffer.length < 8) return null;
    
    // Check magic bytes for common formats
    const bytes = Array.from(buffer.slice(0, 8));
    
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'png';
    
    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'jpeg';
    
    // ICO: 00 00 01 00
    if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) return 'ico';
    
    // BMP: 42 4D  
    if (bytes[0] === 0x42 && bytes[1] === 0x4D) return 'bmp';
    
    // GIF: 47 49 46 38
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'gif';
    
    // WEBP: 52 49 46 46 ... 57 45 42 50
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      // Check for WEBP signature at offset 8
      if (buffer.length >= 12) {
        const webpBytes = Array.from(buffer.slice(8, 12));
        if (webpBytes[0] === 0x57 && webpBytes[1] === 0x45 && webpBytes[2] === 0x42 && webpBytes[3] === 0x50) {
          return 'webp';
        }
      }
    }
    
    return null;
  }

  // Upload image to ImgBB
  async uploadToImgBB(imageBuffer, filename) {
    if (!this.imgbbApiKey) {
      throw new Error('ImgBB API key not configured');
    }

    try {
      // Detect format from filename or buffer
      const originalFormat = this.detectFormatFromBuffer(imageBuffer) || this.detectFormatFromFilename(filename);
      let uploadBuffer = imageBuffer;
      let uploadFormat = originalFormat;
      let convertedFilename = filename;

      // Convert unsupported formats to PNG
      if (this.needsConversion(originalFormat)) {
        console.log(`📸 Converting ${originalFormat} to PNG for ImgBB compatibility...`);
        uploadBuffer = await this.convertToPNG(imageBuffer, originalFormat);
        uploadFormat = 'png';
        convertedFilename = filename.replace(/\.[^.]+$/, '.png');
      }

      // Validate the final image
      this.validateImage(uploadBuffer);

      const formData = new FormData();
      formData.append('image', uploadBuffer.toString('base64'));
      formData.append('name', convertedFilename);

      console.log(`☁️  Uploading to ImgBB: ${convertedFilename} (${uploadFormat}, ${uploadBuffer.length} bytes)`);

      const response = await axios.post(
        `https://api.imgbb.com/1/upload?key=${this.imgbbApiKey}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 30000,
        }
      );

      if (response.data.success) {
        const imgbbData = response.data.data;
        
        console.log(`✅ ImgBB upload successful: ${imgbbData.url}`);
        
        // Return upload data
        return {
          original_url: imgbbData.url,
          imgbb_id: imgbbData.id,
          imgbb_full_url: imgbbData.url, // Store full URL for direct access
          delete_url: imgbbData.delete_url,
          size: imgbbData.size,
          width: imgbbData.width,
          height: imgbbData.height,
          mime: imgbbData.image.mime,
          original_format: originalFormat,
          uploaded_format: uploadFormat,
          converted: this.needsConversion(originalFormat)
        };
      } else {
        throw new Error('ImgBB upload failed: ' + JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('ImgBB upload error:', error.message);
      
      // Log more details for debugging
      if (error.response) {
        console.error('ImgBB API Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      
      throw new Error(`Failed to upload to ImgBB: ${error.message}`);
    }
  }

  // Delete image from ImgBB
  async deleteFromImgBB(deleteUrl) {
    try {
      await axios.get(deleteUrl);
      return true;
    } catch (error) {
      console.error('ImgBB delete error:', error.message);
      return false;
    }
  }

  // Get image from ImgBB (for direct access)
  async getImageFromImgBB(imgbbIdOrUrl) {
    try {
      // If it's a full URL, use it directly, otherwise construct from ID
      let imgbbUrl;
      if (imgbbIdOrUrl.startsWith('http')) {
        imgbbUrl = imgbbIdOrUrl;
      } else {
        // This is a fallback - in practice we should store the full URL
        imgbbUrl = `https://i.ibb.co/${imgbbIdOrUrl}`;
      }
      
      console.log(`🔗 Fetching image from ImgBB: ${imgbbUrl}`);
      
      const response = await axios.get(imgbbUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });

      return {
        buffer: Buffer.from(response.data),
        contentType: response.headers['content-type'] || 'image/png',
        size: response.data.length,
      };
    } catch (error) {
      console.error('ImgBB fetch error:', error.message);
      throw new Error(`Failed to fetch image from ImgBB: ${error.message}`);
    }
  }

  // Alternative: Upload to multiple services for redundancy
  async uploadToMultipleServices(imageBuffer, filename) {
    const results = {
      primary: null,
      fallbacks: [],
      errors: []
    };

    // Try ImgBB as primary
    try {
      results.primary = await this.uploadToImgBB(imageBuffer, filename);
    } catch (error) {
      results.errors.push({ service: 'imgbb', error: error.message });
    }

    // Could add more free services here as fallbacks
    // - Imgur (if you have API key)
    // - PostImages
    // - ImageBB alternatives

    return results;
  }

  // Validate image before upload
  validateImage(imageBuffer, maxSize = 5 * 1024 * 1024) { // 5MB default
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('Empty image buffer');
    }

    if (imageBuffer.length > maxSize) {
      throw new Error(`Image too large: ${imageBuffer.length} bytes (max: ${maxSize})`);
    }

    // Basic image format validation
    const magic = imageBuffer.toString('hex', 0, 4);
    const validFormats = {
      '89504e47': 'png',
      'ffd8ffe0': 'jpg',
      'ffd8ffe1': 'jpg',
      'ffd8ffe2': 'jpg',
      'ffd8ffe3': 'jpg',
      'ffd8ffe8': 'jpg',
      '47494638': 'gif',
      '52494646': 'webp', // RIFF (WebP)
      '00000100': 'ico',
      '3c3f786d': 'svg', // <?xml
      '3c737667': 'svg', // <svg
    };

    const format = validFormats[magic.toLowerCase()];
    if (!format) {
      throw new Error('Unsupported image format');
    }

    return { format, size: imageBuffer.length };
  }

  // Get storage info
  getStorageInfo() {
    return {
      provider: 'ImgBB',
      features: {
        upload: !!this.imgbbApiKey,
        delete: true,
        maxSize: '32MB',
        freeLimit: 'Unlimited (with API key)',
      },
      baseUrl: this.baseUrl,
    };
  }
}

module.exports = CloudStorageService;
