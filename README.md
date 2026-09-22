# Resume RAG

A smart resume search and question-answering application that helps recruiters, hiring teams, and job applicants interact with resume content using retrieval-augmented generation (RAG).

This project turns PDF resumes into searchable, queryable knowledge so users can ask questions like:

- Which candidates have experience with Python and cloud infrastructure?
- What projects does this applicant have in machine learning?
- Which resumes mention leadership, product design, or QA automation?

---

## Features

- Upload and parse resume documents
- Extract structured information from resumes
- Store and index resume content for semantic search
- Ask natural-language questions over resume data
- Retrieve the most relevant resume chunks and answer from them
- Support multiple resumes in one knowledge base
- Clean, extensible architecture for future AI integrations

---

## Tech Stack

- Python
- FastAPI (optional backend service)
- LangChain or similar RAG tooling
- Vector database (FAISS, Pinecone, Qdrant, or pgvector)
- Embedding model
- LLM for answer generation
- PDF parsing and text extraction utilities

---

## Project Goals

This project aims to make large collections of resumes easier to search and reason over without manually reading every document. Instead of spending hours reviewing CVs, users can ask targeted questions and quickly identify the most relevant candidates or experience.

---

## Typical Workflow

1. Upload one or more resumes
2. Extract text from the documents
3. Chunk and embed the content
4. Store the embeddings in a vector database
5. Run semantic search and retrieve the most relevant chunks
6. Generate a grounded answer using an LLM

---

## Repository Structure

```text
Resume_rag/
+-- app/
¦   +-- api/
¦   +-- core/
¦   +-- models/
¦   +-- services/
¦   +-- utils/
+-- data/
¦   +-- resumes/
+-- notebooks/
+-- tests/
+-- .env.example
+-- .gitignore
+-- requirements.txt
+-- README.md
+-- main.py
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- A working virtual environment
- Access to an embedding model and LLM provider
- Optional: vector database service

### Installation

```bash
git clone https://github.com/macheteemely/Resume_rag.git
cd Resume_rag
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
OPENAI_API_KEY=your_key_here
MODEL_NAME=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
VECTOR_DB_PATH=./data/vector_store
```

---

## Running the App

```bash
python main.py
```

If you are building an API-based version, the local server can usually be started with:

```bash
uvicorn app.api.main:app --reload
```

---

## Example Use Cases

- Recruiter search: "Find candidates with strong backend engineering experience in Python and SQL."
- Hiring manager query: "Who has worked with customer-facing SaaS products in the last 3 years?"
- Candidate review: "Summarize the skills and project highlights for this resume."

---

## Roadmap

- Resume upload and parsing
- Embedding pipeline for semantic search
- Retrieval-based answer generation
- Candidate ranking and matching
- UI dashboard for recruitment workflows
- Multi-language support and better resume normalization

---

## Contributing

Contributions are welcome. If you would like to improve the project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Open a pull request with a clear description

---

## License

This project is currently under active development. Add an appropriate license before production use.

---

## Notes

This repository is intended as a starting point for a resume-based RAG application. You can extend it with project-specific indexing logic, document preprocessing, candidate scoring, and richer user interfaces depending on your use case.
