import { NextRequest, NextResponse } from 'next/server'
import { OPENSEARCH_HOST, PRODUCT_INDEX } from '@/lib/config'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

interface ProductFilters {
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
    const body = await request.json()
    const { filters, from = 0, size = 1000 } = body as { filters: ProductFilters; from?: number; size?: number }
    
    console.log('API received filters:', filters)

    // Build OpenSearch query with filters
    const mustClauses: any[] = []
    const filterClauses: any[] = []

    // Text search query (if provided)
    // Uses vector search with OpenAI embeddings for semantic understanding
    if (filters.query && filters.query.trim()) {
      try {
        // Generate embedding for the search query
        // Use text-embedding-ada-002 to match ingestion script
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: filters.query,
        })
        
        const queryEmbedding = embeddingResponse.data[0].embedding
        
        // Use KNN vector search for semantic similarity
        mustClauses.push({
          knn: {
            text_embedding_vector: {
              vector: queryEmbedding,
              k: 100, // Number of nearest neighbors to retrieve
            },
          },
        })
        
        console.log('Using vector search for query:', filters.query)
      } catch (error) {
        console.error('Error generating embedding, falling back to text search:', error)
        // Fallback to traditional text search if embedding fails
        mustClauses.push({
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
    } else {
      // If no query, match all products
      mustClauses.push({ match_all: {} })
    }

    // Hard filters (using filter clause - no scoring impact)
    // These use exact term matching on keyword fields for precise filtering
    if (filters.category && filters.category !== 'All Categories') {
      filterClauses.push({
        term: { 
          category: filters.category  // Uses keyword field for exact match
        },
      })
    }

    if (filters.brand && filters.brand !== 'All Brands') {
      filterClauses.push({
        term: { 
          brand: filters.brand  // Uses keyword field for exact match
        },
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
      // Map availability labels to status values
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

    // Build the complete query
    const query: any = {
      bool: {
        must: mustClauses,
      },
    }

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

    console.log('OpenSearch query:', JSON.stringify(searchBody, null, 2))

    // Make request to OpenSearch
    const response = await fetch(`${OPENSEARCH_HOST}/${PRODUCT_INDEX}/_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      const errorMessage = `OpenSearch error: ${response.status} ${response.statusText}`
      
      // Check if it's a connection error
      if (response.status === 0 || errorText.includes('ECONNREFUSED') || errorText.includes('Failed to fetch')) {
        throw new Error(`Connection error: Unable to connect to OpenSearch at ${OPENSEARCH_HOST}`)
      }
      
      // Check if index doesn't exist
      if (response.status === 404 || errorText.includes('index_not_found')) {
        throw new Error(`Index not found: ${PRODUCT_INDEX} does not exist. Please create the index first.`)
      }
      
      throw new Error(`${errorMessage} - ${errorText}`)
    }

    const data = await response.json()
    const hits = data.hits?.hits || []
    const total = data.hits?.total?.value || data.hits?.total || 0

    console.log(`OpenSearch response: ${hits.length} hits, total: ${total}`)

    // Transform OpenSearch results to Product format
    const products = hits.map((hit: any) => {
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
      }
    })

    // Store query for viewer
    const queryInfo = storeQueryForViewer(searchBody, PRODUCT_INDEX)
    
    return NextResponse.json({
      products,
      total,
      queryInfo // Include query info for debugging
    })
  } catch (error: any) {
    console.error('Error searching OpenSearch:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    })
    return NextResponse.json(
      { error: error.message || 'Failed to search products' },
      { status: 500 }
    )
  }
}
