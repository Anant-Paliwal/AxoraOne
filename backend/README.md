# AI Knowledge Platform - Backend

Production-ready FastAPI backend with AI-powered features using LangChain, LangGraph, and vector embeddings.

## Features

- **AI Agent**: LangGraph-powered conversational AI with context retrieval
- **Vector Search**: Semantic search using ChromaDB and sentence transformers
- **Knowledge Graph**: AI-inferred connections between pages, skills, and tasks
- **Authentication**: Supabase Auth integration
- **RESTful API**: Complete CRUD operations for all entities

## Tech Stack

- **FastAPI**: Modern Python web framework
- **LangChain & LangGraph**: AI agent orchestration
- **ChromaDB**: Vector database for embeddings
- **Sentence Transformers**: Text embeddings
- **Supabase**: Authentication and PostgreSQL database
- **OpenAI**: GPT-4 for AI responses

## Setup

### 1. Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Supabase anon key
- `SUPABASE_SERVICE_KEY`: Supabase service role key
- `OPENAI_API_KEY`: OpenAI API key
- `SECRET_KEY`: Random secret for JWT

### 3. Run the Server

```bash
# Development
python main.py

# Production
uvicorn main:app --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - Register new user
- `POST /api/v1/auth/signin` - Sign in user
- `POST /api/v1/auth/signout` - Sign out user
- `GET /api/v1/auth/me` - Get current user

### AI Chat
- `POST /api/v1/ai/query` - Process AI query with context retrieval
- `POST /api/v1/ai/infer-connections/{page_id}` - Infer page connections

### Pages
- `GET /api/v1/pages` - List all pages
- `POST /api/v1/pages` - Create page
- `GET /api/v1/pages/{id}` - Get page
- `PATCH /api/v1/pages/{id}` - Update page
- `DELETE /api/v1/pages/{id}` - Delete page

### Skills
- `GET /api/v1/skills` - List all skills
- `POST /api/v1/skills` - Create skill
- `PATCH /api/v1/skills/{id}` - Update skill
- `DELETE /api/v1/skills/{id}` - Delete skill

### Tasks
- `GET /api/v1/tasks` - List all tasks
- `POST /api/v1/tasks` - Create task
- `PATCH /api/v1/tasks/{id}` - Update task
- `DELETE /api/v1/tasks/{id}` - Delete task

### Knowledge Graph
- `GET /api/v1/graph/nodes` - Get all graph nodes
- `GET /api/v1/graph/edges` - Get all graph edges
- `POST /api/v1/graph/edges` - Create edge
- `POST /api/v1/graph/infer-edges` - AI-infer connections
- `DELETE /api/v1/graph/edges/{id}` - Delete edge

## Architecture

### AI Agent Flow (LangGraph)

```
User Query → Retrieve Context → Generate Response → Suggest Actions
```

1. **Retrieve Context**: Semantic search in vector store
2. **Generate Response**: LLM processes query with context
3. **Suggest Actions**: Recommend follow-up actions

### Vector Store

- Uses ChromaDB for persistent vector storage
- Sentence Transformers for embeddings
- Automatic indexing when pages are created/updated
- Semantic similarity search for related content

## Deployment

### Docker

```bash
docker build -t ai-knowledge-backend .
docker run -p 8000:8000 --env-file .env ai-knowledge-backend
```

### Cloud Platforms

- **AWS**: Deploy with Elastic Beanstalk or ECS
- **Google Cloud**: Deploy with Cloud Run
- **Heroku**: Use Procfile for deployment

## Development

### Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── endpoints/     # API route handlers
│   │   └── dependencies.py # Auth dependencies
│   ├── core/
│   │   ├── config.py      # Settings
│   │   └── supabase.py    # Supabase client
│   └── services/
│       ├── ai_agent.py    # LangGraph agent
│       └── vector_store.py # Vector DB service
├── main.py                # FastAPI app
└── requirements.txt       # Dependencies
```

### Adding New Features

1. Create endpoint in `app/api/endpoints/`
2. Add route to `app/api/routes.py`
3. Implement service logic in `app/services/`
4. Update documentation

## Testing

```bash
pytest tests/
```

## License

MIT
