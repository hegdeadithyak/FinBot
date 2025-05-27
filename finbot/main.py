from sentence_transformers import SentenceTransformer
import pathlib, textwrap, numpy as np, pickle, faiss
from pypdf import PdfReader
from tqdm import tqdm
import faiss, numpy as np, pickle, json, os
# from sentence_transformers import SentenceTransformer
import os
import pickle
import faiss
import numpy as np
import textwrap
from sentence_transformers import SentenceTransformer


model = SentenceTransformer("BAAI/bge-base-en-v1.5", device="cpu")  # or "cuda"
PDF_DIR   = pathlib.Path("/content/")   # put your files here
CHUNK_SZ  = 512                    # characters per chunk
OVERLAP   = 64

def pdf_to_chunks(pdf_path):
    pages = PdfReader(str(pdf_path)).pages
    full_text = "\n".join(page.extract_text() or "" for page in pages)
    full_text = " ".join(full_text.split())        # collapse whitespace
    # sliding-window splitter
    for i in range(0, len(full_text), CHUNK_SZ - OVERLAP):
        yield full_text[i : i + CHUNK_SZ]

docs, texts = [], []               # metadata + raw text
for pdf in tqdm(sorted(PDF_DIR.glob("*.pdf"))):
    for chunk in pdf_to_chunks(pdf):
        docs.append({"source": pdf.name, "text": chunk})
        texts.append(chunk)

emb = model.encode(texts, batch_size=64,
                   show_progress_bar=True, normalize_embeddings=True)
emb = np.array(emb, dtype="float32")              # FAISS needs float32

index = faiss.IndexFlatIP(emb.shape[1])           # cosine similarity (because vectors are L2-normed)
index.add(emb)
faiss.write_index(index, "index.faiss")           # persist for later

with open("docs.pkl", "wb") as f:                 # keep metadata alongside
    pickle.dump(docs, f)

index  = faiss.read_index("index.faiss")
docs   = pickle.load(open("docs.pkl", "rb"))
model  = SentenceTransformer("BAAI/bge-base-en-v1.5")

def retrieve(query, k=6):
    q_emb = model.encode([query], normalize_embeddings=True)
    D, I  = index.search(np.array(q_emb, dtype="float32"), k)
    return [docs[idx] | {"score": float(D[0][rank])}
            for rank, idx in enumerate(I[0])]


# ───────────────────────────────────────────────────────────────
# 0.  one-time set-up you (already) did elsewhere
#
#     ─ pdfs/           ← your source docs
#     ├── index.faiss   ← vector store
#     └── docs.pkl      ← metadata list  [{source,text}, …]
# ───────────────────────────────────────────────────────────────

def load_rag_system():
    """Load the vector store and metadata with error handling"""
    try:
        index = faiss.read_index("index.faiss")
        with open("docs.pkl", "rb") as f:
            docs = pickle.load(f)
        embed = SentenceTransformer("BAAI/bge-base-en-v1.5")
        return index, docs, embed
    except FileNotFoundError as e:
        print(f"Error: Required file not found - {e}")
        print("Make sure index.faiss and docs.pkl exist in the current directory")
        return None, None, None
    except Exception as e:
        print(f"Error loading RAG system: {e}")
        return None, None, None

# Load the system
index, docs, embed = load_rag_system()

def retrieve(query, k=6):
    """Retrieve relevant documents for a query"""
    if index is None or docs is None or embed is None:
        return []

    try:
        vec = embed.encode([query], normalize_embeddings=True)
        D, I = index.search(np.asarray(vec, dtype="float32"), k)

        results = []
        for rank, idx in enumerate(I[0]):
            if idx < len(docs):  # Ensure valid index
                doc = docs[idx].copy()
                doc["score"] = float(D[0][rank])
                results.append(doc)

        return results
    except Exception as e:
        print(f"Error during retrieval: {e}")
        return []

# 2. Create a Gemini client with proper error handling
try:
    import google.generativeai as genai

    # Use environment variable for API key (more secure)
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        # Fallback to your hardcoded key (not recommended for production)
        api_key = "AIzaSyAD6BGpyg7Dgk6dW5vbiW6eYYkp9ytoJsk"
        print("Warning: Using hardcoded API key. Consider using environment variable GEMINI_API_KEY")

    genai.configure(api_key=api_key)

except ImportError:
    print("Error: google-generativeai package not installed")
    print("Install with: pip install google-generativeai")
    genai = None
except Exception as e:
    print(f"Error configuring Gemini: {e}")
    genai = None

def rag_chat_gemini(question: str,
                    k: int = 6,
                    model_name: str = "gemini-1.5-flash",
                    temperature: float = 0.2) -> str:
    """
    RAG chat function with improved error handling
    """
    if genai is None:
        return "Error: Gemini client not available"

    if not question.strip():
        return "Error: Question cannot be empty"

    try:
        # Retrieve relevant passages
        passages = retrieve(question, k)
        print(passages)
        if not passages:
            return "Error: No relevant documents found or retrieval failed"

        # Build context from passages
        context = "\n\n".join(
            f"[{i+1}] ({p['source']}, score={p['score']:.3f})\n"
            f"{textwrap.fill(p['text'], 100)}"
            for i, p in enumerate(passages)
        )

        system_instruction = (
            "You are a concise QA assistant. "
            "Answer **only** from the context below; if the answer is not contained, say you don't know. "
            "Cite passage numbers in square brackets."
        )

        user_prompt = f"Context:\n{context}\n\nQuestion: {question}"

        # Generate response
        model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=system_instruction
        )

        response = model.generate_content(
            user_prompt,
            generation_config=genai.types.GenerationConfig(temperature=temperature)
        )

        return response.text

    except Exception as e:
        return f"Error generating response: {str(e)}"

# 4. Test the system
if __name__ == "__main__":
    if all([index is not None, docs is not None, embed is not None, genai is not None]):
        print("RAG system loaded successfully!")
        print("\nTesting with your question:")
        result = rag_chat_gemini("How do I retrieve my HDFC lost Debit Card")
        print(result)
    else:
        print("RAG system failed to load. Please check your setup:")
        print("- Ensure index.faiss and docs.pkl exist")
        print("- Install required packages: sentence-transformers, faiss-cpu, google-generativeai")
        print("- Set GEMINI_API_KEY environment variable")