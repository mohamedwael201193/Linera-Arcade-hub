// AI Image Generation for Meme Creation
// Uses multiple providers for reliability

export interface GenerateImageOptions {
  prompt: string
  width?: number
  height?: number
  style?: 'meme' | 'art' | 'photo' | 'cartoon'
}

export interface GenerateImageResult {
  success: boolean
  imageUrl?: string
  error?: string
  provider?: string
}

// Style prompts to enhance generation
const STYLE_PROMPTS = {
  meme: 'funny meme, viral internet meme, humorous, bold text',
  art: 'digital art, vibrant colors, artistic masterpiece',
  photo: 'photograph, realistic, high quality',
  cartoon: 'cartoon style, animated, colorful illustration'
}

/**
 * Convert blob to data URL for reliable display
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read image'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Generate image using Pollinations.ai
 * Fetches and converts to data URL to avoid CORS issues
 */
async function tryPollinations(prompt: string, style: string, width: number, height: number): Promise<GenerateImageResult> {
  const stylePrompt = STYLE_PROMPTS[style as keyof typeof STYLE_PROMPTS] || STYLE_PROMPTS.meme
  const fullPrompt = `${prompt}, ${stylePrompt}`
  const seed = Math.floor(Math.random() * 999999)
  
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true`
  
  console.log('[Pollinations] Fetching:', imageUrl)
  
  try {
    const response = await fetch(imageUrl)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const blob = await response.blob()
    
    if (blob.size < 1000) {
      throw new Error('Image too small, likely failed')
    }
    
    const dataUrl = await blobToDataURL(blob)
    console.log('[Pollinations] Success! Size:', blob.size)
    
    return {
      success: true,
      imageUrl: dataUrl,
      provider: 'Pollinations AI'
    }
  } catch (error) {
    console.error('[Pollinations] Failed:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Try using Unsplash Source for keyword-based images (instant, reliable)
 */
async function tryUnsplash(prompt: string, width: number, height: number): Promise<GenerateImageResult> {
  // Extract keywords from prompt
  const keywords = prompt.split(' ').slice(0, 3).join(',')
  const imageUrl = `https://source.unsplash.com/${width}x${height}/?${encodeURIComponent(keywords)}`
  
  console.log('[Unsplash] Trying:', imageUrl)
  
  try {
    const response = await fetch(imageUrl)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const blob = await response.blob()
    const dataUrl = await blobToDataURL(blob)
    
    return {
      success: true,
      imageUrl: dataUrl,
      provider: 'Unsplash'
    }
  } catch (error) {
    console.error('[Unsplash] Failed:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Main function - tries Pollinations first, then Unsplash as fallback
 */
export async function generateAIImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
  const { prompt, width = 512, height = 512, style = 'meme' } = options

  if (!prompt.trim()) {
    return { success: false, error: 'Please enter a description' }
  }

  console.log('[AI] Starting generation for:', prompt)

  // Try Pollinations first (actual AI generation)
  const pollinationsResult = await tryPollinations(prompt, style, width, height)
  if (pollinationsResult.success) {
    return pollinationsResult
  }

  // Try Unsplash as fallback (keyword-based real photos)
  console.log('[AI] Pollinations failed, trying Unsplash...')
  const unsplashResult = await tryUnsplash(prompt, width, height)
  if (unsplashResult.success) {
    return unsplashResult
  }

  return {
    success: false,
    error: 'Image generation failed. Please try again or upload an image manually.'
  }
}

// Style options for UI
export const AI_STYLES = {
  meme: '🎭 Meme Style',
  cartoon: '🎨 Cartoon',
  art: '🖼️ Digital Art',
  photo: '📷 Photorealistic'
} as const

export type AIStyle = keyof typeof AI_STYLES
