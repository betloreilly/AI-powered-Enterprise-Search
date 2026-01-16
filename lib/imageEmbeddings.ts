/**
 * Browser-based image embedding generation using TensorFlow.js
 * Uses MobileNet for feature extraction (1280-dimensional embeddings)
 */

import * as tf from '@tensorflow/tfjs'

let model: tf.GraphModel | null = null
let isLoading = false

/**
 * Load the MobileNet model for image embeddings
 * Model is loaded once and cached for subsequent uses
 */
export async function loadModel(): Promise<tf.GraphModel> {
  if (model) {
    return model
  }

  if (isLoading) {
    // Wait for the model to finish loading
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    if (!model) {
      throw new Error('Model failed to load')
    }
    return model
  }

  try {
    isLoading = true
    console.log('Loading MobileNet model...')
    
    // Load MobileNetV2 from TensorFlow Hub
    // This is a pre-trained model that works well for image similarity
    const mobilenetUrl = 'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v2_100_224/feature_vector/3/default/1'
    
    model = await tf.loadGraphModel(mobilenetUrl, { fromTFHub: true })
    console.log('✓ MobileNet model loaded successfully')
    
    return model
  } catch (error) {
    console.error('Failed to load MobileNet model:', error)
    throw new Error('Failed to load image embedding model')
  } finally {
    isLoading = false
  }
}

/**
 * Preprocess image for MobileNet
 * Resizes to 224x224 and normalizes pixel values
 */
function preprocessImage(imageElement: HTMLImageElement): tf.Tensor3D {
  return tf.tidy(() => {
    // Convert image to tensor
    let tensor = tf.browser.fromPixels(imageElement)
    
    // Resize to 224x224 (MobileNet input size)
    tensor = tf.image.resizeBilinear(tensor, [224, 224])
    
    // Normalize to [-1, 1] range (MobileNet expects this)
    tensor = tensor.toFloat()
    tensor = tensor.div(127.5).sub(1.0)
    
    return tensor as tf.Tensor3D
  })
}

/**
 * Generate embedding for an image
 * @param imageFile - The image file to process
 * @returns Promise<number[]> - 1280-dimensional embedding vector
 */
export async function generateImageEmbedding(imageFile: File): Promise<number[]> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('[ImageEmbeddings] Starting embedding generation...')
      console.log('[ImageEmbeddings] File:', imageFile.name, imageFile.type, imageFile.size)
      
      // Load model if not already loaded
      console.log('[ImageEmbeddings] Loading model...')
      const loadedModel = await loadModel()
      console.log('[ImageEmbeddings] Model loaded successfully')
      
      // Create image element
      const img = new Image()
      const imageUrl = URL.createObjectURL(imageFile)
      console.log('[ImageEmbeddings] Created image URL')
      
      img.onload = async () => {
        try {
          console.log('[ImageEmbeddings] Image loaded, dimensions:', img.width, 'x', img.height)
          
          // Preprocess image
          console.log('[ImageEmbeddings] Preprocessing image...')
          const preprocessed = preprocessImage(img)
          console.log('[ImageEmbeddings] Preprocessed shape:', preprocessed.shape)
          
          // Add batch dimension
          const batched = preprocessed.expandDims(0)
          console.log('[ImageEmbeddings] Batched shape:', batched.shape)
          
          // Generate embedding
          console.log('[ImageEmbeddings] Generating embedding...')
          const embedding = loadedModel.predict(batched) as tf.Tensor
          console.log('[ImageEmbeddings] Embedding tensor shape:', embedding.shape)
          
          // Convert to array
          console.log('[ImageEmbeddings] Converting to array...')
          const embeddingArray = await embedding.data()
          const embeddingList = Array.from(embeddingArray)
          console.log('[ImageEmbeddings] Array length:', embeddingList.length)
          
          // Normalize the embedding (L2 normalization)
          console.log('[ImageEmbeddings] Normalizing...')
          const norm = Math.sqrt(embeddingList.reduce((sum, val) => sum + val * val, 0))
          const normalizedEmbedding = embeddingList.map(val => val / norm)
          
          // Cleanup
          URL.revokeObjectURL(imageUrl)
          tf.dispose([preprocessed, batched, embedding])
          
          console.log(`[ImageEmbeddings] ✓ Generated embedding (dimension: ${normalizedEmbedding.length})`)
          console.log('[ImageEmbeddings] Sample values:', normalizedEmbedding.slice(0, 5))
          resolve(normalizedEmbedding)
        } catch (error) {
          console.error('[ImageEmbeddings] Error during processing:', error)
          URL.revokeObjectURL(imageUrl)
          reject(error)
        }
      }
      
      img.onerror = (error) => {
        console.error('[ImageEmbeddings] Failed to load image:', error)
        URL.revokeObjectURL(imageUrl)
        reject(new Error('Failed to load image'))
      }
      
      img.src = imageUrl
      console.log('[ImageEmbeddings] Image loading started...')
    } catch (error) {
      console.error('[ImageEmbeddings] Error in generateImageEmbedding:', error)
      reject(error)
    }
  })
}

/**
 * Preload the model in the background
 * Call this on app initialization to improve first search performance
 */
export async function preloadModel(): Promise<void> {
  try {
    await loadModel()
  } catch (error) {
    console.warn('Failed to preload image embedding model:', error)
  }
}

/**
 * Check if the model is loaded
 */
export function isModelLoaded(): boolean {
  return model !== null
}

/**
 * Dispose of the model to free up memory
 */
export function disposeModel(): void {
  if (model) {
    model.dispose()
    model = null
    console.log('Image embedding model disposed')
  }
}

// Made with Bob
