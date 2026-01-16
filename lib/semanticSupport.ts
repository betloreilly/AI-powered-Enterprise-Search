/**
 * Semantic Support Search using OpenSearch k-NN + OpenAI
 * Retrieves relevant chunks from lexora_support index using vector similarity and generates answers
 */

import { OpenAI } from 'openai'
import { OPENSEARCH_HOST } from './config'

const SUPPORT_INDEX = 'lexora_support'
const OPENAI_MODEL = 'text-embedding-ada-002' // Match ingestion script
const EMBEDDING_DIMENSION = 1536

interface SupportChunk {
  id: string
  title: string
  content: string
  category?: string
  score: number
}

interface SemanticSupportResult {
  answer: string
  sources: SupportChunk[]
  queryInfo?: any
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

  console.log('[Semantic Support] Generating query embedding...')

  try {
    const response = await openai.embeddings.create({
      model: OPENAI_MODEL,
      input: query
    })

    const embedding = response.data[0].embedding

    if (embedding.length !== EMBEDDING_DIMENSION) {
      throw new Error(`Expected embedding dimension ${EMBEDDING_DIMENSION}, got ${embedding.length}`)
    }

    console.log('[Semantic Support] Query embedding generated successfully')
    return embedding
  } catch (error) {
    console.error('[Semantic Support] Error generating embedding:', error)
    throw error
  }
}

/**
 * Search support documents in OpenSearch using k-NN vector search
 */
async function searchSupportChunks(query: string, size: number = 5): Promise<{ chunks: SupportChunk[], queryInfo: any }> {
  // Generate embedding for the query
  const queryEmbedding = await generateQueryEmbedding(query)

  // Use k-NN search with the query embedding
  // Simple top-level k-NN query for support documents (text embeddings only)
  const searchBody: any = {
    size,
    query: {
      knn: {
        vector_field: {
          vector: queryEmbedding,
          k: size
        }
      }
    }
  }

  console.log('[Semantic Support] Performing k-NN search with query:', query)

  const response = await fetch(`${OPENSEARCH_HOST}/${SUPPORT_INDEX}/_search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(searchBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Semantic Support] OpenSearch error:', errorText)
    
    if (response.status === 404 || errorText.includes('index_not_found')) {
      return { 
        chunks: [], 
        queryInfo: {
          index: SUPPORT_INDEX,
          query: searchBody.query,
          size: searchBody.size,
          error: 'Index not found'
        }
      }
    }
    
    throw new Error(`OpenSearch error: ${response.status}`)
  }

  const data = await response.json()
  const hits = data.hits?.hits || []

  console.log(`[Semantic Support] Found ${hits.length} chunks`)

  const chunks: SupportChunk[] = hits.map((hit: any) => {
    const source = hit._source
    return {
      id: source.doc_id || source.chunk_id || hit._id,
      title: source.title || 'Untitled',
      content: source.content || source.text || source.page_content || source.chunk_text || '',
      category: source.category || source.doc_type,
      score: hit._score
    }
  })

  const queryInfo = {
    index: SUPPORT_INDEX,
    query: searchBody.query, // Store actual query
    size: searchBody.size,
    searchType: 'semantic',
    timestamp: new Date().toISOString()
  }

  return { chunks, queryInfo }
}

/**
 * Generate answer using OpenAI based on retrieved chunks
 */
async function generateAnswer(question: string, chunks: SupportChunk[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  if (chunks.length === 0) {
    return "I couldn't find specific information about that in our documentation. Please try rephrasing your question or contact our support team for assistance."
  }

  const openai = new OpenAI({ apiKey })

  // Build context from chunks
  const context = chunks
    .map((chunk, idx) => `[Source ${idx + 1}: ${chunk.title}]\n${chunk.content}`)
    .join('\n\n---\n\n')

  const systemPrompt = `You are a helpful LEXORA support assistant. Answer the user's question using ONLY the information provided in the context below from the support knowledge base.

INSTRUCTIONS:
1. Read ALL the context documents carefully
2. Find the specific section that answers the question
3. Provide exact numbers, rates, and details from the context
4. If asked about policies, programs, or procedures, include specific details and any conditions
5. If the answer is not in the context, say so clearly - do not make up information

FORMATTING RULES:
- When comparing multiple programs, products, or options, use a MARKDOWN TABLE
- Use tables for: program comparisons, policy comparisons, eligibility matrices, feature lists
- Use bullet points for: step-by-step processes, requirements, benefits, features, lists
- Bold important numbers, dates, and key terms
- Keep responses concise but complete
- If multiple FAQs are relevant, combine them into a comprehensive answer

TABLE FORMAT EXAMPLE:
| Program | Eligibility | Coverage | Cost |
|---------|-------------|----------|------|
| Care+ Basic | All products | 1 year | $X |
| Care+ Premium | Electronics only | 2 years | $Y |

Always cite which source(s) you used by mentioning "Source 1", "Source 2", etc.`

  const userPrompt = `Question: ${question}

Documentation:
${context}

Please provide a clear, helpful answer based on the documentation above.`

  console.log('[Semantic Support] Generating answer with OpenAI...')

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    })

    const answer = response.choices[0]?.message?.content || 'Unable to generate answer.'
    console.log('[Semantic Support] Answer generated successfully')
    
    return answer
  } catch (error) {
    console.error('[Semantic Support] OpenAI error:', error)
    throw error
  }
}

/**
 * Main function: Search chunks and generate semantic answer
 */
export async function querySemanticSupport(question: string): Promise<SemanticSupportResult> {
  console.log('[Semantic Support] Processing question:', question)

  try {
    // Step 1: Retrieve relevant chunks from OpenSearch
    const { chunks, queryInfo } = await searchSupportChunks(question, 5)

    // Step 2: Generate answer using OpenAI
    const answer = await generateAnswer(question, chunks)

    // Step 3: Convert sources to simple format for UI
    const sourcesForUI = chunks.map((chunk, idx) =>
      `Source ${idx + 1}: ${chunk.title} (${Math.round(chunk.score * 100)}% match)`
    )

    return {
      answer,
      sources: chunks,
      queryInfo
    }
  } catch (error) {
    console.error('[Semantic Support] Error:', error)
    throw error
  }
}

// Made with Bob