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

# ───────────────────────────────────────────────────────────────
# Web Search Integration using SERP API
# ───────────────────────────────────────────────────────────────

def web_search(query: str, num_results: int = 5) -> List[Dict]:
    """
    Search the web using SERP API
    Returns a list of search results with title, snippet, and link
    """
    serp_api_key = "0e2d204db305a2f0fb94dc6964dbc82412f5fe7a7837a17f44f3376709307217"
    if not serp_api_key:
        print("Warning: SERP_API_KEY not found in environment variables")
        return []

    try:
        url = "https://serpapi.com/search"
        params = {
            "engine": "google",
            "q": query,
            "api_key": serp_api_key,
            "num": num_results,
            "gl": "us",  # country
            "hl": "en"   # language
        }

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()

        results = []
        if "organic_results" in data:
            for result in data["organic_results"]:
                results.append({
                    "source": result.get("link", ""),
                    "title": result.get("title", ""),
                    "text": result.get("snippet", ""),
                    "score": 0.0,  # Web results don't have similarity scores
                    "type": "web"
                })

        return results

    except requests.exceptions.RequestException as e:
        print(f"Error making web search request: {e}")
        return []
    except json.JSONDecodeError as e:
        print(f"Error parsing search results: {e}")
        return []
    except Exception as e:
        print(f"Unexpected error in web search: {e}")
        return []

def should_use_web_search(local_results: List[Dict], score_threshold: float = 0.3) -> bool:
    """
    Determine if web search should be used based on local results quality
    FAISS cosine distance: 0.0 = perfect match, higher = less similar
    """
    if not local_results:
        print("No local results found, using web search")
        return True

    # Get best (lowest) similarity score
    best_score = min(result["score"] for result in local_results)
    print(f"Best local result score: {best_score:.3f} (threshold: {score_threshold})")

    # If best score is above threshold, results are not good enough
    if best_score > score_threshold:
        print("Local results quality insufficient, using web search")
        return True

    print("Local results sufficient, skipping web search")
    return False

# ───────────────────────────────────────────────────────────────
# Gemini Configuration
# ───────────────────────────────────────────────────────────────

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

def rag_chat_with_websearch(question: str,
                           k: int = 6,
                           model_name: str = "gemini-1.5-flash",
                           temperature: float = 0.2,
                           use_web_fallback: bool = True,
                           score_threshold: float = 0.7) -> str:
    """
    Enhanced RAG chat function with web search fallback
    """
    if genai is None:
        return "Error: Gemini client not available"

    if not question.strip():
        return "Error: Question cannot be empty"

    try:
        # First, try local retrieval
        local_passages = retrieve(question, k)
        print(f"Local results found: {len(local_passages)}")

        # Determine if we should use web search
        use_websearch = use_web_fallback and should_use_web_search(local_passages, score_threshold)

        passages = local_passages
        context_sources = "local knowledge base"

        if use_websearch:
            print("Local results insufficient, searching web...")
            web_results = web_search(question, num_results=3)
            print(f"Web results found: {len(web_results)}")

            if web_results:
                # Combine local and web results
                passages = local_passages + web_results
                context_sources = "local knowledge base and web search"
            else:
                print("Web search failed, using only local results")

        if not passages:
            return "Error: No relevant information found in local documents or web search"

        # Build context from passages
        context_parts = []
        for i, p in enumerate(passages):
            source_info = p['source'] if p['source'] else "Unknown"
            if p.get('type') == 'web':
                title = p.get('title', 'Web Result')
                context_parts.append(
                    f"[{i+1}] Web: {title}\n"
                    f"Source: {source_info}\n"
                    f"{textwrap.fill(p['text'], 100)}"
                )
            else:
                context_parts.append(
                    f"[{i+1}] Local: ({source_info}, similarity score={p['score']:.3f})\n"
                    f"{textwrap.fill(p['text'], 100)}"
                )

        context = "\n\n".join(context_parts)

        system_instruction = (
            "You are a helpful QA assistant. "
            f"Answer the question using information from the {context_sources}. "
            "If the answer is not contained in the provided context, say you don't know. "
            "Cite passage numbers in square brackets [1], [2], etc. "
            "When citing web sources, mention they are from web search."
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

def rag_chat_gemini(question: str,
                    k: int = 6,
                    model_name: str = "gemini-1.5-flash",
                    temperature: float = 0.2) -> str:
    """
    Original RAG chat function (local only) - kept for backward compatibility
    """
    return rag_chat_with_websearch(
        question=question,
        k=k,
        model_name=model_name,
        temperature=temperature,
        use_web_fallback=False
    )

# 4. Test the system
if __name__ == "__main__":
    print("Initializing RAG system...")

    # Check individual components
    print(f"Index loaded: {index is not None}")
    print(f"Docs loaded: {docs is not None and len(docs) if docs else 0}")
    print(f"Embeddings loaded: {embed is not None}")
    print(f"Gemini available: {genai is not None}")

    if all([index is not None, docs is not None, embed is not None, genai is not None]):
        print("\n" + "="*60)
        print("RAG SYSTEM LOADED SUCCESSFULLY!")
        print("="*60)

        # Test local retrieval first
        test_query = "How do I retrieve my HDFC lost Debit Card"
        print(f"\nTesting local retrieval for: '{test_query}'")
        local_results = retrieve(test_query, k=3)
        print(f"Local results: {len(local_results)}")
        for i, result in enumerate(local_results):
            print(f"  {i+1}. Score: {result['score']:.3f}, Source: {result.get('source', 'Unknown')}")

        # Test web search independently
        print(f"\nTesting web search for: '{test_query}'")
        web_results = web_search(test_query, num_results=3)
        print(f"Web results: {len(web_results)}")
        for i, result in enumerate(web_results):
            print(f"  {i+1}. Title: {result.get('title', 'No title')[:50]}...")

        # Test full system
        print("\n" + "="*60)
        print("Testing FULL RAG WITH WEB SEARCH:")
        print("="*60)
        result_with_web = rag_chat_with_websearch(test_query, score_threshold=0.3)
        print("\nFINAL ANSWER:")
        print("-" * 40)
        print(result_with_web)

        # Test with a question that definitely needs web search
        print("\n" + "="*60)
        print("Testing question requiring web search:")
        print("="*60)
        web_question = "What are the current HDFC bank FD interest rates in 2025?"
        result_web = rag_chat_with_websearch(web_question, score_threshold=0.2)
        print(f"\nQuestion: {web_question}")
        print("\nFINAL ANSWER:")
        print("-" * 40)
        print(result_web)

    else:
        print("\n" + "="*60)
        print("RAG SYSTEM SETUP ISSUES:")
        print("="*60)
        if index is None:
            print("❌ index.faiss not found or failed to load")
        if docs is None:
            print("❌ docs.pkl not found or failed to load")
        if embed is None:
            print("❌ SentenceTransformer failed to load")
        if genai is None:
            print("❌ Google Generative AI not available")

        print("\nSetup checklist:")
        print("1. Ensure index.faiss and docs.pkl exist in current directory")
        print("2. Install: pip install sentence-transformers faiss-cpu google-generativeai requests")
        print("3. Set GEMINI_API_KEY environment variable")
        print("4. Verify SERP API key is working")
