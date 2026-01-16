#!/bin/bash

# Script to create all OpenSearch indices for LEXORA
# Usage: ./scripts/create_opensearch_indices.sh

OPENSEARCH_HOST="${OPENSEARCH_HOST:-http://localhost:9200}"

echo "Creating OpenSearch indices at $OPENSEARCH_HOST"
echo "================================================"

# 1. Product Index
echo ""
echo "1. Creating product index (lexora_products)..."
curl -X PUT "$OPENSEARCH_HOST/lexora_products" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "index": {
      "knn": true,
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
      "product_id": {
        "type": "keyword"
      },
      "title": {
        "type": "text",
        "fields": {
          "keyword": {
            "type": "keyword"
          }
        }
      },
      "description": {
        "type": "text"
      },
      "price": {
        "type": "float"
      },
      "brand": {
        "type": "keyword",
        "fields": {
          "text": {
            "type": "text"
          }
        }
      },
      "category": {
        "type": "keyword",
        "fields": {
          "text": {
            "type": "text"
          }
        }
      },
      "SKU": {
        "type": "keyword"
      },
      "availability_status": {
        "type": "keyword"
      },
      "normalized_brand": {
        "type": "keyword"
      },
      "normalized_attributes": {
        "type": "object",
        "enabled": true
      },
      "derived_keywords": {
        "type": "text",
        "fields": {
          "keyword": {
            "type": "keyword"
          }
        }
      },
      "category_facets": {
        "type": "keyword"
      },
      "price_bucket": {
        "type": "keyword"
      },
      "geo_availability_fields": {
        "type": "object",
        "enabled": true
      },
      "trend_tags": {
        "type": "keyword"
      },
      "influencer_tags": {
        "type": "keyword"
      },
      "text_embedding_vector": {
        "type": "knn_vector",
        "dimension": 1536,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "engine": "lucene",
          "parameters": {
            "ef_construction": 128,
            "m": 24
          }
        }
      },
      "image_embedding_vector": {
        "type": "knn_vector",
        "dimension": 512,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "engine": "lucene",
          "parameters": {
            "ef_construction": 128,
            "m": 24
          }
        }
      },
      "popularity_score": {
        "type": "float"
      },
      "trending_score": {
        "type": "float"
      },
      "created_date": {
        "type": "date"
      },
      "updated_date": {
        "type": "date"
      },
      "inventory_count": {
        "type": "integer"
      },
      "product_images_urls": {
        "type": "keyword"
      },
      "rating": {
        "type": "float"
      }
    }
  }
}'

# 2. Support Document Index (update existing)
echo ""
echo "2. Creating/updating support document index (lexora_support)..."
curl -X DELETE "$OPENSEARCH_HOST/lexora_support" 2>/dev/null || true
curl -X PUT "$OPENSEARCH_HOST/lexora_support" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "index": {
      "knn": true,
      "knn.algo_param.ef_search": 100,
      "number_of_shards": 1,
      "number_of_replicas": 0
    }
  },
  "mappings": {
    "properties": {
      "doc_id": {
        "type": "keyword"
      },
      "title": {
        "type": "text",
        "fields": {
          "keyword": {
            "type": "keyword"
          }
        }
      },
      "content": {
        "type": "text"
      },
      "text": {
        "type": "text"
      },
      "page_content": {
        "type": "text"
      },
      "doc_type": {
        "type": "keyword"
      },
      "category": {
        "type": "keyword"
      },
      "chunk_id": {
        "type": "keyword"
      },
      "parent_doc_id": {
        "type": "keyword"
      },
      "chunk_text": {
        "type": "text"
      },
      "chunk_index": {
        "type": "integer"
      },
      "metadata": {
        "type": "object",
        "enabled": true
      },
      "keywords": {
        "type": "keyword"
      },
      "keywords_text": {
        "type": "text"
      },
      "vector_field": {
        "type": "knn_vector",
        "dimension": 1536,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "engine": "lucene",
          "parameters": {
            "ef_construction": 128,
            "m": 24
          }
        }
      },
      "text_embedding_vector": {
        "type": "knn_vector",
        "dimension": 1536,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "engine": "lucene",
          "parameters": {
            "ef_construction": 128,
            "m": 24
          }
        }
      },
      "relevance_score": {
        "type": "float"
      },
      "created_date": {
        "type": "date"
      },
      "last_updated_date": {
        "type": "date"
      },
      "recency_score": {
        "type": "float"
      }
    }
  }
}'

# 3. User Authentication Index
echo ""
echo "3. Creating user authentication index (lexora_users_auth)..."
curl -X PUT "$OPENSEARCH_HOST/lexora_users_auth" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  },
  "mappings": {
    "properties": {
      "user_id": {
        "type": "keyword"
      },
      "email": {
        "type": "keyword",
        "fields": {
          "text": {
            "type": "text"
          }
        }
      },
      "username": {
        "type": "keyword"
      },
      "password_hash": {
        "type": "keyword"
      },
      "auth_provider": {
        "type": "keyword"
      },
      "account_status": {
        "type": "keyword"
      },
      "created_at": {
        "type": "date"
      },
      "last_login": {
        "type": "date"
      },
      "session_id": {
        "type": "keyword"
      },
      "session_token": {
        "type": "keyword"
      },
      "expires_at": {
        "type": "date"
      },
      "ip_address": {
        "type": "ip"
      },
      "user_agent": {
        "type": "text"
      }
    }
  }
}'

# 4. User Profile Index
echo ""
echo "4. Creating user profile index (lexora_users_profile)..."
curl -X PUT "$OPENSEARCH_HOST/lexora_users_profile" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  },
  "mappings": {
    "properties": {
      "user_id": {
        "type": "keyword"
      },
      "display_name": {
        "type": "text",
        "fields": {
          "keyword": {
            "type": "keyword"
          }
        }
      },
      "geo_location": {
        "type": "geo_point"
      },
      "preferences": {
        "type": "object",
        "enabled": true
      },
      "profile_completed": {
        "type": "boolean"
      },
      "search_history": {
        "type": "nested",
        "properties": {
          "query": {
            "type": "text"
          },
          "timestamp": {
            "type": "date"
          }
        }
      },
      "clicked_products": {
        "type": "nested",
        "properties": {
          "product_id": {
            "type": "keyword"
          },
          "timestamp": {
            "type": "date"
          }
        }
      },
      "purchased_products": {
        "type": "nested",
        "properties": {
          "product_id": {
            "type": "keyword"
          },
          "timestamp": {
            "type": "date"
          }
        }
      },
      "viewed_products": {
        "type": "keyword"
      },
      "saved_products": {
        "type": "keyword"
      },
      "feedback_ratings": {
        "type": "nested",
        "properties": {
          "product_id": {
            "type": "keyword"
          },
          "rating": {
            "type": "float"
          },
          "timestamp": {
            "type": "date"
          }
        }
      },
      "cart_history": {
        "type": "object",
        "enabled": true
      },
      "preferred_categories": {
        "type": "nested",
        "properties": {
          "category": {
            "type": "keyword"
          },
          "weight": {
            "type": "float"
          }
        }
      },
      "preferred_brands": {
        "type": "nested",
        "properties": {
          "brand": {
            "type": "keyword"
          },
          "weight": {
            "type": "float"
          }
        }
      },
      "price_range_preference": {
        "type": "object",
        "properties": {
          "min": {
            "type": "float"
          },
          "max": {
            "type": "float"
          }
        }
      },
      "style_preferences": {
        "type": "keyword"
      },
      "size_preferences": {
        "type": "keyword"
      },
      "color_preferences": {
        "type": "keyword"
      },
      "last_activity_date": {
        "type": "date"
      },
      "engagement_score": {
        "type": "float"
      },
      "profile_updated_at": {
        "type": "date"
      }
    }
  }
}'

# 5. Collaborative Signals Index
echo ""
echo "5. Creating collaborative signals index (lexora_collaborative_signals)..."
curl -X PUT "$OPENSEARCH_HOST/lexora_collaborative_signals" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  },
  "mappings": {
    "properties": {
      "user_id": {
        "type": "keyword"
      },
      "similar_users": {
        "type": "nested",
        "properties": {
          "user_id": {
            "type": "keyword"
          },
          "similarity_score": {
            "type": "float"
          }
        }
      },
      "similarity_algorithm": {
        "type": "keyword"
      },
      "last_computed": {
        "type": "date"
      },
      "product_id": {
        "type": "keyword"
      },
      "collective_popularity_score": {
        "type": "float"
      },
      "category_popularity": {
        "type": "nested",
        "properties": {
          "category": {
            "type": "keyword"
          },
          "popularity_score": {
            "type": "float"
          }
        }
      },
      "geo_popularity": {
        "type": "nested",
        "properties": {
          "region": {
            "type": "keyword"
          },
          "popularity_score": {
            "type": "float"
          }
        }
      },
      "trending_score": {
        "type": "float"
      },
      "co_viewed_products": {
        "type": "nested",
        "properties": {
          "product_id": {
            "type": "keyword"
          },
          "co_view_count": {
            "type": "integer"
          }
        }
      },
      "co_purchased_products": {
        "type": "nested",
        "properties": {
          "product_id": {
            "type": "keyword"
          },
          "co_purchase_count": {
            "type": "integer"
          }
        }
      },
      "segment_id": {
        "type": "keyword"
      },
      "segment_name": {
        "type": "keyword"
      },
      "user_ids": {
        "type": "keyword"
      },
      "segment_characteristics": {
        "type": "text"
      },
      "segment_product_affinities": {
        "type": "keyword"
      },
      "recommended_products": {
        "type": "nested",
        "properties": {
          "product_id": {
            "type": "keyword"
          },
          "score": {
            "type": "float"
          }
        }
      },
      "recommendation_scores": {
        "type": "object",
        "enabled": true
      },
      "recommendation_reason": {
        "type": "text"
      },
      "last_updated": {
        "type": "date"
      }
    }
  }
}'

echo ""
echo "================================================"
echo "All indices created successfully!"
echo ""
echo "Created indices:"
echo "  - lexora_products (products)"
echo "  - lexora_support (support documents)"
echo "  - lexora_users_auth (user authentication)"
echo "  - lexora_users_profile (user profiles)"
echo "  - lexora_collaborative_signals (collaborative signals)"
echo ""
echo "Verify indices with: curl $OPENSEARCH_HOST/_cat/indices?v"
