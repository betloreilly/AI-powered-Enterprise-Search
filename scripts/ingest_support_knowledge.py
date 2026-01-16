#!/usr/bin/env python3
"""
Ingest LEXORA support knowledge base document into OpenSearch using Unstructured.io API and OpenAI embeddings.

Usage:
    export UNSTRUCTURED_API_KEY="your-api-key"
    export OPENAI_API_KEY="your-openai-key"
    python ingest_support_knowledge.py
"""

import os
import sys
import json
import requests
from typing import List, Dict, Any
import time
import re
from collections import Counter
from openai import OpenAI
from opensearchpy import OpenSearch
import numpy as np

# Add parent directory to path to import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import (
    UNSTRUCTURED_API_KEY,
    OPENAI_API_KEY,
    OPENSEARCH_HOST,
    SUPPORT_KNOWLEDGE_INDEX,
    SUPPORT_DOCUMENT_PATH,
    OPENAI_MODEL,
    EMBEDDING_DIMENSION,
    MIN_CHUNK_LENGTH
)

# Configuration (using centralized config)
OPENSEARCH_INDEX = SUPPORT_KNOWLEDGE_INDEX
DOCUMENT_PATH = SUPPORT_DOCUMENT_PATH

# Initialize clients
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# Parse OPENSEARCH_HOST properly (handle both "localhost:9200" and "http://localhost:9200")
opensearch_host = OPENSEARCH_HOST.replace("http://", "").replace("https://", "")
host_parts = opensearch_host.split(":")
opensearch_client = OpenSearch(
    hosts=[{"host": host_parts[0], "port": int(host_parts[1]) if len(host_parts) > 1 else 9200}],
    http_compress=True,
    use_ssl=False,
    verify_certs=False
)


def process_with_unstructured(file_path: str) -> List[Dict[str, Any]]:
    """Process document using Unstructured.io API with by_title chunking."""
    print(f"Processing {file_path} with Unstructured.io API...")
    
    url = "https://api.unstructuredapp.io/general/v0/general"
    headers = {
        "accept": "application/json",
        "unstructured-api-key": UNSTRUCTURED_API_KEY
    }
    
    with open(file_path, "rb") as f:
        files = {"files": (os.path.basename(file_path), f, "text/markdown")}
        data = {
            "chunking_strategy": "by_title",
            "max_characters": 1000,
            "overlap": 200
        }
        
        response = requests.post(url, headers=headers, files=files, data=data)
        response.raise_for_status()
        
        elements = response.json()
        print(f"Received {len(elements)} elements from Unstructured.io")
        return elements


def extract_keywords(text: str) -> List[str]:
    """Extract important keywords from text for BM25 search."""
    # Common stop words to filter out
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
        'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
        'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
        'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
        'what', 'which', 'who', 'when', 'where', 'why', 'how', 'if', 'then', 'than',
        'my', 'your', 'his', 'her', 'its', 'our', 'their', 'me', 'him', 'us', 'them'
    }
    
    # Convert to lowercase and split into words
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    
    # Filter out stop words and get unique keywords
    keywords = [word for word in words if word not in stop_words]
    
    # Count frequency and get top keywords (limit to 20 most common)
    keyword_counts = Counter(keywords)
    top_keywords = [word for word, count in keyword_counts.most_common(20)]
    
    return top_keywords


def filter_chunks(elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Filter out chunks that are too short or empty."""
    filtered = []
    
    for element in elements:
        # Get text content
        text = element.get("text", "") or element.get("content", "")
        
        # Handle list of text
        if isinstance(text, list):
            text = " ".join(str(t) for t in text if t)
        
        text = str(text).strip() if text else ""
        
        # Filter criteria
        if text and len(text) >= MIN_CHUNK_LENGTH:
            # Extract keywords for BM25 search
            keywords = extract_keywords(text)
            
            # Extract title if available (from metadata or first line)
            title = ""
            metadata = element.get("metadata", {})
            if isinstance(metadata, dict):
                title = metadata.get("title", "") or metadata.get("filename", "")
            
            # If no title in metadata, try to extract from first line
            if not title:
                first_line = text.split('\n')[0].strip()
                if len(first_line) < 100:  # Reasonable title length
                    title = first_line
            
            # Clean up the element
            filtered_element = {
                "text": text,
                "keywords": keywords,  # Add keywords for BM25
                "title": title,  # Add title for better matching
                "type": element.get("type", "unknown"),
                "metadata": {
                    "source": metadata.get("filename", DOCUMENT_PATH) if isinstance(metadata, dict) else DOCUMENT_PATH,
                    "element_id": element.get("element_id", ""),
                    "category": element.get("category", ""),
                }
            }
            filtered.append(filtered_element)
        else:
            print(f"Skipped chunk (length {len(text)}): {text[:50]}...")
    
    print(f"Filtered {len(elements)} elements down to {len(filtered)} valid chunks")
    return filtered


def generate_embeddings(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Generate embeddings for chunks using OpenAI."""
    print(f"Generating embeddings for {len(chunks)} chunks...")
    
    enriched_chunks = []
    
    for i, chunk in enumerate(chunks):
        try:
            text = chunk["text"]
            
            # Generate embedding
            response = openai_client.embeddings.create(
                model=OPENAI_MODEL,
                input=text
            )
            
            embedding = response.data[0].embedding
            
            # Validate embedding
            if len(embedding) != EMBEDDING_DIMENSION:
                print(f"Warning: Chunk {i} has wrong embedding dimension: {len(embedding)}")
                continue
            
            # Check for NaN values
            if any(np.isnan(val) or np.isinf(val) for val in embedding):
                print(f"Warning: Chunk {i} contains NaN or Inf values, skipping")
                continue
            
            # Add embedding to chunk
            chunk["vector_field"] = embedding
            enriched_chunks.append(chunk)
            
            # Progress indicator
            if (i + 1) % 10 == 0:
                print(f"Processed {i + 1}/{len(chunks)} chunks...")
            
            # Rate limiting - small delay to avoid hitting API limits
            time.sleep(0.1)
            
        except Exception as e:
            print(f"Error generating embedding for chunk {i}: {e}")
            print(f"Chunk text preview: {chunk['text'][:100]}...")
            continue
    
    print(f"Successfully generated embeddings for {len(enriched_chunks)} chunks")
    return enriched_chunks


def index_to_opensearch(chunks: List[Dict[str, Any]]) -> None:
    """Index chunks into OpenSearch with hybrid search support."""
    print(f"Indexing {len(chunks)} chunks into OpenSearch...")
    
    # Prepare documents for bulk indexing
    actions = []
    for i, chunk in enumerate(chunks):
        # Prepare document with fields for both BM25 and vector search
        doc = {
            # Text fields for BM25 keyword search (with analyzers)
            "content": chunk["text"],
            "text": chunk["text"],  # Also include 'text' field for Langflow retrieval
            "page_content": chunk["text"],  # Some components use page_content
            
            # Keywords field for BM25 boosting
            "keywords": chunk.get("keywords", []),
            "keywords_text": " ".join(chunk.get("keywords", [])),  # Space-separated for BM25
            
            # Title field for better matching
            "title": chunk.get("title", ""),
            
            # Vector field for semantic search
            "vector_field": chunk["vector_field"],
            
            # Metadata
            "metadata": chunk.get("metadata", {})
        }
        
        # Add any additional fields
        if "type" in chunk:
            doc["type"] = chunk["type"]
        
        action = {
            "_index": OPENSEARCH_INDEX,
            "_id": chunk["metadata"].get("element_id", f"support_chunk_{i}"),
            "_source": doc
        }
        actions.append(action)
    
    # Bulk index
    from opensearchpy.helpers import bulk
    
    success_count = 0
    failed_count = 0
    
    try:
        # bulk() returns (success_count, failed_items_list)
        success_count, failed = bulk(opensearch_client, actions, raise_on_error=False)
        failed_count = len(failed) if failed else 0
        
        if failed:
            print(f"\nFailed to index {failed_count} documents:")
            for item in failed[:5]:  # Show first 5 failures
                error_info = item.get('index', {})
                error_msg = error_info.get('error', {})
                doc_id = error_info.get('_id', 'unknown')
                reason = error_msg.get('reason', 'unknown error') if isinstance(error_msg, dict) else str(error_msg)
                print(f"  - {doc_id}: {reason}")
        
        print(f"\nIndexing complete: {success_count} succeeded, {failed_count} failed")
        
    except Exception as e:
        print(f"Error during bulk indexing: {e}")
        raise


def verify_index() -> bool:
    """Verify that the index exists and is accessible."""
    try:
        exists = opensearch_client.indices.exists(index=OPENSEARCH_INDEX)
        if not exists:
            print(f"Error: Index '{OPENSEARCH_INDEX}' does not exist!")
            print("Please create the index first using the curl command in README.md")
            return False
        
        # Get index info
        info = opensearch_client.indices.get(index=OPENSEARCH_INDEX)
        print(f"Index '{OPENSEARCH_INDEX}' exists and is accessible")
        return True
        
    except Exception as e:
        print(f"Error verifying index: {e}")
        return False


def main():
    """Main ingestion pipeline."""
    print("=" * 60)
    print("LEXORA Support Knowledge Base Ingestion Script")
    print("=" * 60)
    
    # Check environment variables
    if not UNSTRUCTURED_API_KEY:
        print("Error: UNSTRUCTURED_API_KEY environment variable not set")
        return
    
    if not OPENAI_API_KEY:
        print("Error: OPENAI_API_KEY environment variable not set")
        return
    
    # Verify index exists
    if not verify_index():
        return
    
    # Check if document exists
    if not os.path.exists(DOCUMENT_PATH):
        print(f"Error: Document '{DOCUMENT_PATH}' not found")
        return
    
    try:
        # Step 1: Process with Unstructured.io
        elements = process_with_unstructured(DOCUMENT_PATH)
        
        # Step 2: Filter chunks
        chunks = filter_chunks(elements)
        
        if not chunks:
            print("Error: No valid chunks after filtering!")
            return
        
        # Step 3: Generate embeddings
        enriched_chunks = generate_embeddings(chunks)
        
        if not enriched_chunks:
            print("Error: No chunks with valid embeddings!")
            return
        
        # Step 4: Index to OpenSearch
        index_to_opensearch(enriched_chunks)
        
        print("\n" + "=" * 60)
        print("Support knowledge base ingestion completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\nError during ingestion: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    main()
