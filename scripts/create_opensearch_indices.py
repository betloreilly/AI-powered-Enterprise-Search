#!/usr/bin/env python3
"""
Create all OpenSearch indices for LEXORA based on data models.

Usage:
    python scripts/create_opensearch_indices.py
"""

import os
import sys
import json
import requests

# Add parent directory to path to import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import OPENSEARCH_HOST

def create_index(index_name: str, mapping: dict, opensearch_host: str) -> bool:
    """Create an OpenSearch index with the given mapping."""
    url = f"{opensearch_host}/{index_name}"
    
    # Delete existing index if it exists
    try:
        response = requests.delete(url)
        if response.status_code == 200:
            print(f"  Deleted existing index: {index_name}")
    except:
        pass
    
    # Create new index
    try:
        response = requests.put(url, json=mapping, headers={'Content-Type': 'application/json'})
        if response.status_code == 200:
            print(f"  ✓ Created index: {index_name}")
            return True
        else:
            print(f"  ✗ Failed to create {index_name}: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"  ✗ Error creating {index_name}: {e}")
        return False

def main():
    print("Creating OpenSearch indices")
    print("=" * 50)
    
    # Ensure OPENSEARCH_HOST has protocol
    if not OPENSEARCH_HOST.startswith('http'):
        opensearch_url = f"http://{OPENSEARCH_HOST}"
    else:
        opensearch_url = OPENSEARCH_HOST
    
    # 1. Product Index
    print("\n1. Creating product index (lexora_products)...")
    product_mapping = {
        "settings": {
            "index": {
                "knn": True,
                "knn.algo_param.ef_search": 100,
                "number_of_shards": 1,
                "number_of_replicas": 0
            },
            "analysis": {
                "analyzer": {
                    "keyword_lowercase": {
                        "type": "custom",
                        "tokenizer": "keyword",
                        "filter": ["lowercase"]
                    }
                }
            }
        },
        "mappings": {
            "properties": {
                "product_id": {"type": "keyword"},
                "title": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword"}}
                },
                "description": {"type": "text"},
                "price": {"type": "float"},
                "brand": {
                    "type": "keyword",
                    "fields": {"text": {"type": "text"}}
                },
                "category": {
                    "type": "keyword",
                    "fields": {"text": {"type": "text"}}
                },
                "SKU": {"type": "keyword"},
                "availability_status": {"type": "keyword"},
                "normalized_brand": {"type": "keyword"},
                "normalized_attributes": {"type": "object", "enabled": True},
                "derived_keywords": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword"}}
                },
                "category_facets": {"type": "keyword"},
                "price_bucket": {"type": "keyword"},
                "geo_availability_fields": {"type": "object", "enabled": True},
                "trend_tags": {"type": "keyword"},
                "influencer_tags": {"type": "keyword"},
                "text_embedding_vector": {
                    "type": "knn_vector",
                    "dimension": 1536,
                    "method": {
                        "name": "hnsw",
                        "space_type": "cosinesimil",
                        "engine": "lucene",
                        "parameters": {"ef_construction": 128, "m": 24}
                    }
                },
                "image_embedding_vector": {
                    "type": "knn_vector",
                    "dimension": 1280,
                    "method": {
                        "name": "hnsw",
                        "space_type": "cosinesimil",
                        "engine": "lucene",
                        "parameters": {"ef_construction": 128, "m": 24}
                    }
                },
                "popularity_score": {"type": "float"},
                "trending_score": {"type": "float"},
                "created_date": {"type": "date"},
                "updated_date": {"type": "date"},
                "inventory_count": {"type": "integer"},
                "product_images_urls": {"type": "keyword"},
                "rating": {"type": "float"}
            }
        }
    }
    create_index("lexora_products", product_mapping, opensearch_url)
    
    # 2. Support Document Index
    print("\n2. Creating support document index (lexora_support)...")
    support_mapping = {
        "settings": {
            "index": {
                "knn": True,
                "knn.algo_param.ef_search": 100,
                "number_of_shards": 1,
                "number_of_replicas": 0
            }
        },
        "mappings": {
            "properties": {
                "doc_id": {"type": "keyword"},
                "title": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword"}}
                },
                "content": {"type": "text"},
                "text": {"type": "text"},
                "page_content": {"type": "text"},
                "doc_type": {"type": "keyword"},
                "category": {"type": "keyword"},
                "chunk_id": {"type": "keyword"},
                "parent_doc_id": {"type": "keyword"},
                "chunk_text": {"type": "text"},
                "chunk_index": {"type": "integer"},
                "metadata": {"type": "object", "enabled": True},
                "keywords": {"type": "keyword"},
                "keywords_text": {"type": "text"},
                "vector_field": {
                    "type": "knn_vector",
                    "dimension": 1536,
                    "method": {
                        "name": "hnsw",
                        "space_type": "cosinesimil",
                        "engine": "lucene",
                        "parameters": {"ef_construction": 128, "m": 24}
                    }
                },
                "text_embedding_vector": {
                    "type": "knn_vector",
                    "dimension": 1536,
                    "method": {
                        "name": "hnsw",
                        "space_type": "cosinesimil",
                        "engine": "lucene",
                        "parameters": {"ef_construction": 128, "m": 24}
                    }
                },
                "relevance_score": {"type": "float"},
                "created_date": {"type": "date"},
                "last_updated_date": {"type": "date"},
                "recency_score": {"type": "float"}
            }
        }
    }
    create_index("lexora_support", support_mapping, opensearch_url)
    
    # 3. User Authentication Index
    print("\n3. Creating user authentication index (lexora_users_auth)...")
    auth_mapping = {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0
        },
        "mappings": {
            "properties": {
                "user_id": {"type": "keyword"},
                "email": {
                    "type": "keyword",
                    "fields": {"text": {"type": "text"}}
                },
                "username": {"type": "keyword"},
                "password_hash": {"type": "keyword"},
                "auth_provider": {"type": "keyword"},
                "account_status": {"type": "keyword"},
                "created_at": {"type": "date"},
                "last_login": {"type": "date"},
                "session_id": {"type": "keyword"},
                "session_token": {"type": "keyword"},
                "expires_at": {"type": "date"},
                "ip_address": {"type": "ip"},
                "user_agent": {"type": "text"}
            }
        }
    }
    create_index("lexora_users_auth", auth_mapping, opensearch_url)
    
    # 4. User Profile Index
    print("\n4. Creating user profile index (lexora_users_profile)...")
    profile_mapping = {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0
        },
        "mappings": {
            "properties": {
                "user_id": {"type": "keyword"},
                "display_name": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword"}}
                },
                "geo_location": {"type": "geo_point"},
                "preferences": {"type": "object", "enabled": True},
                "profile_completed": {"type": "boolean"},
                "search_history": {
                    "type": "nested",
                    "properties": {
                        "query": {"type": "text"},
                        "timestamp": {"type": "date"}
                    }
                },
                "clicked_products": {
                    "type": "nested",
                    "properties": {
                        "product_id": {"type": "keyword"},
                        "timestamp": {"type": "date"}
                    }
                },
                "purchased_products": {
                    "type": "nested",
                    "properties": {
                        "product_id": {"type": "keyword"},
                        "timestamp": {"type": "date"}
                    }
                },
                "viewed_products": {"type": "keyword"},
                "saved_products": {"type": "keyword"},
                "feedback_ratings": {
                    "type": "nested",
                    "properties": {
                        "product_id": {"type": "keyword"},
                        "rating": {"type": "float"},
                        "timestamp": {"type": "date"}
                    }
                },
                "cart_history": {"type": "object", "enabled": True},
                "preferred_categories": {
                    "type": "nested",
                    "properties": {
                        "category": {"type": "keyword"},
                        "weight": {"type": "float"}
                    }
                },
                "preferred_brands": {
                    "type": "nested",
                    "properties": {
                        "brand": {"type": "keyword"},
                        "weight": {"type": "float"}
                    }
                },
                "price_range_preference": {
                    "type": "object",
                    "properties": {
                        "min": {"type": "float"},
                        "max": {"type": "float"}
                    }
                },
                "style_preferences": {"type": "keyword"},
                "size_preferences": {"type": "keyword"},
                "color_preferences": {"type": "keyword"},
                "last_activity_date": {"type": "date"},
                "engagement_score": {"type": "float"},
                "profile_updated_at": {"type": "date"}
            }
        }
    }
    create_index("lexora_users_profile", profile_mapping, opensearch_url)
    
    # 5. Collaborative Signals Index
    print("\n5. Creating collaborative signals index (lexora_collaborative_signals)...")
    collaborative_mapping = {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0
        },
        "mappings": {
            "properties": {
                "user_id": {"type": "keyword"},
                "similar_users": {
                    "type": "nested",
                    "properties": {
                        "user_id": {"type": "keyword"},
                        "similarity_score": {"type": "float"}
                    }
                },
                "similarity_algorithm": {"type": "keyword"},
                "last_computed": {"type": "date"},
                "product_id": {"type": "keyword"},
                "collective_popularity_score": {"type": "float"},
                "category_popularity": {
                    "type": "nested",
                    "properties": {
                        "category": {"type": "keyword"},
                        "popularity_score": {"type": "float"}
                    }
                },
                "geo_popularity": {
                    "type": "nested",
                    "properties": {
                        "region": {"type": "keyword"},
                        "popularity_score": {"type": "float"}
                    }
                },
                "trending_score": {"type": "float"},
                "co_viewed_products": {
                    "type": "nested",
                    "properties": {
                        "product_id": {"type": "keyword"},
                        "co_view_count": {"type": "integer"}
                    }
                },
                "co_purchased_products": {
                    "type": "nested",
                    "properties": {
                        "product_id": {"type": "keyword"},
                        "co_purchase_count": {"type": "integer"}
                    }
                },
                "segment_id": {"type": "keyword"},
                "segment_name": {"type": "keyword"},
                "user_ids": {"type": "keyword"},
                "segment_characteristics": {"type": "text"},
                "segment_product_affinities": {"type": "keyword"},
                "recommended_products": {
                    "type": "nested",
                    "properties": {
                        "product_id": {"type": "keyword"},
                        "score": {"type": "float"}
                    }
                },
                "recommendation_scores": {"type": "object", "enabled": True},
                "recommendation_reason": {"type": "text"},
                "last_updated": {"type": "date"}
            }
        }
    }
    create_index("lexora_collaborative_signals", collaborative_mapping, opensearch_url)
    
    print("\n" + "=" * 50)
    print("All indices created successfully!")
    print("\nCreated indices:")
    print("  - lexora_products (products)")
    print("  - lexora_support (support documents)")
    print("  - lexora_users_auth (user authentication)")
    print("  - lexora_users_profile (user profiles)")
    print("  - lexora_collaborative_signals (collaborative signals)")
    print(f"\nVerify indices with: curl {opensearch_url}/_cat/indices?v")

if __name__ == "__main__":
    main()
