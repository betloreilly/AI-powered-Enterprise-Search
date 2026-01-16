'use client'

import { useState, useEffect } from 'react'
import ProductCard from './ProductCard'
import { TrendingUp, Loader2 } from 'lucide-react'

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

export default function TrendingProducts() {
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [hasActiveSearch, setHasActiveSearch] = useState(false)

  useEffect(() => {
    // Check if there's an active search - if so, don't show trending
    const checkActiveSearch = () => {
      const currentSearch = sessionStorage.getItem('currentSearch')
      const searchMode = sessionStorage.getItem('searchMode')
      const visualResults = sessionStorage.getItem('visualSearchResults')
      const explorationResults = sessionStorage.getItem('explorationSearchResults')
      
      setHasActiveSearch(!!(currentSearch || searchMode || visualResults || explorationResults))
    }
    
    checkActiveSearch()
    fetchTrendingProducts()
    
    // Listen for search updates
    window.addEventListener('queryUpdated', checkActiveSearch)
    window.addEventListener('filtersChanged', checkActiveSearch)
    
    return () => {
      window.removeEventListener('queryUpdated', checkActiveSearch)
      window.removeEventListener('filtersChanged', checkActiveSearch)
    }
  }, [])

  const fetchTrendingProducts = async () => {
    setLoading(true)
    try {
      const { searchProducts } = await import('@/lib/opensearch')
      
      // Fetch trending products from OpenSearch (high rating, sorted by trending_score)
      const result = await searchProducts({}, 0, 6)
      
      // Sort by rating and trending_score if available
      const sorted = result.products.sort((a, b) => {
        const ratingDiff = (b.rating || 0) - (a.rating || 0)
        if (ratingDiff !== 0) return ratingDiff
        return b.price - a.price // Secondary sort by price for premium items
      })
      
      setTrendingProducts(sorted.slice(0, 6))
    } catch (error) {
      console.error('Error fetching trending products:', error)
      setTrendingProducts([])
    } finally {
      setLoading(false)
    }
  }

  // Hide trending products when there's an active search
  if (hasActiveSearch) {
    return null
  }

  if (loading) {
    return (
      <div className="mb-16">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 rounded-xl shadow-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Trending Products</h2>
            <p className="text-sm text-gray-600 mt-1">Handpicked selections for you</p>
          </div>
        </div>
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </div>
    )
  }

  if (trendingProducts.length === 0) {
    return null
  }

  return (
    <div className="mb-16">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 rounded-xl shadow-lg">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Trending Products</h2>
          <p className="text-sm text-gray-600 mt-1">Handpicked selections for you</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
        {trendingProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
