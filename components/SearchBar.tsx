'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Image as ImageIcon, Upload, Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { generateImageEmbedding, preloadModel } from '@/lib/imageEmbeddings'
import { clearSearchState } from '@/lib/searchState'
import { SUPPORT_KNOWLEDGE_INDEX } from '@/lib/config'

interface Product {
  id: string
  title: string
  description: string
  price: number
  image: string
  category: string
  brand: string
  rating?: number
  similarityScore?: number
}

export default function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Preload the model on component mount
  useEffect(() => {
    preloadModel().catch(console.error)
  }, [])

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() && !uploadedImage) {
      // Clear all search state when returning to home page
      clearSearchState('search_only')
      router.push('/')
      return
    }

    // If there's an uploaded image, perform visual search
    if (uploadedImage) {
      await performVisualSearch()
      return
    }

    // Use intelligent search for text queries
    if (searchQuery.trim()) {
      await performIntelligentSearch(searchQuery)
    } else {
      // Clear reasoning when clearing search
      clearSearchState('search_only')
      router.push('/')
    }
  }

  const performIntelligentSearch = async (searchQuery: string) => {
    setIsSearching(true)
    setLoadingMessage('Understanding your query...')

    try {
      console.log('[Intelligent Search] Query:', searchQuery)

      // Call intelligent search API
      const response = await fetch('/api/intelligent-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      })

      if (!response.ok) {
        throw new Error('Failed to process query')
      }

      const result = await response.json()
      console.log('[Intelligent Search] Result:', result)

      // Store summary for AnswerBox (for all search types)
      if (result.summary) {
        const answerData = {
          answer: result.summary,
          sources: result.data?.sources || [],
          sourceDocuments: result.data?.sourceDocuments || [],
          intent: result.intent,
          suggestions: result.extractedParams?.suggestedSearches || [],
          explorationContext: result.extractedParams?.explorationContext || ''
        }
        sessionStorage.setItem('intelligentSearchAnswer', JSON.stringify(answerData))
        // Dispatch event to notify AnswerBox to update
        window.dispatchEvent(new Event('answerUpdated'))
        console.log('[SearchBar] Stored answer for AnswerBox:', {
          intent: result.intent,
          hasAnswer: !!result.summary,
          answerLength: result.summary?.length || 0
        })
      } else {
        sessionStorage.removeItem('intelligentSearchAnswer')
        window.dispatchEvent(new Event('answerUpdated'))
      }

      // For generic exploration, store the aggregated product results so ProductGrid
      // can render exactly the same items that intelligent search found.
      if (result.intent === 'generic_exploration' && result.data?.products) {
        console.log('[SearchBar] Storing exploration results:', result.data.products.length, 'products')
        sessionStorage.setItem('explorationSearchResults', JSON.stringify(result.data.products))
        // Trigger ProductGrid to update immediately
        window.dispatchEvent(new Event('queryUpdated'))
      } else {
        // For non-exploration intents, clear any stale exploration results
        sessionStorage.removeItem('explorationSearchResults')
      }

      // Store query info for QueryViewer
      if (result.queryInfo) {
        console.log('[SearchBar] Storing queryInfo from result.queryInfo:', result.queryInfo)
        sessionStorage.setItem('opensearchQuery', JSON.stringify(result.queryInfo))
        window.dispatchEvent(new Event('queryUpdated'))
      } else if (result.data?.queryInfo) {
        console.log('[SearchBar] Storing queryInfo from result.data.queryInfo:', result.data.queryInfo)
        sessionStorage.setItem('opensearchQuery', JSON.stringify(result.data.queryInfo))
        window.dispatchEvent(new Event('queryUpdated'))
      } else {
        console.log('[SearchBar] No queryInfo found in response')
      }

      // Store reasoning and intent for QueryViewer
      console.log('[SearchBar] Reasoning from API:', result.reasoning)
      console.log('[SearchBar] Intent from API:', result.intent)
      
      if (result.reasoning) {
        sessionStorage.setItem('intentReasoning', result.reasoning)
        sessionStorage.setItem('intentType', result.intent)
        console.log('[SearchBar] Stored reasoning in sessionStorage')
        window.dispatchEvent(new Event('queryUpdated'))
      } else {
        console.log('[SearchBar] No reasoning in result, removing from sessionStorage')
        sessionStorage.removeItem('intentReasoning')
        sessionStorage.removeItem('intentType')
      }

      // Handle different intents
      switch (result.intent) {
        case 'text_search':
          // Store search query in sessionStorage instead of URL
          sessionStorage.setItem('currentSearch', searchQuery)
          sessionStorage.setItem('searchMode', 'text')
          router.push('/')
          break

        case 'generic_exploration':
          // Store search query in sessionStorage instead of URL
          sessionStorage.setItem('currentSearch', searchQuery)
          sessionStorage.setItem('searchMode', 'exploration')
          // Trigger ProductGrid to update and show exploration results
          window.dispatchEvent(new Event('queryUpdated'))
          router.push('/')
          break

        case 'visual_search':
          // Show message prompting user to upload image
          alert(result.message)
          break

        case 'support':
          // Store search query in sessionStorage instead of URL
          sessionStorage.setItem('currentSearch', searchQuery)
          sessionStorage.setItem('searchMode', 'support')

          // If backend didn't provide detailed queryInfo for support,
          // still surface a meaningful object for the QueryViewer so it
          // doesn't keep showing the last product query.
          if (!result.queryInfo && !result.data?.queryInfo) {
            const supportQueryInfo = {
              index: SUPPORT_KNOWLEDGE_INDEX || 'lexora_support',
              query: 'semantic_support_pipeline',
              size: 5,
              searchType: 'semantic_support',
              timestamp: new Date().toISOString(),
            }
            sessionStorage.setItem('opensearchQuery', JSON.stringify(supportQueryInfo))
            window.dispatchEvent(new Event('queryUpdated'))
          }

          router.push('/')
          break

        case 'clarification':
          // Show clarification message
          alert(result.message)
          break
      }
    } catch (error: any) {
      console.error('[Intelligent Search] Error:', error)
      // Fallback to regular search
      const params = new URLSearchParams(searchParams.toString())
      params.set('q', searchQuery)
      params.delete('imageSearch')
      router.push(`/?${params.toString()}`)
    } finally {
      setIsSearching(false)
      setLoadingMessage('')
    }
  }

  const performVisualSearch = async () => {
    if (!uploadedImage) return

    console.log('=== Starting Visual Search ===')
    console.log('Image file:', uploadedImage.name, uploadedImage.type, uploadedImage.size)
    
    setIsSearching(true)
    setLoadingMessage('Loading AI model...')
    
    try {
      // Generate embedding in the browser
      console.log('Step 1: Generating embedding...')
      setLoadingMessage('Analyzing image...')
      const embedding = await generateImageEmbedding(uploadedImage)
      console.log(`✓ Generated embedding in browser (dimension: ${embedding.length})`)
      console.log('Embedding sample:', embedding.slice(0, 5))

      // Gather current filters from sessionStorage (same source as ProductGrid / FilterSidebar)
      setLoadingMessage('Searching products...')
      let filtersFromStorage: any = {}
      const filtersData = sessionStorage.getItem('activeFilters')
      if (filtersData) {
        try {
          filtersFromStorage = JSON.parse(filtersData)
        } catch (e) {
          console.error('[Visual Search] Failed to parse activeFilters from sessionStorage:', e)
        }
      }

      const category = filtersFromStorage.category || ''
      const price = filtersFromStorage.price || ''
      const brand = filtersFromStorage.brand || ''
      const rating = filtersFromStorage.rating || ''
      const availability = filtersFromStorage.availability || ''

      const filters = {
        query: query.trim() || undefined,
        category: (category && category !== 'All Categories') ? category : undefined,
        price: (price && price !== 'All Prices') ? price : undefined,
        brand: (brand && brand !== 'All Brands') ? brand : undefined,
        rating: (rating && rating !== 'All Ratings') ? rating : undefined,
        availability: (availability && availability !== 'All') ? availability : undefined,
      }

      console.log('Step 2: Calling visual search API...')
      console.log('Filters:', filters)

      // Call visual search API with embedding
      const response = await fetch('/api/visual-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embedding,
          filters,
          size: 50,        // Limit to top 50 results
          minScore: 0.3,   // Only show products with 30%+ similarity
        }),
      })

      console.log('API Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error response:', errorText)
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          throw new Error(`API error: ${response.status} - ${errorText}`)
        }
        throw new Error(errorData.error || 'Visual search failed')
      }

      const data = await response.json()
      console.log('✓ Visual search results:', data.products?.length || 0, 'products')
      console.log('Sample product:', data.products?.[0])

      // Store results in sessionStorage and trigger update
      console.log('Step 3: Storing results and updating UI...')
      sessionStorage.setItem('visualSearchResults', JSON.stringify(data.products))
      
      // Store query info for QueryViewer
      if (data.queryInfo) {
        sessionStorage.setItem('opensearchQuery', JSON.stringify(data.queryInfo))
        window.dispatchEvent(new Event('queryUpdated'))
      }
      
      // Store reasoning for visual search
      const visualReasoning = "The user wants to find visually similar products. Visual search analyzes the uploaded image with an AI vision model and compares it against product images, focusing on visual characteristics like color, shape, style, and overall composition to return the closest matches."
      sessionStorage.setItem('intentReasoning', visualReasoning)
      sessionStorage.setItem('intentType', 'visual_search')
      
      // Store summary for AnswerBox
      const productCount = data.products?.length || 0
      sessionStorage.setItem('intelligentSearchAnswer', JSON.stringify({
        answer: `Found ${productCount} visually similar products`,
        sources: [],
        intent: 'visual_search'
      }))
      
      // Store search mode in sessionStorage instead of URL
      sessionStorage.setItem('searchMode', 'visual')
      if (query.trim()) {
        sessionStorage.setItem('currentSearch', query)
      }
      
      console.log('Step 4: Dispatching event and navigating...')
      // Trigger a custom event to notify ProductGrid
      window.dispatchEvent(new CustomEvent('visualSearchComplete', {
        detail: { products: data.products }
      }))
      
      window.dispatchEvent(new Event('queryUpdated'))
      router.push('/')
      console.log('=== Visual Search Complete ===')
    } catch (error: any) {
      console.error('=== Visual Search Error ===')
      console.error('Error type:', error.constructor.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      alert(error.message || 'Failed to perform visual search. Please check the console for details.')
    } finally {
      setIsSearching(false)
      setLoadingMessage('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(query)
  }

  // Trigger visual search when image is uploaded
  useEffect(() => {
    if (uploadedImage) {
      performVisualSearch()
    }
  }, [uploadedImage])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setUploadedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const clearImage = () => {
    setUploadedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    // Clear stored visual search results
    sessionStorage.removeItem('visualSearchResults')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('imageSearch')
    router.push(`/?${params.toString()}`)
  }

  const clearSearch = () => {
    setQuery('')
    clearImage()

    // Clear all search-related state so we don't show stale results after clearing
    clearSearchState('search_only')

    // Go back to home
    router.push('/')
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <div className="relative bg-white border border-gray-300 rounded-lg shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, upload an image, or ask a support question..."
              className="w-full pl-10 pr-32 py-3 text-sm bg-transparent border-none outline-none placeholder:text-gray-400 text-gray-900"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              {isSearching ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  {loadingMessage && (
                    <span className="text-xs text-gray-500">{loadingMessage}</span>
                  )}
                </div>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={isSearching}
                  />
                  <label
                    htmlFor="image-upload"
                    className={`cursor-pointer text-gray-400 hover:text-indigo-600 transition-colors p-1 rounded hover:bg-indigo-50 ${
                      isSearching ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title="Upload image to search"
                  >
                    <Upload className="w-4 h-4" />
                  </label>
                  {(query || uploadedImage) && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Clear search"
                      disabled={isSearching}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </form>

      {imagePreview && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 flex-shrink-0">
              <img
                src={imagePreview}
                alt="Search preview"
                className="w-full h-full object-cover rounded border border-gray-200"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <p className="text-sm font-medium text-gray-900 truncate">
                  {uploadedImage?.name}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Visual search active - filters still apply
              </p>
            </div>
            <button
              type="button"
              onClick={clearImage}
              className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
