import { NextRequest, NextResponse } from 'next/server'
import { OPENSEARCH_HOST } from '@/lib/config'
import { OpenAI } from 'openai'

const SUPPORT_INDEX = 'lexora_support'
const OPENAI_MODEL = 'text-embedding-ada-002' // Match ingestion script
const EMBEDDING_DIMENSION = 1536

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

/**
 * Generate embedding for the query using OpenAI
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const openai = new OpenAI({ apiKey })

  console.log('[Support Search] Generating query embedding...')

  try {
    const response = await openai.embeddings.create({
      model: OPENAI_MODEL,
      input: query
    })

    const embedding = response.data[0].embedding

    if (embedding.length !== EMBEDDING_DIMENSION) {
      throw new Error(`Expected embedding dimension ${EMBEDDING_DIMENSION}, got ${embedding.length}`)
    }

    console.log('[Support Search] Query embedding generated successfully')
    return embedding
  } catch (error) {
    console.error('[Support Search] Error generating embedding:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, from = 0, size = 5 } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    console.log('[Support Search] Query:', query)

    // Generate embedding for semantic search
    const queryEmbedding = await generateQueryEmbedding(query)

    // Build k-NN search query for semantic search
    // Simple k-NN query for support documents (text embeddings only)
    const searchBody: any = {
      size,
      from,
      query: {
        knn: {
          vector_field: {
            vector: queryEmbedding,
            k: size + from // Account for pagination
          }
        }
      }
    }

    console.log('[Support Search] k-NN semantic search for:', query)

    // Make request to OpenSearch
    const response = await fetch(`${OPENSEARCH_HOST}/${SUPPORT_INDEX}/_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Support Search] OpenSearch error:', errorText)
      
      if (response.status === 404 || errorText.includes('index_not_found')) {
        return NextResponse.json({
          documents: [],
          total: 0,
          message: 'Support documentation is not yet available.'
        })
      }
      
      throw new Error(`OpenSearch error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const hits = data.hits?.hits || []
    const total = data.hits?.total?.value || data.hits?.total || 0

    console.log(`[Support Search] Found ${hits.length} documents`)

    // Transform results
    const documents = hits.map((hit: any) => {
      const source = hit._source
      return {
        id: source.doc_id || source.chunk_id || hit._id,
        title: source.title || 'Untitled',
        content: source.content || source.text || source.page_content || source.chunk_text || '',
        category: source.category || source.doc_type,
        score: hit._score
      }
    })

    // Store query info for viewer
    const queryInfo = {
      index: SUPPORT_INDEX,
      query: searchBody.query, // Store actual query
      size: searchBody.size,
      from: searchBody.from,
      searchType: 'semantic',
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      documents,
      total,
      queryInfo // Include query info for debugging
    })

  } catch (error: any) {
    console.error('[Support Search] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to search support documents' },
      { status: 500 }
    )
  }
}

// Made with Bob
