import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API for embeddings
const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

// Initialize Groq API base configuration (we use fetch to avoid browser SDK warnings)
const groqApiKey = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Generates an embedding for a given text using Gemini
 * Model: text-embedding-004 (1536 dimensions — within pgvector HNSW 2000-dim limit)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!genAI) {
    throw new Error('Gemini API key is missing.');
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-embedding-001'
    });

    const result = await model.embedContent(text);

    // 🔥 CRITICAL FIX
    return result.embedding.values.slice(0, 1536);

  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate profile embedding.');
  }
}

/**
 * Calls Groq API to get an AI profile optimization
 */
export async function generateProfileOptimization(profile: any) {
  if (!groqApiKey) {
    throw new Error('Groq API key is missing. Please add VITE_GROQ_API_KEY to your .env file.');
  }

  const prompt = `Analyze this matrimonial profile and improve it for better matchmaking success.
  
Profile details:
Name: ${profile.name}
Age: ${profile.age}
Gender: ${profile.gender}
City: ${profile.city}
Profession: ${profile.profession}
Bio: ${profile.bio}
Languages: ${profile.languages?.join(', ')}
Ethnicity: ${profile.ethnicity}
Willing to relocate: ${profile.willing_to_relocate}
Introvert/Extrovert: ${profile.introvert_extrovert} (1-10)
Hobbies: ${profile.hobbies?.join(', ')}
Habits/Lifestyle: ${profile.habits}
Social Preferences: ${profile.social_preferences}
Career Ambition: ${profile.career_ambition}
Family Goals: ${profile.family_goals}
Lifestyle Choices: ${profile.lifestyle_choices}
Height: ${profile.height}
Fitness Level: ${profile.fitness_level}
Style: ${profile.style}
Search Intent: ${profile.search_intent}
Prompts: ${JSON.stringify(profile.prompts)}

Return ONLY valid JSON with this exact structure:
{
  "profile_score": number (0-100),
  "strengths": [string],
  "weaknesses": [string],
  "missing_fields": [string],
  "suggestions": [string],
  "improved_bio": string,
  "improved_profession": string,
  "improved_hobbies": [string],
  "improved_habits": string,
  "improved_prompts": {
    "My perfect weekend would be...": string,
    "I am most passionate about...": string,
    "The most important quality in a partner is...": string
  },
  "match_boost_estimate": string
}

Rules:
- Be practical and specific
- Focus on improving match success
- Do not be generic
- Keep suggestions actionable
- Rewrite bio to be more attractive and clear
- Suggest better ways to describe profession and hobbies if needed
- Output MUST be valid JSON only.`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Fast and capable for this task
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('Error generating profile optimization:', error);
    throw new Error('Failed to analyze profile. Please try again later.');
  }
}

/**
 * Calls Groq API to explain why the retrieved profiles match the user's query
 */
export async function generateMatchExplanation(query: string, profiles: any[]) {
  if (!groqApiKey) {
    throw new Error('Groq API key is missing. Please add VITE_GROQ_API_KEY to your .env file.');
  }

  // If no profiles found, return early
  if (!profiles || profiles.length === 0) {
    return "I couldn't find any profiles matching your exact criteria right now. Try adjusting your search!";
  }

  // Only take essential fields to save context window
  const simpleProfiles = profiles.map(p => ({
    name: p.name,
    age: p.age,
    city: p.city,
    profession: p.profession,
    bio: p.bio,
    match_score: `${Math.round(p.similarity * 100)}%`
  }));

  const prompt = `A user is searching for matrimonial matches with this query: "${query}"

Based on the vector search, here are the top matching profiles:
${JSON.stringify(simpleProfiles, null, 2)}

Write a friendly, concise response explaining WHY these profiles match the user's request. 
Act as a helpful AI Matchmaker. 
- Highlight the best couple of matches specifically.
- Keep it under 4 short paragraphs.
- Be encouraging.
- Do NOT output JSON. Just natural text.`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating match explanation:', error);
    return "Here are the top matches I found based on your search! (AI explanation unavailable)";
  }
}

/**
 * Parses natural language query into structured filters for hybrid search
 */
export async function parseSearchFilters(query: string) {
  if (!groqApiKey) return null;

  const prompt = `Analyze this search query for a matrimonial app: "${query}"
  
  Extract structured filters if mentioned.
  - religion (e.g., Muslim, Hindu, Christian, etc.)
  - age_min (number)
  - age_max (number)
  - gender (male or female)

  Return ONLY valid JSON with this structure:
  {
    "religion": string | null,
    "age_min": number | null,
    "age_max": number | null,
    "gender": string | null
  }
  
  If a filter is not mentioned, return null for it.`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0,
      })
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error('Error parsing filters:', err);
    return null;
  }
}
