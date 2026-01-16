# AI-Powered Enterprise Search with OpenSearch

A production-ready search platform demonstrating how OpenSearch enables unified, intent-aware search across multiple modalities through a single interface.

## Business Value Proposition

### Problem Statement
Traditional enterprise search systems impose cognitive overhead: users must learn query syntax, understand filter hierarchies, and navigate multiple interfaces. This friction reduces conversion rates and increases support costs.

### Solution Architecture
This platform demonstrates OpenSearch's capability to deliver **unified search intelligence** through a single text interface that:

1. **Intent Classification & Routing**: LLM-powered intent analysis routes queries to optimal search strategies (semantic, keyword, visual, hybrid)
2. **Multi-Modal Search**: Unified interface supporting natural language, keyword, image-based, and hybrid queries
3. **Precision with Flexibility**: Hard filters (`bool.filter`) ensure exact requirements while semantic search maintains contextual relevance
4. **Conversational Support**: RAG-based support system with semantic knowledge retrieval

### Key Benefits

- **Reduced Friction**: Single interface eliminates need for query syntax knowledge
- **Improved Relevance**: Semantic understanding + precise filtering = higher conversion
- **Operational Efficiency**: Automated intent routing reduces support burden
- **Scalability**: OpenSearch handles millions of documents with sub-second latency
- **Cost Optimization**: Unified platform reduces infrastructure complexity

## System Architecture

```
[Architectural Diagram Placeholder]
Replace with draw.io diagram showing:
- Next.js Frontend → API Routes → Intent Router → OpenSearch Cluster
- Data Ingestion Pipeline → OpenSearch Indices
- Search Modalities: Semantic, Keyword, Visual, Hybrid
```

### Component Architecture

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
│  • Query classification & routing                            │
│  • Dynamic category inference                               │
│  • Search strategy selection                                │
└─────────┬───────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    OpenSearch Cluster                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Products   │  │   Support    │  │   (Future)   │      │
│  │   Index      │  │   Index      │  │   Users      │      │
│  │              │  │              │  │   Signals    │      │
│  │ • k-NN       │  │ • k-NN       │  │              │      │
│  │ • BM25       │  │ • BM25       │  │              │      │
│  │ • Filters    │  │ • Keywords    │  │              │      │
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

### 1. Intent-Aware Semantic Search
**Architecture**: LLM-based intent classification → Dynamic category inference → k-NN vector search with hard filters

**Implementation**:
- Query analyzed by OpenAI for shopping intent
- LLM determines relevant/excluded categories based on context
- Query embedded using `text-embedding-ada-002` (1536d)
- OpenSearch k-NN search constrained by `bool.filter` category constraints
- User-applied filters (price, brand, rating) work additively

**Example**: "I want to start a gym, what should I buy?"
- Intent: `generic_exploration`
- Categories: Allowed (Clothing, Shoes, Sports & Outdoors); Excluded (Electronics, Furniture)
- Results: Fitness products only, semantically ranked

### 2. Keyword Search (BM25)
**Architecture**: Traditional term matching with fuzzy matching and field boosting

**Implementation**:
- OpenSearch BM25 algorithm across title, description, keywords, brand
- Fuzzy matching handles typos
- Field boosting prioritizes title matches

### 3. Visual Search
**Architecture**: Client-side image embedding → k-NN similarity search

**Implementation**:
- TensorFlow.js MobileNet v2 generates 1280d embeddings in browser
- OpenSearch k-NN search over `image_embedding_vector` field
- Filters applied post-retrieval for refinement

### 4. Hybrid Search with Hard Filters
**Architecture**: Combined vector + BM25 with constraint-based filtering

**Implementation**:
- Simultaneous k-NN (semantic) and BM25 (keyword) queries
- Hard filters applied as `bool.filter` (constraints, not scoring)
- Results must satisfy all filter constraints while maintaining semantic relevance

**Query Structure**:
```json
{
  "query": {
    "bool": {
      "must": [
        { "knn": { "text_embedding_vector": { "vector": [...], "k": 20 } } },
        { "multi_match": { "query": "...", "fields": ["title^2", "description"] } }
      ],
      "filter": [
        { "term": { "category": "Furniture" } },
        { "range": { "price": { "gte": 100, "lte": 500 } } }
      ]
    }
  }
}
```

**Value**: Precision (filters eliminate irrelevant categories) + Relevance (semantic search finds intent matches) + Performance (filters reduce search space)

### 5. Support Semantic Search
**Architecture**: RAG pipeline with semantic retrieval and LLM-based answer generation

**Implementation**:
- Query embedded and searched over support knowledge base
- Top-k chunks retrieved via k-NN
- OpenAI generates formatted answers with markdown support

## Setup Instructions

### Prerequisites
- Docker Compose
- Node.js 18+, npm
- Python 3.9+
- OpenAI API key
- Unstructured.io API key (support ingestion)

### Step 1: Deploy OpenSearch

```bash
docker-compose up -d
curl http://localhost:9200  # Verify deployment
```

**Configuration**: OpenSearch 2.11.1, security disabled (dev), persistent volumes, 512MB heap

### Step 2: Create Indices

```bash
source venv/bin/activate
python scripts/create_opensearch_indices.py
```

**Indices Created**:
- `lexora_products`: Product catalog (k-NN + BM25 + filters)
- `lexora_support`: Support knowledge base (k-NN + BM25)
- `lexora_users_*`: User data (future use)
- `lexora_collaborative_signals`: Collaborative filtering (future use)

### Step 3: Configure Environment

Create `.env.local`:
```bash
OPENSEARCH_HOST=http://localhost:9200
PRODUCT_INDEX=lexora_products
SUPPORT_KNOWLEDGE_INDEX=lexora_support
OPENAI_API_KEY=your-key
OPENAI_MODEL=text-embedding-ada-002
EMBEDDING_DIMENSION=1536
UNSTRUCTURED_API_KEY=your-key
SUPPORT_DOCUMENT_PATH=LEXORA_SUPPORT_KNOWLEDGE_BASE.md
```

### Step 4: Ingest Data

**Products**:
```bash
source venv/bin/activate
export OPENAI_API_KEY="your-key"
python scripts/ingest_additional_products.py
```

**Support Knowledge**:
```bash
export OPENAI_API_KEY="your-key"
export UNSTRUCTURED_API_KEY="your-key"
python scripts/ingest_support_knowledge.py
```

**Verification**:
```bash
curl "http://localhost:9200/lexora_products/_count?pretty"
curl "http://localhost:9200/lexora_support/_count?pretty"
```

### Step 5: Deploy Application

```bash
npm install
npm run dev
```

Application available at `http://localhost:3000`

## Technical Specifications

### Embedding Models
- **Text**: `text-embedding-ada-002` (1536d) via OpenAI API
- **Image**: MobileNet v2 (1280d) via TensorFlow.js (client-side)

### Index Mappings

**`lexora_products`**:
- `text_embedding_vector` (knn_vector, 1536d)
- `image_embedding_vector` (knn_vector, 1280d)
- `title`, `description`, `derived_keywords` (text, BM25)
- `category`, `brand` (keyword, filtering)
- `price`, `rating` (float, range filtering)

**`lexora_support`**:
- `vector_field` (knn_vector, 1536d)
- `content`, `keywords_text` (text, BM25)
- `keywords` (keyword array)
- `title` (text, section matching)

### Intent Classification
OpenAI classifies queries into:
- `text_search`: Specific product queries
- `generic_exploration`: Lifestyle/exploratory queries
- `visual_search`: Image uploads
- `support`: Support questions
- `clarification`: Ambiguous queries

### Dynamic Category Filtering
LLM analyzes query context to determine relevant categories:
- **Inference**: Determines allowed/excluded categories based on intent
- **Application**: Applied as `bool.filter` constraints in OpenSearch
- **Example**: "wedding" → Allowed: Clothing, Accessories; Excluded: Furniture, Home Decor

## Usage Examples

### Semantic Search with Dynamic Filters
**Query**: "I want to start a gym, what should I buy?"
- Intent: `generic_exploration`
- LLM generates sub-queries: "workout equipment", "athletic wear", "fitness accessories"
- Categories: Allowed (Clothing, Shoes, Sports); Excluded (Electronics, Furniture)
- Results: Fitness products, semantically ranked

### Hybrid Search with Hard Filters
**Query**: "comfortable office chair" + Category: Furniture + Price: $100-$500
- Semantic k-NN finds ergonomic chairs
- BM25 boosts "office chair" matches
- Hard filters: category=Furniture, price range
- Results: Relevant furniture within budget

### Visual Search
**Action**: Upload product image
- MobileNet generates embedding
- k-NN search finds visually similar products
- Filters refine results (price, brand, category)

### Support RAG
**Query**: "compare care+ plans"
- Semantic search over support knowledge base
- LLM generates formatted comparison table
- Markdown rendering for structured output

## Troubleshooting

**OpenSearch Connection**:
```bash
docker-compose ps
docker-compose logs opensearch
docker-compose restart opensearch
```

**No Products**:
```bash
curl "http://localhost:9200/lexora_products/_count?pretty"
# If 0, re-run: python scripts/ingest_additional_products.py
```

**Support Search Issues**:
```bash
curl "http://localhost:9200/lexora_support/_count?pretty"
# If empty, re-run: python scripts/ingest_support_knowledge.py
```

**Embedding Model Mismatch**:
- Ensure `OPENAI_MODEL=text-embedding-ada-002` in all components
- Recreate indices if mapping errors occur

## Technology Stack

- **OpenSearch 2.11.1**: Search engine (k-NN, BM25, filtering)
- **Next.js 14**: React framework (App Router, API routes)
- **OpenAI**: Intent classification, text embeddings, answer generation
- **TensorFlow.js**: Client-side image embeddings (MobileNet)
- **Unstructured.io**: Document chunking for support knowledge base

## Project Structure

```
├── app/                          # Next.js application
│   ├── api/                      # API routes (intelligent-search, visual-search, support-search)
│   ├── page.tsx                  # Main product listing
│   └── support/                  # Support page
├── components/                   # React components
│   ├── SearchBar.tsx             # Unified search interface
│   ├── ProductGrid.tsx           # Results display
│   ├── FilterSidebar.tsx         # Filter controls
│   └── AnswerBox.tsx             # RAG answers
├── lib/                          # Core libraries
│   ├── intentRouter.ts           # Intent classification
│   ├── productSearch.ts          # Semantic product search
│   ├── semanticSupport.ts        # Support RAG
│   └── imageEmbeddings.ts        # Visual search
├── scripts/                      # Data ingestion
│   ├── create_opensearch_indices.py
│   ├── ingest_additional_products.py
│   └── ingest_support_knowledge.py
└── docker-compose.yml             # OpenSearch deployment
```
