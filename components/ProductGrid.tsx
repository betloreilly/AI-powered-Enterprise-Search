'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ProductCard from './ProductCard'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

const ITEMS_PER_PAGE = 24

interface Product {
  id: string
  title: string
  description: string
  price: number
  image: string
  category: string
  brand: string
  rating?: number
}

export default function ProductGrid() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const fetchingRef = useRef(false)
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastQueryInfoRef = useRef<string | null>(null) // Track last queryInfo to prevent unnecessary refetches

  useEffect(() => {
    // Always fetch products on mount (will show all products if no search/filters)
    fetchProducts()
    
    // Cleanup on unmount
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
      fetchingRef.current = false
    }
  }, [])

  // Listen for filter changes
  useEffect(() => {
    const handleFiltersChanged = () => {
      console.log('Filters changed event received')
      // Skip if already fetching
      if (fetchingRef.current) {
        console.log('[ProductGrid] Ignoring filtersChanged - fetch in progress')
        return
      }
      setCurrentPage(1) // Reset to first page when filters change
      debouncedFetchProducts()
    }

    const handleQueryUpdated = () => {
      console.log('Query updated event received')
      // Skip if already fetching - prevents loops
      if (fetchingRef.current) {
        console.log('[ProductGrid] Ignoring queryUpdated - fetch in progress')
        return
      }
      
      // Check if we're in exploration mode - reload stored results (bypass queryInfo check)
      const searchMode = sessionStorage.getItem('searchMode')
      if (searchMode === 'exploration') {
        console.log('[ProductGrid] queryUpdated in exploration mode - reloading stored results')
        // Update ref to track the change
        const currentQueryInfo = sessionStorage.getItem('opensearchQuery')
        lastQueryInfoRef.current = currentQueryInfo
        // Trigger fetchProducts which will load from sessionStorage
        fetchProducts()
        return
      }
      
      // Check if queryInfo actually changed - if it's the same as last time, don't refetch
      const currentQueryInfo = sessionStorage.getItem('opensearchQuery')
      if (currentQueryInfo === lastQueryInfoRef.current) {
        console.log('[ProductGrid] Ignoring queryUpdated - queryInfo unchanged (likely just UI update)')
        return
      }
      
      // Only fetch if there's actually a search query or filters
      const hasSearch = sessionStorage.getItem('currentSearch')
      const hasFilters = sessionStorage.getItem('activeFilters')
      if (hasSearch || hasFilters) {
        // Update ref before fetching to prevent loop
        lastQueryInfoRef.current = currentQueryInfo
        debouncedFetchProducts()
      } else {
        console.log('[ProductGrid] Ignoring queryUpdated - no active search or filters')
        // Still update ref to track the change
        lastQueryInfoRef.current = currentQueryInfo
      }
    }

    window.addEventListener('filtersChanged', handleFiltersChanged as EventListener)
    window.addEventListener('queryUpdated', handleQueryUpdated)
    
    return () => {
      window.removeEventListener('filtersChanged', handleFiltersChanged as EventListener)
      window.removeEventListener('queryUpdated', handleQueryUpdated)
      // Clear any pending debounced calls
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [])

  // Listen for visual search results
  useEffect(() => {
    const handleVisualSearchComplete = (event: CustomEvent) => {
      console.log('Visual search complete event received')
      setProducts(event.detail.products)
      setLoading(false)
      setError('')
    }

    window.addEventListener('visualSearchComplete', handleVisualSearchComplete as EventListener)
    
    return () => {
      window.removeEventListener('visualSearchComplete', handleVisualSearchComplete as EventListener)
    }
  }, [])

  // Check for stored visual search results on mount - REMOVED (handled in fetchProducts)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Calculate pagination after products are loaded
  const totalPages = products.length > 0 ? Math.ceil(products.length / ITEMS_PER_PAGE) : 0
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentProducts = products.slice(startIndex, endIndex)

  const applyClientSideFilters = (products: Product[]) => {
    // Read filters from sessionStorage instead of URL
    const filtersData = sessionStorage.getItem('activeFilters')
    let filters: any = {}
    if (filtersData) {
      try {
        filters = JSON.parse(filtersData)
      } catch (e) {
        console.error('Failed to parse filters:', e)
      }
    }

    const category = filters.category || ''
    const price = filters.price || ''
    const brand = filters.brand || ''
    const rating = filters.rating || ''
    const availability = filters.availability || ''

    let filtered = [...products]

    // Apply category filter
    if (category && category !== 'All Categories') {
      filtered = filtered.filter(p => p.category === category)
    }

    // Apply brand filter
    if (brand && brand !== 'All Brands') {
      filtered = filtered.filter(p => p.brand === brand)
    }

    // Apply price filter
    if (price && price !== 'All Prices') {
      const priceRanges: Record<string, { min: number; max: number }> = {
        'Under $50': { min: 0, max: 50 },
        '$50 - $100': { min: 50, max: 100 },
        '$100 - $200': { min: 100, max: 200 },
        '$200 - $400': { min: 200, max: 400 },
        '$400 - $1000': { min: 400, max: 1000 },
        'Over $1000': { min: 1000, max: Infinity },
      }
      const range = priceRanges[price]
      if (range) {
        filtered = filtered.filter(p => p.price >= range.min && p.price <= range.max)
      }
    }

    // Apply rating filter
    if (rating && rating !== 'All Ratings') {
      const ratingMap: Record<string, number> = {
        '4.5+ Stars': 4.5,
        '4.0+ Stars': 4.0,
        '3.5+ Stars': 3.5,
      }
      const minRating = ratingMap[rating]
      if (minRating !== undefined) {
        filtered = filtered.filter(p => (p.rating || 0) >= minRating)
      }
    }

    // Apply availability filter
    if (availability && availability !== 'All') {
      const availabilityMap: Record<string, string> = {
        'In Stock': 'in_stock',
        'Low Stock': 'low_stock',
        'Out of Stock': 'out_of_stock',
      }
      const status = availabilityMap[availability] || availability.toLowerCase().replace(' ', '_')
      filtered = filtered.filter(p => {
        const productAvailability = (p as any).availability || (p as any).availability_status
        return productAvailability === status
      })
    }

    return filtered
  }

  const fetchProducts = async () => {
    // Prevent multiple simultaneous calls
    if (fetchingRef.current) {
      console.log('[ProductGrid] Fetch already in progress, skipping...')
      return
    }
    
    // Clear any pending debounced calls
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
      fetchTimeoutRef.current = null
    }
    
    fetchingRef.current = true
    setLoading(true)
    setError('')

    try {
      // Read from sessionStorage instead of URL
      const query = sessionStorage.getItem('currentSearch') || ''
      const searchMode = sessionStorage.getItem('searchMode') || ''
      const imageSearch = searchMode === 'visual'
      const supportMode = searchMode === 'support'
      const explorationMode = searchMode === 'exploration'
      
      // Read filters from sessionStorage
      const filtersData = sessionStorage.getItem('activeFilters')
      let filters: any = {}
      if (filtersData) {
        try {
          filters = JSON.parse(filtersData)
        } catch (e) {
          console.error('Failed to parse filters:', e)
        }
      }
      
      const category = filters.category || ''
      const price = filters.price || ''
      const brand = filters.brand || ''
      const rating = filters.rating || ''
      const availability = filters.availability || ''

      // Skip product search when in support mode
      if (supportMode) {
        console.log('Support mode detected - skipping product search')
        setProducts([])
        setLoading(false)
        return
      }

      // Handle exploration mode - fetch products from intelligent search
      if (explorationMode && query) {
        console.log('[ProductGrid] Exploration mode detected - checking for stored results')
        const storedResults = sessionStorage.getItem('explorationSearchResults')
        if (storedResults) {
          try {
            const allResults = JSON.parse(storedResults)
            console.log('[ProductGrid] Loaded stored exploration results:', allResults.length, 'products')
            if (allResults.length > 0) {
              console.log('[ProductGrid] Sample products:', allResults.slice(0, 3).map((p: any) => p.title))
            }
            
            // Apply client-side filters
            const filtered = applyClientSideFilters(allResults)
            console.log('[ProductGrid] After applying filters:', filtered.length, 'products')
            
            setProducts(filtered)
            setLoading(false)
            fetchingRef.current = false
            return
          } catch (e) {
            console.error('[ProductGrid] Failed to parse stored exploration results:', e)
          }
        } else {
          console.warn('[ProductGrid] Exploration mode but no stored results found - results should be stored by SearchBar')
          // Set loading to false and wait for queryUpdated event to trigger reload
          setLoading(false)
          setProducts([])
          fetchingRef.current = false
          return
        }
      }

      // Check if this is an image search
      if (imageSearch) {
        console.log('Image search detected - checking for stored results')
        // Check if we have stored visual search results
        const storedResults = sessionStorage.getItem('visualSearchResults')
        if (storedResults) {
          try {
            const allResults = JSON.parse(storedResults)
            console.log('Loaded stored visual search results:', allResults.length, 'products')
            
            // Apply client-side filters to visual search results
            const filtered = applyClientSideFilters(allResults)
            console.log('After applying filters:', filtered.length, 'products')
            
            setProducts(filtered)
            setLoading(false)
            return
          } catch (e) {
            console.error('Failed to parse stored visual search results:', e)
          }
        }
        // If no stored results, wait for the visual search to complete
        setLoading(true)
        return
      }

      // Clear any stored visual/exploration search results when doing text search
      sessionStorage.removeItem('visualSearchResults')
      sessionStorage.removeItem('explorationSearchResults')

      // Build filter params
      const filterParams = {
        query: query.trim() || undefined,
        category: (category && category !== 'All Categories') ? category : undefined,
        price: (price && price !== 'All Prices') ? price : undefined,
        brand: (brand && brand !== 'All Brands') ? brand : undefined,
        rating: (rating && rating !== 'All Ratings') ? rating : undefined,
        availability: (availability && availability !== 'All') ? availability : undefined,
      }
      
      // Always use OpenSearch - it's the source of truth
      // Even with no query/filters, we'll fetch all products (match_all)
      const { searchProducts } = await import('@/lib/opensearch')
      
      console.log('Searching OpenSearch with filters:', filterParams)
      
      try {
        const result = await searchProducts(filterParams, 0, 1000) // Get all products, pagination handled client-side
        console.log('OpenSearch returned:', result.products.length, 'products')
        console.log('QueryInfo from result:', result.queryInfo ? 'present' : 'missing')
        
        // Store query info for QueryViewer
        // IMPORTANT: Don't overwrite exploration/semantic query info
        // When in exploration mode, intelligent search already stored a richer queryInfo
        if (result.queryInfo && !explorationMode) {
          const existingQuery = sessionStorage.getItem('opensearchQuery')
          const newQueryStr = JSON.stringify(result.queryInfo)
          
          // Only update and dispatch if query actually changed
          if (existingQuery !== newQueryStr) {
            console.log('[ProductGrid] Storing queryInfo and dispatching queryUpdated event')
            sessionStorage.setItem('opensearchQuery', newQueryStr)
            // Update ref to track this queryInfo (prevents refetch loop)
            lastQueryInfoRef.current = newQueryStr
            
            // Dispatch after fetch completes to update QueryViewer
            // Use setTimeout to ensure we're outside the fetch cycle
            setTimeout(() => {
              // Only dispatch if we're not currently fetching (prevents loops)
              if (!fetchingRef.current) {
                console.log('[ProductGrid] Dispatching queryUpdated event for QueryViewer')
                window.dispatchEvent(new Event('queryUpdated'))
              } else {
                console.log('[ProductGrid] Skipping queryUpdated dispatch - fetch in progress')
              }
            }, 100) // Slightly longer delay to ensure fetch cycle is complete
          } else {
            console.log('[ProductGrid] QueryInfo unchanged, skipping update')
            // Still update ref to track current state
            lastQueryInfoRef.current = newQueryStr
          }
        } else if (!result.queryInfo) {
          console.warn('[ProductGrid] No queryInfo in result - API may not be returning it')
        } else if (explorationMode) {
          console.log('[ProductGrid] Exploration mode - preserving existing queryInfo')
        }
        
        // Always use OpenSearch results, even if empty (means no matches with filters)
        setProducts(result.products)
      } catch (opensearchError: any) {
        // Only fallback to mock if there's a connection/network error
        const isConnectionError = opensearchError?.message?.includes('Failed to fetch') || 
                                  opensearchError?.message?.includes('NetworkError') ||
                                  opensearchError?.message?.includes('ECONNREFUSED') ||
                                  opensearchError?.message?.includes('connection')
        
        if (isConnectionError) {
          console.warn('OpenSearch connection failed, using mock data as fallback:', opensearchError?.message)
          const mockProducts = getMockProducts(category, price, brand, rating, availability)
          setProducts(mockProducts)
          setError('OpenSearch is unavailable. Showing mock data.')
        } else {
          // For other errors (like index not found, query errors), show empty or error
          console.error('OpenSearch query error:', opensearchError)
          setProducts([]) // Show empty results - OpenSearch is the source of truth
          setError('Unable to search products. Please ensure OpenSearch is configured and the product index exists.')
        }
      }
    } catch (err: any) {
      console.error('Error fetching products:', err)
      
      // Check if it's a connection error - only then use mock data
      const isConnectionError = err?.message?.includes('Connection error') || 
                               err?.message?.includes('Failed to fetch') ||
                               err?.message?.includes('ECONNREFUSED')
      
      if (isConnectionError) {
        console.warn('OpenSearch unavailable, using mock data as fallback')
        const category = searchParams.get('category') || ''
        const price = searchParams.get('price') || ''
        const brand = searchParams.get('brand') || ''
        const rating = searchParams.get('rating') || ''
        const availability = searchParams.get('availability') || ''
        const mockProducts = getMockProducts(category, price, brand, rating, availability)
        setProducts(mockProducts)
        setError('OpenSearch is unavailable. Showing mock data.')
      } else {
        // For other errors (index not found, query errors), show error and empty results
        setError(err?.message || 'Failed to load products from OpenSearch. Please ensure the product index exists and is populated.')
        setProducts([])
      }
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }
  
  // Debounced version of fetchProducts to prevent rapid successive calls
  const debouncedFetchProducts = () => {
    // Skip if already fetching
    if (fetchingRef.current) {
      console.log('[ProductGrid] Skipping debounced fetch - already in progress')
      return
    }
    
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
    }
    
    fetchTimeoutRef.current = setTimeout(() => {
      // Double-check before calling
      if (!fetchingRef.current) {
        fetchProducts()
      }
    }, 300) // 300ms debounce
  }

  const getMockProducts = (category?: string, price?: string, brand?: string, rating?: string, availability?: string): Product[] => {
    const allProducts: Product[] = [
      {
        id: '1',
        title: 'Classic Summer Dress',
        description: 'Elegant and comfortable summer dress perfect for any occasion',
        price: 89.99,
        image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop',
        category: 'Clothing',
        brand: 'LEXORA',
        rating: 4.5,
      },
      {
        id: '2',
        title: 'Wireless Headphones',
        description: 'Premium noise-cancelling headphones with 30-hour battery life',
        price: 199.99,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
        category: 'Electronics',
        brand: 'SoundMax',
        rating: 4.8,
      },
      {
        id: '3',
        title: 'Modern Coffee Maker',
        description: 'Smart coffee maker with programmable settings and thermal carafe',
        price: 149.99,
        image: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=400&h=400&fit=crop',
        category: 'Home & Garden',
        brand: 'BrewTech',
        rating: 4.6,
      },
      {
        id: '4',
        title: 'Running Shoes',
        description: 'Lightweight running shoes with superior cushioning and support',
        price: 129.99,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
        category: 'Sports & Outdoors',
        brand: 'RunFast',
        rating: 4.7,
      },
      {
        id: '5',
        title: 'Skincare Set',
        description: 'Complete skincare routine with cleanser, toner, and moisturizer',
        price: 79.99,
        image: 'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?w=400&h=400&fit=crop',
        category: 'Beauty & Personal Care',
        brand: 'Glow',
        rating: 4.4,
      },
      {
        id: '6',
        title: 'Designer Handbag',
        description: 'Luxury leather handbag with multiple compartments',
        price: 299.99,
        image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop',
        category: 'Clothing',
        brand: 'StyleCo',
        rating: 4.9,
      },
      {
        id: '7',
        title: 'Smart Watch',
        description: 'Fitness tracker with heart rate monitor and GPS',
        price: 249.99,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
        category: 'Electronics',
        brand: 'TechWear',
        rating: 4.6,
      },
      {
        id: '8',
        title: 'Yoga Mat',
        description: 'Eco-friendly yoga mat with superior grip and cushioning',
        price: 39.99,
        image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop',
        category: 'Sports & Outdoors',
        brand: 'ZenFit',
        rating: 4.5,
      },
      {
        id: '9',
        title: 'Leather Jacket',
        description: 'Classic biker-style leather jacket with quilted lining',
        price: 349.99,
        image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop',
        category: 'Clothing',
        brand: 'UrbanWear',
        rating: 4.7,
      },
      {
        id: '10',
        title: 'Gaming Laptop',
        description: 'High-performance gaming laptop with RTX graphics and 16GB RAM',
        price: 1299.99,
        image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop',
        category: 'Electronics',
        brand: 'GameTech',
        rating: 4.8,
      },
      {
        id: '11',
        title: 'Indoor Plant Set',
        description: 'Collection of 5 low-maintenance houseplants with decorative pots',
        price: 59.99,
        image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop',
        category: 'Home & Garden',
        brand: 'GreenLife',
        rating: 4.6,
      },
      {
        id: '12',
        title: 'Mountain Bike',
        description: 'Full-suspension mountain bike for trails and off-road adventures',
        price: 899.99,
        image: 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=400&h=400&fit=crop',
        category: 'Sports & Outdoors',
        brand: 'TrailBlazer',
        rating: 4.9,
      },
      {
        id: '13',
        title: 'Perfume Collection',
        description: 'Luxury fragrance set with 3 signature scents',
        price: 149.99,
        image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop',
        category: 'Beauty & Personal Care',
        brand: 'Essence',
        rating: 4.7,
      },
      {
        id: '14',
        title: 'Designer Sunglasses',
        description: 'UV-protection sunglasses with polarized lenses',
        price: 179.99,
        image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop',
        category: 'Clothing',
        brand: 'SunStyle',
        rating: 4.6,
      },
      {
        id: '15',
        title: 'Wireless Earbuds',
        description: 'True wireless earbuds with active noise cancellation',
        price: 129.99,
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop',
        category: 'Electronics',
        brand: 'AudioPro',
        rating: 4.5,
      },
      {
        id: '16',
        title: 'Stand Mixer',
        description: 'Professional stand mixer with multiple attachments',
        price: 399.99,
        image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=400&fit=crop',
        category: 'Home & Garden',
        brand: 'ChefPro',
        rating: 4.8,
      },
      {
        id: '17',
        title: 'Tennis Racket',
        description: 'Professional tennis racket with carbon fiber frame',
        price: 199.99,
        image: 'https://images.unsplash.com/photo-1622163642998-8bd9273a74d1?w=400&h=400&fit=crop',
        category: 'Sports & Outdoors',
        brand: 'AceSport',
        rating: 4.7,
      },
      {
        id: '18',
        title: 'Face Serum Set',
        description: 'Anti-aging serum collection with vitamin C and hyaluronic acid',
        price: 89.99,
        image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop',
        category: 'Beauty & Personal Care',
        brand: 'Radiant',
        rating: 4.6,
      },
      {
        id: '19',
        title: 'Casual Sneakers',
        description: 'Comfortable everyday sneakers with memory foam insoles',
        price: 79.99,
        image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop',
        category: 'Clothing',
        brand: 'ComfortWalk',
        rating: 4.5,
      },
      {
        id: '20',
        title: 'Tablet Pro',
        description: '12.9-inch tablet with stylus for creative professionals',
        price: 799.99,
        image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop',
        category: 'Electronics',
        brand: 'TechTab',
        rating: 4.8,
      },
      {
        id: '21',
        title: 'Throw Pillow Set',
        description: 'Set of 4 decorative throw pillows with modern patterns',
        price: 49.99,
        image: 'https://images.unsplash.com/photo-1584100936595-c0655c4e0181?w=400&h=400&fit=crop',
        category: 'Home & Garden',
        brand: 'HomeStyle',
        rating: 4.4,
      },
      {
        id: '22',
        title: 'Camping Tent',
        description: '4-person waterproof tent with easy setup',
        price: 249.99,
        image: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=400&h=400&fit=crop',
        category: 'Sports & Outdoors',
        brand: 'OutdoorPro',
        rating: 4.7,
      },
      {
        id: '23',
        title: 'Lipstick Collection',
        description: 'Set of 6 matte lipsticks in trending shades',
        price: 39.99,
        image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&h=400&fit=crop',
        category: 'Beauty & Personal Care',
        brand: 'ColorPop',
        rating: 4.5,
      },
      {
        id: '24',
        title: 'Wool Scarf',
        description: 'Premium cashmere blend scarf in multiple colors',
        price: 69.99,
        image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop',
        category: 'Clothing',
        brand: 'CozyWear',
        rating: 4.6,
      },
      {
        id: '25',
        title: 'Premium Leather Sofa',
        description: 'Handcrafted Italian leather sofa with memory foam cushions',
        price: 2499.99,
        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop',
        category: 'Home & Garden',
        brand: 'LuxuryHome',
        rating: 4.9,
      },
      {
        id: '26',
        title: 'Diamond Engagement Ring',
        description: '1.5 carat solitaire diamond ring in platinum setting',
        price: 8999.99,
        image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=400&fit=crop',
        category: 'Clothing',
        brand: 'JewelCraft',
        rating: 5.0,
      },
      {
        id: '27',
        title: 'Professional Camera Kit',
        description: 'Full-frame mirrorless camera with 24-70mm lens',
        price: 3499.99,
        image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&h=400&fit=crop',
        category: 'Electronics',
        brand: 'PhotoPro',
        rating: 4.9,
      },
      {
        id: '28',
        title: 'Luxury Watch Collection',
        description: 'Swiss-made automatic watch with sapphire crystal',
        price: 2499.99,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
        category: 'Clothing',
        brand: 'TimeLux',
        rating: 4.8,
      },
      {
        id: '29',
        title: 'Premium Sound System',
        description: '7.1 surround sound system with wireless subwoofer',
        price: 1999.99,
        image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
        category: 'Electronics',
        brand: 'AudioElite',
        rating: 4.9,
      },
      {
        id: '30',
        title: 'Designer Wardrobe Set',
        description: 'Complete luxury wardrobe with 20 premium pieces',
        price: 4999.99,
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=400&fit=crop',
        category: 'Clothing',
        brand: 'FashionElite',
        rating: 4.8,
      },
      {
        id: '31',
        title: 'Electric Sports Car',
        description: 'High-performance electric vehicle with 400+ mile range',
        price: 89999.99,
        image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=400&fit=crop',
        category: 'Electronics',
        brand: 'EcoDrive',
        rating: 4.9,
      },
      {
        id: '32',
        title: 'Luxury Yacht Model',
        description: 'Premium yacht accessories and navigation equipment',
        price: 14999.99,
        image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=400&fit=crop',
        category: 'Sports & Outdoors',
        brand: 'MarineLux',
        rating: 4.8,
      },
      {
        id: '33',
        title: 'Premium Skincare Collection',
        description: 'Luxury anti-aging skincare set with gold-infused serums',
        price: 599.99,
        image: 'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?w=400&h=400&fit=crop',
        category: 'Beauty & Personal Care',
        brand: 'GlowLux',
        rating: 4.9,
      },
      {
        id: '34',
        title: 'Executive Desk Set',
        description: 'Handcrafted mahogany desk with leather top and matching chair',
        price: 3499.99,
        image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
        category: 'Home & Garden',
        brand: 'OfficeElite',
        rating: 4.8,
      },
      {
        id: '35',
        title: 'Premium Golf Set',
        description: 'Professional golf clubs with titanium driver and putter',
        price: 1999.99,
        image: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&h=400&fit=crop',
        category: 'Sports & Outdoors',
        brand: 'GolfPro',
        rating: 4.9,
      },
      {
        id: '36',
        title: 'Luxury Perfume Set',
        description: 'Exclusive fragrance collection with 5 signature scents',
        price: 399.99,
        image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop',
        category: 'Beauty & Personal Care',
        brand: 'EssenceLux',
        rating: 4.8,
      },
      {
        id: '37',
        title: 'Premium Home Theater',
        description: '4K projector with 120" screen and Dolby Atmos sound',
        price: 4999.99,
        image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=400&fit=crop',
        category: 'Electronics',
        brand: 'CinemaPro',
        rating: 4.9,
      },
      {
        id: '38',
        title: 'Designer Jewelry Set',
        description: '18k gold necklace, earrings, and bracelet collection',
        price: 2999.99,
        image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop',
        category: 'Clothing',
        brand: 'JewelElite',
        rating: 4.8,
      },
      {
        id: '39',
        title: 'Luxury Kitchen Package',
        description: 'Professional-grade appliances with smart connectivity',
        price: 8999.99,
        image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=400&fit=crop',
        category: 'Home & Garden',
        brand: 'ChefElite',
        rating: 4.9,
      },
      {
        id: '40',
        title: 'Premium Fitness Equipment',
        description: 'Complete home gym with adjustable weights and cardio machines',
        price: 5999.99,
        image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop',
        category: 'Sports & Outdoors',
        brand: 'FitElite',
        rating: 4.8,
      },
      {
        id: '41',
        title: 'Luxury Handbag Collection',
        description: 'Set of 3 designer handbags in premium leather',
        price: 1999.99,
        image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop',
        category: 'Clothing',
        brand: 'BagLux',
        rating: 4.9,
      },
      {
        id: '42',
        title: 'Premium Audio Headphones',
        description: 'Studio-quality headphones with planar magnetic drivers',
        price: 899.99,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
        category: 'Electronics',
        brand: 'AudioElite',
        rating: 4.9,
      },
      {
        id: '43',
        title: 'Luxury Bedroom Set',
        description: 'King-size bed frame with premium mattress and nightstands',
        price: 4499.99,
        image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=400&fit=crop',
        category: 'Home & Garden',
        brand: 'SleepLux',
        rating: 4.8,
      },
      {
        id: '44',
        title: 'Premium Makeup Collection',
        description: 'Complete luxury makeup set with 50+ shades',
        price: 499.99,
        image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&h=400&fit=crop',
        category: 'Beauty & Personal Care',
        brand: 'BeautyElite',
        rating: 4.8,
      },
      {
        id: '45',
        title: 'Designer Sunglasses Set',
        description: 'Collection of 5 luxury sunglasses with UV protection',
        price: 799.99,
        image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop',
        category: 'Clothing',
        brand: 'SunLux',
        rating: 4.7,
      },
      {
        id: '46',
        title: 'Premium Smart Home System',
        description: 'Complete smart home automation with voice control',
        price: 2999.99,
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
        category: 'Electronics',
        brand: 'SmartElite',
        rating: 4.9,
      },
      {
        id: '47',
        title: 'Luxury Outdoor Furniture',
        description: 'Premium teak outdoor dining set with weather-resistant cushions',
        price: 3499.99,
        image: 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=400&fit=crop',
        category: 'Home & Garden',
        brand: 'OutdoorLux',
        rating: 4.8,
      },
      {
        id: '48',
        title: 'Premium Wine Collection',
        description: 'Curated selection of 12 fine wines from renowned vineyards',
        price: 999.99,
        image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=400&fit=crop',
        category: 'Home & Garden',
        brand: 'VineLux',
        rating: 4.9,
      },
      {
        id: '49',
        title: 'Luxury Watch Collection',
        description: 'Set of 3 premium timepieces with automatic movements',
        price: 5999.99,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
        category: 'Clothing',
        brand: 'TimeElite',
        rating: 4.9,
      },
      {
        id: '50',
        title: 'Premium Gaming Setup',
        description: 'Complete gaming station with 4K monitor and RGB lighting',
        price: 3999.99,
        image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop',
        category: 'Electronics',
        brand: 'GameElite',
        rating: 4.8,
      },
      {
        id: '52',
        title: 'Diamond Necklace',
        description: '18K gold necklace with certified diamonds',
        price: 3499.99,
        image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop',
        category: 'Clothing',
        brand: 'Elegance',
        rating: 5.0,
      },
      {
        id: '53',
        title: 'Professional Camera',
        description: 'Full-frame mirrorless camera with 4K video',
        price: 2799.99,
        image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=400&fit=crop',
        category: 'Electronics',
        brand: 'PhotoPro',
        rating: 4.9,
      },
      {
        id: '54',
        title: 'Luxury Watch',
        description: 'Swiss-made automatic watch with sapphire crystal',
        price: 1899.99,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
        category: 'Clothing',
        brand: 'TimeMaster',
        rating: 4.8,
      },
      {
        id: '55',
        title: 'Designer Sunglasses',
        description: 'Luxury aviator sunglasses with polarized lenses',
        price: 399.99,
        image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop',
        category: 'Clothing',
        brand: 'LuxStyle',
        rating: 4.7,
      },
      {
        id: '56',
        title: 'Premium Sound System',
        description: '7.1 surround sound system with wireless subwoofer',
        price: 1299.99,
        image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop',
        category: 'Electronics',
        brand: 'AudioElite',
        rating: 4.9,
      },
      {
        id: '57',
        title: 'Designer Suit',
        description: 'Tailored Italian wool suit with silk lining',
        price: 899.99,
        image: 'https://images.unsplash.com/photo-1594938291221-94f18ba8b1c4?w=400&h=400&fit=crop',
        category: 'Clothing',
        brand: 'TailorMade',
        rating: 4.8,
      },
      {
        id: '58',
        title: 'Electric Vehicle',
        description: 'Premium electric scooter with 50-mile range',
        price: 1999.99,
        image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop',
        category: 'Electronics',
        brand: 'EcoRide',
        rating: 4.7,
      },
      {
        id: '59',
        title: 'Luxury Perfume',
        description: 'Exclusive fragrance with rare ingredients',
        price: 299.99,
        image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop',
        category: 'Beauty & Personal Care',
        brand: 'Prestige',
        rating: 4.8,
      },
      {
        id: '60',
        title: 'Premium Mattress',
        description: 'Memory foam mattress with cooling gel technology',
        price: 1499.99,
        image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=400&fit=crop',
        category: 'Home & Garden',
        brand: 'SleepLux',
        rating: 4.9,
      },
      {
        id: '61',
        title: 'Designer Heels',
        description: 'Italian leather high heels with crystal embellishments',
        price: 449.99,
        image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop',
        category: 'Clothing',
        brand: 'HeelCouture',
        rating: 4.7,
      },
      {
        id: '62',
        title: 'Smart Home Hub',
        description: 'AI-powered home automation system with voice control',
        price: 599.99,
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
        category: 'Electronics',
        brand: 'SmartHome',
        rating: 4.8,
      },
      {
        id: '63',
        title: 'Premium Golf Clubs',
        description: 'Professional titanium golf club set with carbon shafts',
        price: 1799.99,
        image: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&h=400&fit=crop',
        category: 'Sports & Outdoors',
        brand: 'ProGolf',
        rating: 4.9,
      },
      {
        id: '64',
        title: 'Luxury Skincare',
        description: 'Anti-aging serum with 24K gold and caviar extract',
        price: 199.99,
        image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop',
        category: 'Beauty & Personal Care',
        brand: 'GoldSkin',
        rating: 4.8,
      },
      {
        id: '65',
        title: 'Designer Backpack',
        description: 'Premium leather backpack with laptop compartment',
        price: 349.99,
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
        category: 'Clothing',
        brand: 'UrbanLux',
        rating: 4.6,
      },
      {
        id: '66',
        title: 'Premium Espresso Machine',
        description: 'Commercial-grade espresso machine with dual boiler',
        price: 1299.99,
        image: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=400&h=400&fit=crop',
        category: 'Home & Garden',
        brand: 'CafePro',
        rating: 4.9,
      },
      {
        id: '67',
        title: 'Luxury Yacht Model',
        description: 'Handcrafted model yacht with detailed interior',
        price: 599.99,
        image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=400&fit=crop',
        category: 'Home & Garden',
        brand: 'ModelCraft',
        rating: 4.7,
      },
      {
        id: '68',
        title: 'Premium Headphones',
        description: 'Studio-quality headphones with planar magnetic drivers',
        price: 799.99,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
        category: 'Electronics',
        brand: 'AudioMaster',
        rating: 4.9,
      },
      {
        id: '69',
        title: 'Designer Coat',
        description: 'Wool blend overcoat with cashmere lining',
        price: 599.99,
        image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop',
        category: 'Clothing',
        brand: 'WinterLux',
        rating: 4.8,
      },
      {
        id: '70',
        title: 'Premium Fitness Equipment',
        description: 'Professional home gym with adjustable weights',
        price: 1999.99,
        image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop',
        category: 'Sports & Outdoors',
        brand: 'FitElite',
        rating: 4.9,
      },
      {
        id: '71',
        title: 'Luxury Candle Set',
        description: 'Hand-poured soy candles with premium fragrances',
        price: 89.99,
        image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&h=400&fit=crop',
        category: 'Home & Garden',
        brand: 'AromaLux',
        rating: 4.7,
      },
      {
        id: '72',
        title: 'Designer Jewelry Set',
        description: '18K gold jewelry set with diamonds and pearls',
        price: 2499.99,
        image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop',
        category: 'Clothing',
        brand: 'JewelLux',
        rating: 4.9,
      },
      {
        id: '73',
        title: 'Premium VR Headset',
        description: '4K VR headset with eye tracking and haptic feedback',
        price: 899.99,
        image: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=400&h=400&fit=crop',
        category: 'Electronics',
        brand: 'VRLux',
        rating: 4.8,
      },
      {
        id: '74',
        title: 'Luxury Wine Collection',
        description: 'Curated collection of premium wines from renowned vineyards',
        price: 499.99,
        image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=400&fit=crop',
        category: 'Home & Garden',
        brand: 'VineLux',
        rating: 4.9,
      },
    ]

    let filtered = allProducts

    if (category && category !== 'All Categories') {
      filtered = filtered.filter((p) => p.category === category)
    }

    if (price && price !== 'All Prices') {
      const range = getPriceRange(price)
      filtered = filtered.filter((p) => p.price >= range.min && p.price <= range.max)
    }

    if (brand && brand !== 'All Brands') {
      filtered = filtered.filter((p) => p.brand === brand)
    }

    if (rating && rating !== 'All Ratings') {
      const minRating = getRatingMin(rating)
      filtered = filtered.filter((p) => p.rating && p.rating >= minRating)
    }

    // Note: Availability filter would require availability field in products
    // For now, we'll skip it or add mock availability

    return filtered
  }

  const getPriceRange = (priceLabel: string): { min: number; max: number } => {
    const ranges: Record<string, { min: number; max: number }> = {
      'Under $50': { min: 0, max: 50 },
      '$50 - $100': { min: 50, max: 100 },
      '$100 - $200': { min: 100, max: 200 },
      '$200 - $400': { min: 200, max: 400 },
      '$400 - $1000': { min: 400, max: 1000 },
      'Over $1000': { min: 1000, max: Infinity },
    }
    return ranges[priceLabel] || { min: 0, max: Infinity }
  }

  const getRatingMin = (ratingLabel: string): number => {
    const ratings: Record<string, number> = {
      '4.5+ Stars': 4.5,
      '4.0+ Stars': 4.0,
      '3.5+ Stars': 3.5,
    }
    return ratings[ratingLabel] || 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    )
  }

  // Don't render if there's no active search
  const hasActiveSearch = sessionStorage.getItem('currentSearch') ||
                         sessionStorage.getItem('searchMode') ||
                         sessionStorage.getItem('visualSearchResults') ||
                         sessionStorage.getItem('explorationSearchResults')
  
  if (!hasActiveSearch && products.length === 0) {
    return null // Let TrendingProducts show instead
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 font-medium">No products found</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
        {currentProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {products.length > 0 && (
        <div className="mt-12 pt-8 border-t border-gray-200/60">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm font-medium text-gray-700">
              Showing <span className="text-indigo-600 font-semibold">{startIndex + 1}</span> - <span className="text-indigo-600 font-semibold">{Math.min(endIndex, products.length)}</span> of <span className="text-gray-900 font-semibold">{products.length}</span> products
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 hover:border-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-sm hover:shadow"
                >
                  <ChevronLeft className="w-4 h-4 inline mr-1" />
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${
                            currentPage === page
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md scale-105'
                              : 'border border-gray-300 bg-white hover:bg-gray-50 hover:border-indigo-300 text-gray-700 hover:shadow'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="px-2 text-gray-400 font-medium">...</span>
                    }
                    return null
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 hover:border-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-sm hover:shadow"
                >
                  Next
                  <ChevronRight className="w-4 h-4 inline ml-1" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
