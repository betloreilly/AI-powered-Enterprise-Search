/**
 * Centralized configuration for environment variables
 * All environment variables should be accessed through this file
 */

// OpenSearch Configuration
export const OPENSEARCH_HOST = process.env.OPENSEARCH_HOST || 'http://localhost:9200'
export const PRODUCT_INDEX = process.env.PRODUCT_INDEX || 'lexora_products'
export const DOMAIN_KNOWLEDGE_INDEX = process.env.DOMAIN_KNOWLEDGE_INDEX || 'lexora_internal_doc'
export const SUPPORT_KNOWLEDGE_INDEX = process.env.SUPPORT_KNOWLEDGE_INDEX || 'lexora_support'

// OpenAI Configuration
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY
// Use text-embedding-ada-002 for consistency across all embeddings (products, support, etc.)
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'text-embedding-ada-002'
export const EMBEDDING_DIMENSION = parseInt(process.env.EMBEDDING_DIMENSION || '1536', 10)

// Unstructured.io Configuration
export const UNSTRUCTURED_API_KEY = process.env.UNSTRUCTURED_API_KEY

// Document Paths
export const DOCUMENT_PATH = process.env.DOCUMENT_PATH || 'LEXORA.md'
export const SUPPORT_DOCUMENT_PATH = process.env.SUPPORT_DOCUMENT_PATH || 'LEXORA_SUPPORT_KNOWLEDGE_BASE.md'

// Ingestion Settings
export const MIN_CHUNK_LENGTH = parseInt(process.env.MIN_CHUNK_LENGTH || '100', 10)

// Validation
if (!OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY is not set')
}

if (!UNSTRUCTURED_API_KEY) {
  console.warn('Warning: UNSTRUCTURED_API_KEY is not set')
}
