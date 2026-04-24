# Axora - AI-Powered Professional Workspace

A production-ready AI-powered workspace platform with autonomous execution, intelligent search, knowledge graphs, and collaborative features.

## 🚀 Features

### Core Features
- **Autonomous AI Execution**: BUILD mode with reflection and learning
- **AI-Powered Search**: Semantic search using Upstash Vector embeddings
- **Knowledge Graph**: Visualize connections between pages, skills, and tasks
- **Rich Page Editor**: Create and edit pages with blocks, tags, and markdown
- **Skills Tracking**: Track capabilities with evidence and goals
- **Task Management**: Organize tasks linked to pages and skills
- **Secure Authentication**: User authentication with Supabase

### AI Features
- **4 AI Modes**: ASK, EXPLAIN, PLAN, BUILD
- **Conversational AI**: Context-aware responses from your workspace
- **Smart Connections**: AI automatically suggests related content
- **Memory System**: Session context + long-term learning memory
- **Web Search Integration**: Brave Search for external knowledge
- **Cache System**: Redis + Supabase for fast responses

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** + **shadcn/ui** for beautiful UI
- **Framer Motion** for smooth animations
- **React Query** for data fetching
- **React Router** for navigation

### Backend
- **FastAPI** - Modern Python web framework
- **LangChain** - AI orchestration framework
- **LangGraph** - Agent workflow management
- **ChromaDB** - Vector database for embeddings
- **Sentence Transformers** - Text embeddings
- **OpenAI GPT-4** - Language model

### Database & Auth
- **Supabase** - PostgreSQL database with real-time features
- **Supabase Auth** - User authentication and authorization
- **Row Level Security** - Secure data access

## 📦 Project Structure

```
.
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   │   └── endpoints/  # Route handlers
│   │   ├── core/           # Core configuration
│   │   └── services/       # Business logic
│   │       ├── ai_agent.py      # LangGraph AI agent
│   │       └── vector_store.py  # Vector DB service
│   ├── main.py             # FastAPI app entry
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile          # Docker configuration
│
├── src/                    # React frontend
│   ├── components/         # Reusable components
│   ├── contexts/           # React contexts (Auth)
│   ├── pages/              # Page components
│   ├── lib/
│   │   └── api.ts          # API client
│   └── App.tsx             # Main app component
│
├── database/               # Database structure
│   └── sql/                # SQL scripts (data.sql)
├── docs/                   # Documentation
├── scripts/                # Utility scripts (.py, .sh, .bat)
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase account
- OpenAI API key

### 1. Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL from `database/sql/data.sql` in the SQL Editor
3. Note your project URL and anon key

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your credentials

# Run the server
python main.py
```

Backend will run at `http://localhost:8000`

### 3. Frontend Setup

```bash
# Install dependencies
npm install

# Update .env with backend URL
echo "VITE_API_URL=http://localhost:8000" >> .env

# Run development server
npm run dev
```

Frontend will run at `http://localhost:5173`

### 4. First Login

1. Visit `http://localhost:5173`
2. Click "Sign Up" and create an account
3. Start creating pages and asking questions!

## 🔧 Configuration

### Backend Environment Variables

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# Application
APP_ENV=development
SECRET_KEY=your_secret_key
CORS_ORIGINS=http://localhost:5173

# Vector Database
CHROMA_PERSIST_DIR=./data/chroma
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

### Frontend Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_API_URL=http://localhost:8000
```

## 📚 API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Key Endpoints

- `POST /api/v1/auth/signup` - Register user
- `POST /api/v1/auth/signin` - Login
- `POST /api/v1/ai/query` - Ask AI questions
- `GET /api/v1/pages` - List pages
- `POST /api/v1/pages` - Create page
- `GET /api/v1/graph/nodes` - Get knowledge graph
- `POST /api/v1/graph/infer-edges` - AI-infer connections

## 🚢 Deployment

See [docs/PRODUCTION_SETUP.md](./docs/PRODUCTION_SETUP.md) for detailed deployment instructions.

### Quick Deploy Options

**Frontend:**
- Vercel (recommended)
- Netlify
- AWS S3 + CloudFront

**Backend:**
- Google Cloud Run
- AWS Elastic Beanstalk
- Heroku
- Docker on any platform

## 🧪 Development

### Run Tests

```bash
# Backend
cd backend
pytest

# Frontend
npm test
```

### Code Quality

```bash
# Frontend linting
npm run lint

# Backend formatting
black backend/
```

## 🎯 Roadmap

- [ ] Real-time collaboration
- [ ] Mobile app
- [ ] Advanced graph algorithms
- [ ] Custom AI model fine-tuning
- [ ] Export/import functionality
- [ ] Team workspaces
- [ ] API webhooks
- [ ] Plugin system

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- UI components from [shadcn/ui](https://ui.shadcn.com)
- AI powered by [OpenAI](https://openai.com)
- Database by [Supabase](https://supabase.com)

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check the [docs/PRODUCTION_SETUP.md](./docs/PRODUCTION_SETUP.md) guide
- Review API documentation at `/docs`

---

**Built with ❤️ using React, FastAPI, LangChain, and AI**
