import { NextRequest, NextResponse } from 'next/server'
import { OPENSEARCH_HOST, PRODUCT_INDEX } from '@/lib/config'

// Helper to store query for debugging
function storeQueryForViewer(query: any, index: string) {
  return {
    index,
    query: query.query,
    size: query.size,
    from: query.from,
    sort: query.sort,
    timestamp: new Date().toISOString()
  }
}

interface VisualSearchFilters {
  category?: string
  price?: string
  brand?: string
  rating?: string
  availability?: string
  query?: string
}

function getPriceRange(priceLabel: string): { min: number; max: number } | null {
  const ranges: Record<string, { min: number; max: number }> = {
    'Under $50': { min: 0, max: 50 },
    '$50 - $100': { min: 50, max: 100 },
    '$100 - $200': { min: 100, max: 200 },
    '$200 - $400': { min: 200, max: 400 },
    '$400 - $1000': { min: 400, max: 1000 },
    'Over $1000': { min: 1000, max: Infinity },
  }
  return ranges[priceLabel] || null
}

function getRatingMin(ratingLabel: string): number | null {
  const ratings: Record<string, number> = {
    '4.5+ Stars': 4.5,
    '4.0+ Stars': 4.0,
    '3.5+ Stars': 3.5,
  }
  return ratings[ratingLabel] || null
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Visual search request received')
    const body = await request.json()
    console.log('[API] Request body keys:', Object.keys(body))
    
    const { embedding, filters: filtersData, from = 0, size = 50, minScore = 0.5 } = body

    if (!embedding || !Array.isArray(embedding)) {
      console.error('[API] Invalid embedding:', {
        hasEmbedding: !!embedding,
        isArray: Array.isArray(embedding),
        type: typeof embedding
      })
      return NextResponse.json(
        { error: 'No embedding provided or invalid format' },
        { status: 400 }
      )
    }

    const filters: VisualSearchFilters = filtersData || {}
    
    console.log('[API] Visual search parameters:', {
      embeddingDimension: embedding.length,
      embeddingSample: embedding.slice(0, 5),
      filters,
      from,
      size
    })

    // Build OpenSearch query with KNN and filters
    const filterClauses: any[] = []

    // Hard filters (using filter clause - no scoring impact)
    if (filters.category && filters.category !== 'All Categories') {
      filterClauses.push({
        term: { category: filters.category },
      })
    }

    if (filters.brand && filters.brand !== 'All Brands') {
      filterClauses.push({
        term: { brand: filters.brand },
      })
    }

    if (filters.price && filters.price !== 'All Prices') {
      const priceRange = getPriceRange(filters.price)
      if (priceRange) {
        const rangeQuery: any = {
          range: {
            price: {
              gte: priceRange.min,
            },
          },
        }
        if (priceRange.max !== Infinity) {
          rangeQuery.range.price.lte = priceRange.max
        }
        filterClauses.push(rangeQuery)
      }
    }

    if (filters.rating && filters.rating !== 'All Ratings') {
      const minRating = getRatingMin(filters.rating)
      if (minRating !== null) {
        filterClauses.push({
          range: {
            rating: {
              gte: minRating,
            },
          },
        })
      }
    }

    if (filters.availability && filters.availability !== 'All') {
      const availabilityMap: Record<string, string> = {
        'In Stock': 'in_stock',
        'Low Stock': 'low_stock',
        'Out of Stock': 'out_of_stock',
      }
      const status = availabilityMap[filters.availability] || filters.availability.toLowerCase().replace(' ', '_')
      filterClauses.push({
        term: { availability_status: status },
      })
    }

    // Build query with KNN for visual similarity
    const query: any = {
      bool: {
        must: [
          {
            knn: {
              image_embedding_vector: {
                vector: embedding,
                k: size,
              },
            },
          },
        ],
      },
    }

    // Add text search if provided
    if (filters.query && filters.query.trim()) {
      query.bool.must.push({
        multi_match: {
          query: filters.query,
          fields: [
            'title^3',
            'description^2',
            'derived_keywords^2',
            'brand.text^1.5',
            'category.text^1.5',
          ],
          type: 'best_fields',
          operator: 'or',
          fuzziness: 'AUTO',
        },
      })
    }

    // Add filters
    if (filterClauses.length > 0) {
      query.bool.filter = filterClauses
    }

    const searchBody = {
      query,
      from,
      size,
      sort: [
        { _score: { order: 'desc' } },
        { rating: { order: 'desc', missing: '_last' } },
      ],
    }

    console.log('[API] OpenSearch query:', JSON.stringify(searchBody, null, 2))

    // Make request to OpenSearch
    console.log('[API] Sending request to OpenSearch...')
    const response = await fetch(`${OPENSEARCH_HOST}/${PRODUCT_INDEX}/_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody),
    })

    console.log('[API] OpenSearch response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[API] OpenSearch error response:', errorText)
      const errorMessage = `OpenSearch error: ${response.status} ${response.statusText}`
      
      if (response.status === 0 || errorText.includes('ECONNREFUSED') || errorText.includes('Failed to fetch')) {
        throw new Error(`Connection error: Unable to connect to OpenSearch at ${OPENSEARCH_HOST}`)
      }
      
      if (response.status === 404 || errorText.includes('index_not_found')) {
        throw new Error(`Index not found: ${PRODUCT_INDEX} does not exist. Please create the index first.`)
      }
      
      throw new Error(`${errorMessage} - ${errorText}`)
    }

    const data = await response.json()
    const hits = data.hits?.hits || []
    const total = data.hits?.total?.value || data.hits?.total || 0

    console.log(`[API] OpenSearch response: ${hits.length} hits, total: ${total}`)
    if (hits.length > 0) {
      console.log('[API] Sample hit:', JSON.stringify(hits[0], null, 2))
    }

    // Filter by minimum similarity score and transform to Product format
    const products = hits
      .filter((hit: any) => {
        // OpenSearch cosine similarity scores are already 0-1 (1 = identical, 0 = opposite)
        return hit._score >= minScore
      })
      .map((hit: any) => {
        const source = hit._source
        return {
          id: source.product_id || source.id || hit._id,
          title: source.title || '',
          description: source.description || '',
          price: source.price || 0,
          image: source.image || source.product_images_urls?.[0] || 'https://via.placeholder.com/400',
          category: source.category || '',
          brand: source.brand || source.normalized_brand || '',
          rating: source.rating || undefined,
          availability: source.availability_status || source.availability,
          similarityScore: hit._score,
        }
      })

    console.log(`[API] Filtered to ${products.length} products with score >= ${minScore}`)
    if (products.length > 0) {
      console.log('[API] Score range:', {
        highest: products[0]?.similarityScore,
        lowest: products[products.length - 1]?.similarityScore
      })
    }
    
    // Store query for viewer
    const queryInfo = storeQueryForViewer(searchBody, PRODUCT_INDEX)
    
    return NextResponse.json({
      products,
      total: products.length,
      queryInfo // Include query info for debugging
    })
  } catch (error: any) {
    console.error('[API] Error in visual search:', error)
    console.error('[API] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    })
    return NextResponse.json(
      { error: error.message || 'Failed to perform visual search' },
      { status: 500 }
    )
  }
}

// Made with Bob
