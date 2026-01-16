'use client'

import { useState, useEffect } from 'react'
import { generateImageEmbedding } from '@/lib/imageEmbeddings'

interface Product {
  id: string
  product_id: string
  title: string
  product_images_urls: string[]
}

export default function GenerateEmbeddingsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [logs, setLogs] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'processing' | 'complete'>('idle')

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const fetchProducts = async () => {
    setLoading(true)
    addLog('Fetching products from OpenSearch...')
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: {}, size: 1000 })
      })
      
      const data = await response.json()
      setProducts(data.products || [])
      addLog(`✓ Found ${data.products?.length || 0} products`)
    } catch (error: any) {
      addLog(`✗ Error fetching products: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const generateAllEmbeddings = async () => {
    if (products.length === 0) {
      addLog('No products to process')
      return
    }

    setStatus('processing')
    setProgress({ current: 0, total: products.length })
    addLog(`Starting embedding generation for ${products.length} products...`)

    let updated = 0
    let skipped = 0
    let errors = 0

    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      setProgress({ current: i + 1, total: products.length })
      
      addLog(`\n[${i + 1}/${products.length}] ${product.title}`)

      if (!product.product_images_urls || product.product_images_urls.length === 0) {
        addLog('  ⚠ No images, skipping')
        skipped++
        continue
      }

      const imageUrl = product.product_images_urls[0]
      addLog(`  Fetching image: ${imageUrl.substring(0, 60)}...`)

      try {
        // Fetch image and convert to File
        const imageResponse = await fetch(imageUrl)
        const imageBlob = await imageResponse.blob()
        const imageFile = new File([imageBlob], 'product.jpg', { type: imageBlob.type })

        addLog('  Generating embedding...')
        const embedding = await generateImageEmbedding(imageFile)
        addLog(`  ✓ Generated embedding (dimension: ${embedding.length})`)

        // Update product in OpenSearch
        addLog('  Updating OpenSearch...')
        const updateResponse = await fetch('/api/update-product-embedding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.product_id || product.id,
            embedding
          })
        })

        if (updateResponse.ok) {
          addLog('  ✓ Updated in OpenSearch')
          updated++
        } else {
          const error = await updateResponse.json()
          addLog(`  ✗ Failed to update: ${error.error}`)
          errors++
        }
      } catch (error: any) {
        addLog(`  ✗ Error: ${error.message}`)
        errors++
      }
    }

    addLog(`\n${'='.repeat(60)}`)
    addLog('Summary:')
    addLog(`  Updated: ${updated}`)
    addLog(`  Skipped: ${skipped}`)
    addLog(`  Errors: ${errors}`)
    addLog('='.repeat(60))
    
    setStatus('complete')
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Generate Product Embeddings</h1>
        <p className="text-gray-600 mb-8">
          This tool generates MobileNet embeddings for all products using their images.
          The embeddings are stored in OpenSearch for visual similarity search.
        </p>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Products</h2>
              <p className="text-sm text-gray-600">
                {products.length} products found
              </p>
            </div>
            <button
              onClick={generateAllEmbeddings}
              disabled={loading || status === 'processing' || products.length === 0}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {status === 'processing' ? 'Processing...' : 'Generate All Embeddings'}
            </button>
          </div>

          {status === 'processing' && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">Logs will appear here...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap">{log}</div>
              ))
            )}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ How it works</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Fetches all products from OpenSearch</li>
            <li>• Downloads each product's first image</li>
            <li>• Generates 1280-dimensional MobileNet embedding in the browser</li>
            <li>• Updates the product in OpenSearch with the embedding</li>
            <li>• First run may take 10-30 seconds to load the model</li>
            <li>• Subsequent embeddings are fast (~1-2 seconds each)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// Made with Bob
