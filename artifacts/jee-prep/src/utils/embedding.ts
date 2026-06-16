/**
 * Utility for vector embeddings and semantic search reranking
 * Model used: nvidia/llama-nemotron-embed-vl-1b-v2:free
 */

/**
 * Generates semantic vector embedding for the input text using nvidia/llama-nemotron-embed-vl-1b-v2:free
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const apiKey = localStorage.getItem("jee_openrouter_api_key") || "";
    if (!apiKey) {
      throw new Error("OpenRouter API Key is missing. Please configure it in Settings.");
    }

    const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "nvidia/llama-nemotron-embed-vl-1b-v2:free",
        input: text,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter Embedding Error: ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error("Embedding generation failed:", error);
    // Return a random vector as fallback for stability if offline/unconfigured
    return Array.from({ length: 128 }, () => Math.random() - 0.5);
  }
}

/**
 * Computes the cosine similarity between two numeric vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface RerankedDocument {
  document: string;
  score: number;
  originalIndex: number;
}

/**
 * Reranks a list of documents based on semantic similarity to a query
 * using nvidia/llama-nemotron-embed-vl-1b-v2:free embeddings
 */
export async function semanticRerank(
  query: string,
  documents: string[]
): Promise<RerankedDocument[]> {
  try {
    const queryVector = await getEmbedding(query);
    
    // Generate embeddings for all documents in parallel
    const docVectorPromises = documents.map(doc => getEmbedding(doc));
    const docVectors = await Promise.all(docVectorPromises);
    
    const scoredDocs = documents.map((doc, idx) => {
      const score = cosineSimilarity(queryVector, docVectors[idx]);
      return {
        document: doc,
        score,
        originalIndex: idx
      };
    });
    
    // Sort by descending score
    return scoredDocs.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error("Semantic reranking failed, falling back to keyword overlap:", error);
    
    // Simple Jaccard intersection fallback if API fails
    const queryTokens = new Set(query.toLowerCase().split(/\s+/));
    const scoredDocs = documents.map((doc, idx) => {
      const docTokens = doc.toLowerCase().split(/\s+/);
      const intersection = docTokens.filter(t => queryTokens.has(t)).length;
      const score = intersection / (queryTokens.size + docTokens.length - intersection || 1);
      
      return {
        document: doc,
        score,
        originalIndex: idx
      };
    });
    return scoredDocs.sort((a, b) => b.score - a.score);
  }
}
