'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Filter, X } from 'lucide-react'
import { clearSearchState } from '@/lib/searchState'

const CATEGORIES = [
  'All Categories',
  'Electronics',
  'Accessories',
  'Furniture',
  'Clothing',
  'Shoes',
  'Home Decor',
  'Watches',
  'Cameras',
]

const PRICE_RANGES = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: 'Under $50', min: 0, max: 50 },
  { label: '$50 - $100', min: 50, max: 100 },
  { label: '$100 - $200', min: 100, max: 200 },
  { label: '$200 - $400', min: 200, max: 400 },
  { label: '$400 - $1000', min: 400, max: 1000 },
  { label: 'Over $1000', min: 1000, max: Infinity },
]

const BRANDS = [
  'All Brands',
  // Sample products
  'AudioTech',
  'FitPro',
  'UrbanCarry',
  'PhotoMaster',
  'ComfortSeating',
  'HydroLife',
  'GameTech',
  'SoundWave',
  // Premium tech products
  'Apple',
  'Sony',
  'Rolex',
  'Canon',
  'Herman Miller',
  'Uplift',
  'LG',
  'Keychron',
  'Sonos',
  'DJI',
  'Elgato',
  'Peak Design',
  'Logitech',
  'Manfrotto',
  'ASUS',
  // Lifestyle / fashion / home from additional_products
  "Levi's",
  'Patagonia',
  'Nike',
  'Ralph Lauren',
  'Lululemon',
  'Clarks',
  'Vans',
  'Dr. Martens',
  'West Elm',
  'Pottery Barn',
  'CB2',
  'Crate & Barrel',
  'Anthropologie',
  'Restoration Hardware',
  'Serena & Lily',
  'Rejuvenation',
  'Parachute',
  'Article',
]

const RATINGS = [
  { label: 'All Ratings', min: 0 },
  { label: '4.5+ Stars', min: 4.5 },
  { label: '4.0+ Stars', min: 4.0 },
  { label: '3.5+ Stars', min: 3.5 },
]

const AVAILABILITY = [
  'All',
  'In Stock',
  'Low Stock',
  'Out of Stock',
]

export default function FilterSidebar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || 'All Categories'
  )
  const [selectedPriceRange, setSelectedPriceRange] = useState(
    searchParams.get('price') || 'All Prices'
  )
  const [selectedBrand, setSelectedBrand] = useState(
    searchParams.get('brand') || 'All Brands'
  )
  const [selectedRating, setSelectedRating] = useState(
    searchParams.get('rating') || 'All Ratings'
  )
  const [selectedAvailability, setSelectedAvailability] = useState(
    searchParams.get('availability') || 'All'
  )

  const updateFilters = (updates?: {
    category?: string
    priceRange?: string
    brand?: string
    rating?: string
    availability?: string
  }) => {
    const category = updates?.category ?? selectedCategory
    const priceRange = updates?.priceRange ?? selectedPriceRange
    const brand = updates?.brand ?? selectedBrand
    const rating = updates?.rating ?? selectedRating
    const availability = updates?.availability ?? selectedAvailability
    
    console.log('FilterSidebar: Updating filters with:', {
      category,
      priceRange,
      brand,
      rating,
      availability,
    })
    
    // Store filters in sessionStorage instead of URL
    const filters = {
      category: category !== 'All Categories' ? category : undefined,
      price: priceRange !== 'All Prices' ? priceRange : undefined,
      brand: brand !== 'All Brands' ? brand : undefined,
      rating: rating !== 'All Ratings' ? rating : undefined,
      availability: availability !== 'All' ? availability : undefined,
    }
    
    sessionStorage.setItem('activeFilters', JSON.stringify(filters))
    
    // Trigger a custom event to notify components about filter change
    window.dispatchEvent(new CustomEvent('filtersChanged', { detail: filters }))
    
    // Stay on the same page without URL changes
    router.replace('/')
  }

  const clearFilters = () => {
    setSelectedCategory('All Categories')
    setSelectedPriceRange('All Prices')
    setSelectedBrand('All Brands')
    setSelectedRating('All Ratings')
    setSelectedAvailability('All')
    
    // Clear filters (but keep currentSearch/searchMode so text queries remain)
    clearSearchState('filters_only')
    
    router.push('/')
  }

  const hasActiveFilters = 
    selectedCategory !== 'All Categories' || 
    selectedPriceRange !== 'All Prices' ||
    selectedBrand !== 'All Brands' ||
    selectedRating !== 'All Ratings' ||
    selectedAvailability !== 'All'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-medium text-gray-700 mb-2">Category</h3>
          <div className="space-y-1">
            {CATEGORIES.map((category) => (
              <label
                key={category}
                className={`flex items-center cursor-pointer p-2 rounded transition ${
                  selectedCategory === category
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={category}
                  checked={selectedCategory === category}
                  onChange={(e) => {
                    const newValue = e.target.value
                    setSelectedCategory(newValue)
                    updateFilters({ category: newValue })
                  }}
                  className="w-3 h-3 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                />
                <span className="ml-2 text-xs">{category}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium text-gray-700 mb-2">Price</h3>
          <div className="space-y-1">
            {PRICE_RANGES.map((range) => (
              <label
                key={range.label}
                className={`flex items-center cursor-pointer p-2 rounded transition ${
                  selectedPriceRange === range.label
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="price"
                  value={range.label}
                  checked={selectedPriceRange === range.label}
                  onChange={(e) => {
                    const newValue = e.target.value
                    setSelectedPriceRange(newValue)
                    updateFilters({ priceRange: newValue })
                  }}
                  className="w-3 h-3 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                />
                <span className="ml-2 text-xs">{range.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium text-gray-700 mb-2">Brand</h3>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {BRANDS.map((brand) => (
              <label
                key={brand}
                className={`flex items-center cursor-pointer p-2 rounded transition ${
                  selectedBrand === brand
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="brand"
                  value={brand}
                  checked={selectedBrand === brand}
                  onChange={(e) => {
                    const newValue = e.target.value
                    setSelectedBrand(newValue)
                    updateFilters({ brand: newValue })
                  }}
                  className="w-3 h-3 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                />
                <span className="ml-2 text-xs">{brand}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium text-gray-700 mb-2">Rating</h3>
          <div className="space-y-1">
            {RATINGS.map((rating) => (
              <label
                key={rating.label}
                className={`flex items-center cursor-pointer p-2 rounded transition ${
                  selectedRating === rating.label
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="rating"
                  value={rating.label}
                  checked={selectedRating === rating.label}
                  onChange={(e) => {
                    const newValue = e.target.value
                    setSelectedRating(newValue)
                    updateFilters({ rating: newValue })
                  }}
                  className="w-3 h-3 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                />
                <span className="ml-2 text-xs">{rating.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium text-gray-700 mb-2">Availability</h3>
          <div className="space-y-1">
            {AVAILABILITY.map((avail) => (
              <label
                key={avail}
                className={`flex items-center cursor-pointer p-2 rounded transition ${
                  selectedAvailability === avail
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="availability"
                  value={avail}
                  checked={selectedAvailability === avail}
                  onChange={(e) => {
                    const newValue = e.target.value
                    setSelectedAvailability(newValue)
                    updateFilters({ availability: newValue })
                  }}
                  className="w-3 h-3 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                />
                <span className="ml-2 text-xs">{avail}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
