"""
Centralized configuration for environment variables
All environment variables should be accessed through this file
"""

import os
from typing import Optional

# OpenSearch Configuration
OPENSEARCH_HOST: str = os.getenv("OPENSEARCH_HOST", "localhost:9200")
PRODUCT_INDEX: str = os.getenv("PRODUCT_INDEX", "lexora_products")
DOMAIN_KNOWLEDGE_INDEX: str = os.getenv("DOMAIN_KNOWLEDGE_INDEX", "lexora_internal_doc")
SUPPORT_KNOWLEDGE_INDEX: str = os.getenv("SUPPORT_KNOWLEDGE_INDEX", "lexora_support")

# OpenAI Configuration
OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
# Use text-embedding-ada-002 for consistency across all embeddings (products, support, etc.)
OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "text-embedding-ada-002")
EMBEDDING_DIMENSION: int = int(os.getenv("EMBEDDING_DIMENSION", "1536"))

# Unstructured.io Configuration
UNSTRUCTURED_API_KEY: Optional[str] = os.getenv("UNSTRUCTURED_API_KEY")

# Document Paths
DOCUMENT_PATH: str = os.getenv("DOCUMENT_PATH", "LEXORA.md")
SUPPORT_DOCUMENT_PATH: str = os.getenv("SUPPORT_DOCUMENT_PATH", "LEXORA_SUPPORT_KNOWLEDGE_BASE.md")

# Ingestion Settings
MIN_CHUNK_LENGTH: int = int(os.getenv("MIN_CHUNK_LENGTH", "100"))

# Validation
if not OPENAI_API_KEY:
    print("Warning: OPENAI_API_KEY is not set")

if not UNSTRUCTURED_API_KEY:
    print("Warning: UNSTRUCTURED_API_KEY is not set")
