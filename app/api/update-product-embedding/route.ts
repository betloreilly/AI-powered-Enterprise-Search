import { NextRequest, NextResponse } from 'next/server'
import { OPENSEARCH_HOST, PRODUCT_INDEX } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    const { productId, embedding } = await request.json()

    if (!productId || !embedding || !Array.isArray(embedding)) {
      return NextResponse.json(
        { error: 'Missing productId or embedding' },
        { status: 400 }
      )
    }

    console.log(`[UpdateEmbedding] Updating product ${productId} with ${embedding.length}-dim embedding`)

    // Update product in OpenSearch
    const response = await fetch(`${OPENSEARCH_HOST}/${PRODUCT_INDEX}/_update_by_query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        script: {
          source: 'ctx._source.image_embedding_vector = params.embedding',
          params: {
            embedding: embedding
          }
        },
        query: {
          term: {
            product_id: productId
          }
        }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenSearch error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log(`[UpdateEmbedding] Updated ${data.updated} documents`)

    return NextResponse.json({ success: true, updated: data.updated })
  } catch (error: any) {
    console.error('[UpdateEmbedding] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update embedding' },
      { status: 500 }
    )
  }
}

// Made with Bob
