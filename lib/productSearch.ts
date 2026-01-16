import { OPENSEARCH_HOST, PRODUCT_INDEX } from '@/lib/config'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ProductFilters {
  category?: string
  price?: string
  brand?: string
  rating?: string
  availability?: string
  query?: string
}

/**
 * Infer allowed product categories based on shopping intent using LLM
 * Dynamically determines relevant categories and excludes irrelevant ones
 */
async function inferAllowedCategories(query: string): Promise<{ allowed: string[], excluded: string[] }> {
  try {
    const availableCategories = [
      'Electronics', 'Clothing', 'Shoes', 'Furniture', 'Home Decor', 
      'Sports & Outdoors', 'Accessories', 'Watches', 'Cameras'
    ]

    const prompt = `You are a shopping assistant analyzing a user's query to determine which product categories are relevant for their shopping intent.

User query: "${query}"

Available product categories: ${availableCategories.join(', ')}

Based on the user's shopping intent, determine:
1. Which categories are RELEVANT and should be included (allowed)
2. Which categories are IRRELEVANT and should be excluded

Return ONLY a JSON object in this exact format:
{
  "allowed": ["Category1", "Category2"],
  "excluded": ["Category3", "Category4"],
  "reasoning": "brief explanation"
}

Guidelines:
- Be specific: if the user wants gym equipment, allow Sports & Outdoors, Clothing, Shoes, Accessories
- Exclude clearly irrelevant categories: if they want gym stuff, exclude Electronics, Home Decor, Furniture
- If the intent is unclear or could apply to many categories, return empty arrays for both
- Only use categories from the available list above`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful shopping assistant that determines product category relevance. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.warn('[Product Search] LLM returned no content for category inference, using no restrictions')
      return { allowed: [], excluded: [] }
    }

    const parsed = JSON.parse(content)
    const allowed = Array.isArray(parsed.allowed) ? parsed.allowed : []
    const excluded = Array.isArray(parsed.excluded) ? parsed.excluded : []
    
    console.log('[Product Search] LLM category inference:', {
      query,
      allowed,
      excluded,
      reasoning: parsed.reasoning
    })

    return { allowed, excluded }
  } catch (error) {
    console.error('[Product Search] Error inferring categories with LLM:', error)
    // Fallback: no restrictions if LLM fails
    return { allowed: [], excluded: [] }
  }
}

/**
 * Perform semantic product search using OpenAI embeddings and OpenSearch
 * This function can be called from both API routes and server-side code
 */
export async function performProductSearch(
  filters: ProductFilters,
  from: number = 0,
  size: number = 24
): Promise<{ products: any[], total: number, queryInfo?: any }> {
  try {
    // Build OpenSearch query with filters
    const mustClauses: any[] = []
    const filterClauses: any[] = []

    // Text search query (if provided)
    // Uses vector search with OpenAI embeddings for semantic understanding
    if (filters.query && filters.query.trim()) {
      try {
        // Detect formal/wedding context for stronger keyword matching (must be declared before use)
        const lowerQuery = filters.query.toLowerCase()
        const isFormalContext = lowerQuery.includes('wedding') || lowerQuery.includes('formal') || 
                                lowerQuery.includes('dress') || lowerQuery.includes('suit') ||
                                lowerQuery.includes('ceremony') || lowerQuery.includes('occasion')
        
        // Infer allowed categories based on shopping intent using LLM
        const categoryConstraints = await inferAllowedCategories(filters.query)
        
        // Apply category filters as guardrails
        if (categoryConstraints.allowed.length > 0) {
          filterClauses.push({
            terms: { category: categoryConstraints.allowed }
          })
          console.log('[Product Search] Applying category filter (allowed):', categoryConstraints.allowed)
        }
        
        if (categoryConstraints.excluded.length > 0) {
          filterClauses.push({
            bool: {
              must_not: [
                {
                  terms: { category: categoryConstraints.excluded }
                }
              ]
            }
          })
          console.log('[Product Search] Applying category filter (excluded):', categoryConstraints.excluded)
        }
        
        // Generate embedding for the search query
        // Enhance query with context for better semantic matching
        let embeddingQuery = filters.query
        if (isFormalContext) {
          // Add formal context to embedding query for better semantic matching
          embeddingQuery = `${filters.query} formal elegant sophisticated classic`
        }
        
        // Use same embedding model as ingestion script: text-embedding-ada-002 (1536 dimensions)
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: embeddingQuery,
        })
        
        const queryEmbedding = embeddingResponse.data[0].embedding
        
        // Use KNN vector search for semantic similarity (ranking within allowed categories)
        mustClauses.push({
          knn: {
            text_embedding_vector: {
              vector: queryEmbedding,
              k: 100, // Number of nearest neighbors to retrieve
            },
          },
        })
        
        // Add lexical boost for exact keyword matches (reranking)
        const queryTerms = lowerQuery.split(/\s+/).filter(t => t.length > 2)
        
        // Negative keywords to exclude for formal contexts
        const negativeKeywords: string[] = []
        if (isFormalContext && (lowerQuery.includes('shoe') || lowerQuery.includes('footwear'))) {
          negativeKeywords.push('running', 'sport', 'athletic', 'gym', 'workout', 'training', 
                               'skate', 'casual', 'sneaker', 'sneakers', 'hiking', 'trail')
        }
        
        if (queryTerms.length > 0) {
          const shouldClauses: any[] = [
            {
              match: {
                title: {
                  query: filters.query,
                  boost: isFormalContext ? 3.0 : 2.0
                }
              }
            },
            {
              match: {
                description: {
                  query: filters.query,
                  boost: isFormalContext ? 2.5 : 1.5
                }
              }
            },
            {
              match: {
                derived_keywords: {
                  query: filters.query,
                  boost: isFormalContext ? 1.8 : 1.2
                }
              }
            }
          ]
          
          // Add formal/wedding-specific keyword boosts
          if (isFormalContext) {
            const formalKeywords = ['formal', 'dress', 'elegant', 'sophisticated', 'classic', 'tailored', 'luxury']
            formalKeywords.forEach(keyword => {
              if (lowerQuery.includes(keyword) || keyword === 'formal' || keyword === 'dress') {
                shouldClauses.push({
                  match: {
                    title: {
                      query: keyword,
                      boost: 2.5
                    }
                  }
                })
                shouldClauses.push({
                  match: {
                    description: {
                      query: keyword,
                      boost: 2.0
                    }
                  }
                })
              }
            })
          }
          
          mustClauses.push({
            bool: {
              should: shouldClauses,
              minimum_should_match: 1
            }
          })
          
          // Add negative keyword exclusion for formal contexts
          if (negativeKeywords.length > 0) {
            filterClauses.push({
              bool: {
                must_not: [
                  {
                    multi_match: {
                      query: negativeKeywords.join(' '),
                      fields: ['title^2', 'description', 'derived_keywords'],
                      type: 'best_fields'
                    }
                  }
                ]
              }
            })
            console.log('[Product Search] Excluding negative keywords for formal context:', negativeKeywords)
          }
        }
        
        console.log('[Product Search] Using vector search with category guardrails for query:', filters.query)
      } catch (error) {
        console.error('[Product Search] Error generating embedding, falling back to text search:', error)
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

    console.log('[Product Search] OpenSearch query:', JSON.stringify(searchBody, null, 2))

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
      throw new Error(`OpenSearch error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const hits = data.hits?.hits || []
    const total = data.hits?.total?.value || data.hits?.total || 0

    console.log(`[Product Search] Found ${hits.length} hits, total: ${total}`)

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
        _score: hit._score || 0, // Preserve relevance score for ranking
      }
    })

    // Store query for viewer
    const queryInfo = {
      index: PRODUCT_INDEX,
      query: searchBody.query,
      size: searchBody.size,
      from: searchBody.from,
      sort: searchBody.sort,
      timestamp: new Date().toISOString()
    }
    
    return {
      products,
      total,
      queryInfo
    }
  } catch (error: any) {
    console.error('[Product Search] Error:', error)
    throw error
  }
}

// Made with Bob
