#!/usr/bin/env python3
"""
Unified product ingestion script using MobileNet image embeddings.

This script:
1. Loads and merges products from:
   - scripts/additional_products.json
   - scripts/sample_products.json
   - scripts/premium_products.json
2. Normalizes them into a single schema and writes scripts/products_merged.json
3. Filters out products with missing/invalid image URLs or very short descriptions
4. Generates MobileNet image embeddings (1280‑dim)
5. Optionally generates OpenAI text embeddings (1536‑dim) if OPENAI_API_KEY is set
6. Indexes all products into OpenSearch (preserves existing products)

Usage:
    python scripts/ingest_additional_products.py
"""

import os
import sys
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

# Add parent directory to path to import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import OPENSEARCH_HOST, PRODUCT_INDEX, OPENAI_API_KEY

try:
    from opensearchpy import OpenSearch, helpers
    import tensorflow as tf
    import tensorflow_hub as hub
    import numpy as np
    from PIL import Image
    import requests
    from io import BytesIO
except ImportError as e:
    print(f"Error: Missing required package. Please install:")
    print("pip install opensearch-py tensorflow tensorflow-hub pillow requests openai")
    sys.exit(1)

# Load MobileNet model
print("Loading MobileNet model...")
model_url = "https://tfhub.dev/google/imagenet/mobilenet_v2_100_224/feature_vector/5"
model = hub.KerasLayer(model_url, input_shape=(224, 224, 3))
print("✓ MobileNet model loaded successfully")


def load_and_preprocess_image(image_url):
    """Load image from URL and preprocess for MobileNet."""
    try:
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()
        img = Image.open(BytesIO(response.content))
        img = img.convert('RGB')
        img = img.resize((224, 224))
        img_array = np.array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        return img_array
    except Exception as e:
        print(f"  ✗ Error loading image {image_url}: {e}")
        return None


def generate_image_embedding(image_url):
    """Generate MobileNet embedding for an image."""
    img_array = load_and_preprocess_image(image_url)
    if img_array is None:
        return None
    
    try:
        embedding = model(img_array)
        embedding_list = embedding.numpy().flatten().tolist()
        return embedding_list
    except Exception as e:
        print(f"  ✗ Error generating embedding: {e}")
        return None


def generate_text_embedding(text):
    """Generate OpenAI text embedding."""
    if not OPENAI_API_KEY:
        print("  ⚠ Warning: OPENAI_API_KEY not set, skipping text embeddings")
        return None
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.embeddings.create(
            model="text-embedding-ada-002",
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"  ✗ Error generating text embedding: {e}")
        return None


def connect_opensearch():
    """Connect to OpenSearch."""
    try:
        # Setup OpenSearch client with HTTP (not HTTPS)
        if not OPENSEARCH_HOST.startswith('http'):
            opensearch_url = f"http://{OPENSEARCH_HOST}"
        else:
            opensearch_url = OPENSEARCH_HOST
        
        client = OpenSearch(
            hosts=[opensearch_url],
            http_compress=True,
            use_ssl=False,
            verify_certs=False,
            ssl_assert_hostname=False,
            ssl_show_warn=False
        )
        return client
    except Exception as e:
        print(f"Error connecting to OpenSearch: {e}")
        sys.exit(1)


def _load_json_if_exists(filename: str) -> List[Dict[str, Any]]:
    """Load products from JSON file if it exists, otherwise return empty list."""
    filepath = os.path.join(os.path.dirname(__file__), filename)
    if not os.path.exists(filepath):
        print(f"  ⚠ {filename} not found, skipping")
        return []
    try:
        with open(filepath, "r") as f:
            data = json.load(f)
        print(f"✓ Loaded {len(data)} products from {filename}")
        return data
    except Exception as e:
        print(f"  ✗ Error loading {filename}: {e}")
        return []


def _normalize_product(p: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Normalize product from any of the three source schemas into a common shape.

    Ensures we always have:
      - id
      - name + title
      - description (reasonably long)
      - category
      - brand
      - price
      - image_url + product_images_urls[0]
    """
    product = dict(p)  # shallow copy

    # Determine schema type
    if "id" in product and "name" in product:
        # additional_products.json schema
        product_id = product["id"]
        name = product["name"]
        description = product.get("description", "") or ""
        image_url = product.get("image_url", "")
    elif "product_id" in product and "title" in product:
        # sample_products / premium_products schema
        product_id = product["product_id"]
        name = product.get("title", "")
        description = product.get("description", "") or ""
        imgs = product.get("product_images_urls") or []
        image_url = imgs[0] if imgs else ""
    else:
        print("  ⚠ Skipping product with unknown schema:", product)
        return None

    # Basic quality filters: image URL + description length
    if not image_url or not isinstance(image_url, str) or not image_url.startswith("http"):
        print(f"  ⚠ Skipping {product_id} - invalid image_url")
        return None

    if len(description.strip()) < 40:
        print(f"  ⚠ Skipping {product_id} - description too short")
        return None

    # Ensure unified keys
    product["id"] = product_id
    product["product_id"] = product.get("product_id", product_id)
    product["name"] = name
    product["title"] = product.get("title", name)
    product["description"] = description
    product["image_url"] = image_url
    if "product_images_urls" not in product or not product["product_images_urls"]:
        product["product_images_urls"] = [image_url]

    # Default availability/rating if missing
    product.setdefault("availability_status", "in_stock")
    product.setdefault("rating", 4.7)

    return product


def load_and_merge_products() -> List[Dict[str, Any]]:
    """Load, normalize, and merge products from all JSON sources."""
    print("\nLoading products from JSON files...")
    raw_products: List[Dict[str, Any]] = []
    raw_products += _load_json_if_exists("additional_products.json")
    raw_products += _load_json_if_exists("sample_products.json")
    raw_products += _load_json_if_exists("premium_products.json")

    print(f"\nNormalizing {len(raw_products)} raw products...")
    normalized: List[Dict[str, Any]] = []
    seen_ids = set()

    for p in raw_products:
        norm = _normalize_product(p)
        if not norm:
            continue
        pid = norm["id"]
        if pid in seen_ids:
            print(f"  ⚠ Skipping duplicate id {pid}")
            continue
        seen_ids.add(pid)
        normalized.append(norm)

    # Write merged JSON for inspection/debugging
    merged_path = os.path.join(os.path.dirname(__file__), "products_merged.json")
    try:
        with open(merged_path, "w") as f:
            json.dump(normalized, f, indent=2)
        print(f"\n✓ Wrote merged products file with {len(normalized)} items to {merged_path}")
    except Exception as e:
        print(f"  ⚠ Failed to write products_merged.json: {e}")

    return normalized


def ingest_products(client, products):
    """Ingest products into OpenSearch."""
    print("\n" + "="*60)
    print("INGESTING ADDITIONAL PRODUCTS (NO DELETION)")
    print("="*60)
    
    success_count = 0
    failed_count = 0
    
    for idx, product in enumerate(products, 1):
        print(f"\n[{idx}/{len(products)}] {product['name']}")
        print(f"  Product ID: {product['id']}")
        
        # Generate image embedding
        print("  Generating MobileNet image embedding...")
        print(f"  Image URL: {product['image_url'][:70]}...")
        image_embedding = generate_image_embedding(product['image_url'])
        
        if image_embedding:
            print(f"  ✓ MobileNet embedding generated (dimension: {len(image_embedding)})")
        else:
            print("  ✗ Failed to generate image embedding")
        
        # Generate text embedding
        print("  Generating OpenAI text embedding...")
        # Use semantic_description if available (from premium products), otherwise use regular description
        semantic_desc = product.get('semantic_description', '')
        text_for_embedding = f"{product['name']} {product['description']} {semantic_desc} {product['category']} {product.get('brand', '')}"
        text_embedding = generate_text_embedding(text_for_embedding)
        
        if text_embedding:
            print(f"  ✓ Text embedding generated (dimension: {len(text_embedding)})")
        else:
            print("  ⚠ Skipping text embedding")
        
        # Prepare document
        doc = {
            **product,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        if image_embedding:
            doc['image_embedding_vector'] = image_embedding
        
        if text_embedding:
            doc['text_embedding_vector'] = text_embedding
        
        # Index document
        try:
            client.index(
                index=PRODUCT_INDEX,
                id=product['id'],
                body=doc,
                refresh=True
            )
            print("  ✓ Successfully indexed in OpenSearch")
            success_count += 1
        except Exception as e:
            print(f"  ✗ Error indexing product: {e}")
            failed_count += 1
    
    print("\n" + "="*60)
    print("INGESTION SUMMARY")
    print("="*60)
    print(f"  Total products processed: {len(products)}")
    print(f"  Successfully ingested: {success_count}")
    print(f"  Failed: {failed_count}")
    print("="*60)


def verify_index(client):
    """Verify the index contents."""
    print("\nVerifying index...")
    try:
        count = client.count(index=PRODUCT_INDEX)['count']
        print(f"✓ Total products in index: {count}")
        
        # Get a sample product to verify embeddings
        result = client.search(
            index=PRODUCT_INDEX,
            body={"query": {"match_all": {}}, "size": 1}
        )
        
        if result['hits']['hits']:
            sample = result['hits']['hits'][0]['_source']
            print(f"\nVerifying embeddings on sample product...")
            print(f"  Image embedding present: {'image_embedding_vector' in sample}")
            if 'image_embedding_vector' in sample:
                print(f"  Image embedding dimension: {len(sample['image_embedding_vector'])}")
            print(f"  Text embedding present: {'text_embedding_vector' in sample}")
            if 'text_embedding_vector' in sample:
                print(f"  Text embedding dimension: {len(sample['text_embedding_vector'])}")
    except Exception as e:
        print(f"Error verifying index: {e}")


def main():
    print("\n" + "="*60)
    print("ADDITIONAL PRODUCTS INGESTION WITH MOBILENET EMBEDDINGS")
    print("="*60)
    
    # Connect to OpenSearch
    client = connect_opensearch()
    
    # Get current count
    try:
        initial_count = client.count(index=PRODUCT_INDEX)['count']
        print(f"\nCurrent products in index: {initial_count}")
    except:
        initial_count = 0
        print(f"\nCurrent products in index: 0")
    
    # Load and merge products from all JSON sources
    products = load_and_merge_products()
    
    # Ingest products (without deletion)
    ingest_products(client, products)
    
    # Verify
    verify_index(client)
    
    print("\n" + "="*60)
    print("✓ INGESTION COMPLETE!")
    print("="*60)


if __name__ == "__main__":
    main()

# Made with Bob
