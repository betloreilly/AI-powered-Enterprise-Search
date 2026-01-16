# AI-Powered Enterprise Search with OpenSearch

An intelligent search and discovery platform that demonstrates how **OpenSearch** can transform enterprise search by understanding user intent and providing multiple search modalities through a single, intuitive interface.

## Business Value: How OpenSearch Improves Enterprise Search

### The Problem with Traditional Search
Traditional enterprise search systems require users to:
- Learn complex query syntax
- Understand which filters to apply
- Navigate multiple search interfaces for different use cases
- Manually refine queries when results don't match intent

### The OpenSearch Solution
This application demonstrates how **OpenSearch's powerful search capabilities** enable a **single text box** that:

1. **Understands Natural Language Intent**
   - Users type natural language queries like "I want to start a gym, what should I buy?"
   - The system uses AI to understand intent and route to appropriate search strategies
   - No need for users to know about filters, categories, or search syntax

2. **Unifies Multiple Search Modalities**
   - **Semantic Search**: Vector similarity for understanding meaning and context
   - **Keyword Search**: BM25 for exact term matching and filtering
   - **Visual Search**: Image embeddings for finding visually similar products
   - **Hybrid Search**: Combines semantic and keyword for best of both worlds

3. **Provides Intelligent Results with Precise Control**
   - Automatically applies category filters based on shopping intent (LLM-powered dynamic filtering)
   - **Hard filters work seamlessly with semantic search**: Users can apply price, brand, rating filters without losing semantic understanding
   - Ranks results by relevance, not just keyword matches
   - Understands context (e.g., "gym" → fitness products, not electronics)
   - **OpenSearch's `bool.filter` ensures precision**: Filters are constraints, not just scoring boosts
   - **Example**: "comfortable office chair" + Furniture filter = ergonomic chairs (not office supplies or clothing)

4. **Enables Conversational Support**
   - Natural language support questions get direct answers
   - Semantic search over knowledge base provides accurate, contextual responses
   - No need to navigate FAQ pages or search through documentation

### Key Benefits

- **Reduced Friction**: One search box handles all use cases
- **Better Relevance**: Semantic understanding finds products users actually want
- **Precision with Flexibility**: Hard filters ensure exact requirements are met while semantic search maintains relevance
- **Higher Conversion**: Users find what they're looking for faster
- **Lower Support Burden**: AI-powered support answers common questions instantly
- **Scalable**: OpenSearch handles millions of products with sub-second response times
- **Best of Both Worlds**: Semantic understanding + precise filtering = perfect results

## Architecture

```
- User Interface (Next.js)
- Intent Router (OpenAI)
- OpenSearch Cluster
- Data Ingestion Pipeline
- Search Modalities (Semantic, Keyword, Visual, Hybrid)
```

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Frontend                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Search Bar  │  │ Product Grid │  │  Filters     │      │
│  │  (Text/Image)│  │  (Results)   │  │  (Sidebar)   │      │
│  └──────┬───────┘  └──────────────┘  └──────────────┘      │
└─────────┼───────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│              API Routes (Next.js Server)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Intelligent  │  │   Visual     │  │   Support    │      │
│  │   Search     │  │   Search    │  │   Search     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Intent Router (OpenAI)                          │
│  • Understands user intent                                   │
│  • Routes to appropriate search strategy                    │
│  • Applies category filters based on intent                 │
└─────────┬───────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    OpenSearch Cluster                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Products   │  │   Support    │  │   (Future)   │      │
│  │   Index      │  │   Index      │  │   Users      │      │
│  │              │  │              │  │   Signals    │      │
│  │ • Text       │  │ • Text       │  │              │      │
│  │   Embeddings │  │   Embeddings │  │              │      │
│  │ • Image      │  │ • Keywords    │  │              │      │
│  │   Embeddings │  │ • BM25       │  │              │      │
│  │ • BM25       │  │   Fields     │  │              │      │
│  │ • Filters    │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
          ▲
          │
┌─────────┴───────────────────────────────────────────────────┐
│              Data Ingestion Pipeline                         │
│  • Product Ingestion (MobileNet + OpenAI embeddings)        │
│  • Support Knowledge Ingestion (OpenAI embeddings)          │
└─────────────────────────────────────────────────────────────┘
```

## Search Modalities

### 1. Intent-Aware Semantic Search with Dynamic Filters
**How it works:**
- User query is analyzed by OpenAI to understand shopping intent
- LLM dynamically determines relevant product categories based on query context
- Query is converted to embedding using `text-embedding-ada-002`
- OpenSearch k-NN search finds semantically similar products
- **Dynamic category filters** are applied as hard constraints to ensure relevance
- Additional hard filters (price, brand, rating) can be applied by users

**Why Dynamic Filters Help:**
- **Semantic search alone** might return products from wrong categories (e.g., "gym" could match gym bags in Accessories, but also gym equipment in Electronics)
- **LLM-powered category inference** understands context and applies appropriate filters
- For "gym" queries, system automatically includes Clothing, Shoes, Sports & Outdoors
- System automatically excludes irrelevant categories (Electronics, Home Decor, Furniture)
- This ensures semantic understanding is constrained to relevant product types

**Example:** "I want to start a gym, what should I buy?"
- Intent: Generic exploration for fitness/gym setup
- LLM analysis: User needs fitness-related products, not electronics or furniture
- Categories allowed: Clothing, Shoes, Sports & Outdoors, Accessories
- Categories excluded: Electronics, Home Decor, Furniture
- OpenSearch query applies these as hard filters (`bool.filter`)
- Results: Workout clothes, gym shoes, fitness equipment (no laptops or sofas)

**User-Applied Filters:**
Users can further refine semantic results with additional hard filters:
- **Price range**: "Under $100" ensures only affordable gym products
- **Brand**: "Nike" narrows to specific brand
- **Rating**: "4+ stars" ensures quality products
- These filters work **with** semantic search, not against it

### 2. Keyword Search (BM25)
**How it works:**
- Traditional keyword matching using OpenSearch's BM25 algorithm
- Exact term matching with fuzzy matching for typos
- Searches across title, description, keywords, brand, category
- Fast and precise for specific product searches

**Example:** "Nike running shoes"
- Matches products with "Nike" and "running" and "shoes" in their text
- Results ranked by term frequency and inverse document frequency

### 3. Visual Search
**How it works:**
- User uploads an image
- Image is processed in browser using TensorFlow.js MobileNet model
- Generates 1280-dimensional image embedding
- OpenSearch k-NN search finds products with similar visual characteristics
- Filters can be applied to narrow results

**Example:** Upload a photo of a chair
- Finds chairs with similar style, color, and design
- Can filter by price, brand, category

### 4. Hybrid Search with Hard Filters
**How it works:**
- Combines semantic (vector) and keyword (BM25) search
- **Hard filters** are applied as constraints (not scoring) to ensure precision
- OpenSearch executes semantic/k keyword queries within filter boundaries
- Provides best of both worlds: semantic understanding + exact matches + precise filtering

**Why Hard Filters Matter:**
- **Semantic search** understands intent but may return irrelevant categories
- **Hard filters** (category, price, brand, rating) ensure results meet exact requirements
- Filters are applied as `bool.filter` clauses (must match, no scoring)
- This ensures all results satisfy user constraints while maintaining semantic relevance

**Example:** "comfortable office chair" + Category: "Furniture" + Price: "$100-$500"
- Semantic search finds ergonomic chairs, desk chairs (within Furniture category)
- Keyword search boosts exact matches for "office chair"
- **Hard filter** ensures only Furniture category products (excludes Electronics, Clothing)
- **Price filter** ensures only products in $100-$500 range
- Combined results show most relevant products that meet all criteria

**OpenSearch Query Structure:**
```json
{
  "query": {
    "bool": {
      "must": [
        {
          "knn": {
            "text_embedding_vector": {
              "vector": [...],
              "k": 20
            }
          }
        },
        {
          "multi_match": {
            "query": "comfortable office chair",
            "fields": ["title^2", "description", "derived_keywords"]
          }
        }
      ],
      "filter": [
        { "term": { "category": "Furniture" } },
        { "range": { "price": { "gte": 100, "lte": 500 } } }
      ]
    }
  }
}
```

**Benefits:**
- **Precision**: Hard filters eliminate irrelevant results (e.g., "office chair" won't return office supplies)
- **Relevance**: Semantic search finds products that match intent (comfortable, ergonomic)
- **User Control**: Users can refine results with filters without losing semantic understanding
- **Performance**: Filters reduce search space, making queries faster

### 5. Support Semantic Search
**How it works:**
- Support questions are converted to embeddings
- OpenSearch k-NN search over support knowledge base
- OpenAI generates direct answers from retrieved chunks
- Markdown formatting for tables, lists, and structured information

**Example:** "can you compare care+ plans"
- Finds relevant FAQ sections about Care+ plans
- Generates comparison table with plan details
- Provides accurate, formatted answer

## Setup Instructions

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ and npm
- Python 3.9+
- OpenAI API key
- Unstructured.io API key (for support knowledge ingestion)

### Step 1: Start OpenSearch with Docker Compose

```bash
# Start OpenSearch using docker-compose
docker-compose up -d

# Verify OpenSearch is running
curl http://localhost:9200
```

**Expected response:**
```json
{
  "name": "opensearch-node",
  "cluster_name": "opensearch-cluster",
  "version": {
    "number": "2.11.1"
  }
}
```

**Docker Compose Commands:**
```bash
# Start OpenSearch
docker-compose up -d

# Stop OpenSearch
docker-compose down

# View logs
docker-compose logs -f opensearch

# Check status
docker-compose ps
```

**Note:** The `docker-compose.yml` file configures OpenSearch with:
- Security plugin disabled (for local development)
- Persistent data volume (`opensearch-data`)
- Health checks enabled
- Memory settings optimized for development (512MB heap)

### Step 2: Create OpenSearch Indices

Create all required indices using the Python script:

```bash
# Activate virtual environment (if not already activated)
source venv/bin/activate

# Run index creation script
python scripts/create_opensearch_indices.py
```

**Or use the bash script:**
```bash
chmod +x scripts/create_opensearch_indices.sh
./scripts/create_opensearch_indices.sh
```

**This creates:**
- `lexora_products` - Product catalog with text and image embeddings
- `lexora_support` - Support knowledge base with text embeddings
- `lexora_users_auth` - User authentication (for future use)
- `lexora_users_profile` - User profiles (for future use)
- `lexora_collaborative_signals` - Collaborative signals (for future use)

**Verify indices:**
```bash
curl "http://localhost:9200/_cat/indices?v"
```

### Step 3: Install Frontend Dependencies

```bash
# Install Node.js dependencies
npm install
```

### Step 4: Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# OpenSearch Configuration
OPENSEARCH_HOST=http://localhost:9200
PRODUCT_INDEX=lexora_products
SUPPORT_KNOWLEDGE_INDEX=lexora_support

# OpenAI Configuration (Required for semantic search)
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=text-embedding-ada-002
EMBEDDING_DIMENSION=1536

# Unstructured.io (Required for support knowledge ingestion)
UNSTRUCTURED_API_KEY=your-unstructured-api-key-here

# Document Paths
SUPPORT_DOCUMENT_PATH=LEXORA_SUPPORT_KNOWLEDGE_BASE.md
```

### Step 5: Ingest Product Data

```bash
# Activate virtual environment
source venv/bin/activate

# Set OpenAI API key (if not in .env)
export OPENAI_API_KEY="your-openai-api-key"

# Run product ingestion script
python scripts/ingest_additional_products.py
```

**What this does:**
- Merges products from `scripts/additional_products.json`, `scripts/sample_products.json`, and `scripts/premium_products.json`
- Filters out products with invalid image URLs or short descriptions
- Generates MobileNet image embeddings (1280 dimensions) for visual search
- Generates OpenAI text embeddings (1536 dimensions) for semantic search
- Indexes products into `lexora_products` index

**Verify product ingestion:**
```bash
curl "http://localhost:9200/lexora_products/_count?pretty"
```

### Step 6: Ingest Support Knowledge Base

```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Set API keys (if not in .env)
export OPENAI_API_KEY="your-openai-api-key"
export UNSTRUCTURED_API_KEY="your-unstructured-api-key"

# Run support knowledge ingestion script
python scripts/ingest_support_knowledge.py
```

**What this does:**
- Processes `LEXORA_SUPPORT_KNOWLEDGE_BASE.md` using Unstructured.io
- Chunks documents by title (max 1000 chars, 200 char overlap)
- Extracts keywords for BM25 search
- Generates OpenAI text embeddings (1536 dimensions) for semantic search
- Indexes chunks into `lexora_support` index

**Verify support ingestion:**
```bash
curl "http://localhost:9200/lexora_support/_count?pretty"
```

### Step 7: Start the Application

```bash
# Start Next.js development server
npm run dev
```

The application will be available at `http://localhost:3000`

## Usage Examples

### Semantic Product Search

**Query:** "I want to start a gym, what should I buy?"

**What happens:**
1. Intent router analyzes query → `generic_exploration` intent
2. LLM generates multiple specific search queries:
   - "beginner workout equipment for home gym"
   - "comfortable athletic wear for exercising"
   - "essential accessories for gym workouts"
3. Each query is converted to embedding and searched in OpenSearch
4. Results are aggregated, deduplicated, and ranked by relevance
5. Category filters ensure only relevant products (Clothing, Shoes, Sports & Outdoors)

**Result:** Shows workout clothes, gym shoes, fitness equipment (no electronics or furniture)

### Visual Search

**Action:** Upload an image of a product

**What happens:**
1. Image is processed in browser using MobileNet
2. 1280-dimensional embedding is generated
3. OpenSearch k-NN search finds visually similar products
4. Filters can be applied to narrow results

**Result:** Products with similar visual characteristics (color, style, shape)

### Support Questions

**Query:** "can you compare care+ plans"

**What happens:**
1. Intent router detects `support` intent
2. Query is converted to embedding
3. OpenSearch k-NN search over support knowledge base
4. OpenAI generates formatted answer with comparison table
5. Answer displayed with markdown formatting

**Result:** Formatted comparison table showing Care+ Basic vs Premium plans

### Keyword Search with Filters

**Query:** "Nike running shoes" + Category: "Shoes" + Price: "Under $100"

**What happens:**
1. Intent router detects `text_search` intent
2. OpenSearch BM25 keyword search for "Nike running shoes"
3. Filters applied: category="Shoes", price < 100
4. Results ranked by relevance and filters

**Result:** Nike running shoes under $100

### Semantic Search with Hard Filters

**Query:** "comfortable office chair" + Category: "Furniture" + Price: "$100-$500" + Rating: "4+ stars"

**What happens:**
1. Intent router analyzes query → `text_search` intent
2. Query is converted to embedding for semantic search
3. OpenSearch executes hybrid search:
   - **Semantic (k-NN)**: Finds products semantically similar to "comfortable office chair"
   - **Keyword (BM25)**: Boosts exact matches for "office chair"
   - **Hard Filters** (applied as `bool.filter`):
     - `category = "Furniture"` (excludes Electronics, Clothing, etc.)
     - `price >= 100 AND price <= 500` (ensures budget match)
     - `rating >= 4.0` (ensures quality)
4. OpenSearch combines semantic relevance scores with keyword matches
5. All results must satisfy hard filter constraints (no exceptions)

**Why this is powerful:**
- **Without filters**: Semantic search might return "comfortable office supplies" or "office clothing"
- **With category filter**: Only furniture products are considered
- **With price filter**: Only products in budget range are shown
- **With rating filter**: Only quality products are displayed
- **Semantic search still works**: Finds ergonomic chairs, desk chairs, task chairs (not just exact "office chair" matches)

**Result:** Ergonomic office chairs, desk chairs, and task chairs in $100-$500 range with 4+ star ratings (no office supplies, no clothing, no out-of-budget items)

**OpenSearch Query Structure:**
```json
{
  "query": {
    "bool": {
      "must": [
        {
          "knn": {
            "text_embedding_vector": {
              "vector": [0.123, -0.456, ...],
              "k": 20
            }
          }
        },
        {
          "multi_match": {
            "query": "comfortable office chair",
            "fields": ["title^2", "description", "derived_keywords"],
            "fuzziness": "AUTO"
          }
        }
      ],
      "filter": [
        { "term": { "category": "Furniture" } },
        { "range": { "price": { "gte": 100, "lte": 500 } } },
        { "range": { "rating": { "gte": 4.0 } } }
      ]
    }
  }
}
```

## Technical Details

### Embedding Models

- **Text Embeddings**: `text-embedding-ada-002` (1536 dimensions)
  - Used for: Product semantic search, support semantic search
  - Generated by: OpenAI API

- **Image Embeddings**: MobileNet v2 (1280 dimensions)
  - Used for: Visual similarity search
  - Generated by: TensorFlow.js in browser

### OpenSearch Index Mappings

#### `lexora_products` Index

**Key Fields:**
- `text_embedding_vector` (knn_vector, 1536d) - For semantic text search
- `image_embedding_vector` (knn_vector, 1280d) - For visual search
- `title` (text) - For BM25 keyword search
- `description` (text) - For BM25 keyword search
- `derived_keywords` (text) - For BM25 boosting
- `category` (keyword) - For filtering
- `brand` (keyword) - For filtering
- `price` (float) - For range filtering
- `rating` (float) - For sorting

#### `lexora_support` Index

**Key Fields:**
- `vector_field` (knn_vector, 1536d) - For semantic search
- `content` (text) - For BM25 keyword search
- `keywords` (keyword array) - For BM25 boosting
- `keywords_text` (text) - For BM25 search
- `title` (text) - For section matching

### Intent Classification

The system uses OpenAI to classify user queries into intents:

- **`text_search`**: Specific product searches ("Nike shoes")
- **`generic_exploration`**: Lifestyle/exploratory queries ("I want to start a gym")
- **`visual_search`**: Image uploads
- **`support`**: Support questions ("how do I return a product")
- **`clarification`**: Ambiguous queries requiring clarification

### Category Filtering with LLM

For semantic searches, the system uses an LLM to determine relevant categories:

**Example:**
- Query: "I'm going to a wedding, what should I buy?"
- LLM determines: Allowed: Clothing, Accessories, Watches; Excluded: Home Decor, Furniture
- OpenSearch k-NN search is constrained to allowed categories
- Results show formal wear, accessories (no sofas or curtains)

## Troubleshooting

### OpenSearch Connection Issues

```bash
# Check if OpenSearch is running
curl http://localhost:9200

# Check Docker Compose services
docker-compose ps

# View OpenSearch logs
docker-compose logs opensearch

# Restart OpenSearch
docker-compose restart opensearch

# If issues persist, restart the service
docker-compose down
docker-compose up -d
```

### No Products Showing

```bash
# Check product count
curl "http://localhost:9200/lexora_products/_count?pretty"

# If count is 0, re-run ingestion
python scripts/ingest_additional_products.py
```

### Support Search Not Working

```bash
# Check support index count
curl "http://localhost:9200/lexora_support/_count?pretty"

# Verify embeddings exist
curl "http://localhost:9200/lexora_support/_search?pretty&size=1" | grep vector_field

# If empty, re-run support ingestion
python scripts/ingest_support_knowledge.py
```


## Key Technologies

- **OpenSearch**: Search and analytics engine (vector + keyword search)
- **Next.js 14**: React framework with App Router
- **OpenAI**: Intent classification and text embeddings
- **TensorFlow.js**: Browser-based image embeddings (MobileNet)
- **Unstructured.io**: Document chunking for support knowledge base
