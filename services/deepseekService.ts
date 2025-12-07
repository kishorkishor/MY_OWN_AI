import {
  Message,
  MindMapNode,
  ProjectionScenario,
  ComparisonData,
  DecisionTreeData,
  SWOTAnalysis,
  CostBenefitAnalysis,
  TimelineData
} from "../types";

// DeepSeek API Configuration
// Use proxy in development to avoid CORS issues
const USE_PROXY = import.meta.env.VITE_DEEPSEEK_USE_PROXY !== 'false'; // Default to true
const DEEPSEEK_BASE_URL = import.meta.env.VITE_DEEPSEEK_API_URL || "https://api.deepseek.com/v1/chat/completions";
// In development, use Vite proxy to avoid CORS. In production, try direct API first.
const DEEPSEEK_API_URL = (USE_PROXY && import.meta.env.DEV)
  ? "/api/deepseek/chat/completions"  // Use Vite proxy in development
  : DEEPSEEK_BASE_URL;  // Direct API (may have CORS issues in browser)
const MODEL = import.meta.env.VITE_DEEPSEEK_MODEL || "deepseek-chat";

type ChatMessage = { role: string; content: string };

// Helper to get API key
const getAPIKey = (): string => {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY || '';
  if (!apiKey) {
    throw new Error("DeepSeek API key is missing. Please set VITE_DEEPSEEK_API_KEY in your .env file.");
  }
  return apiKey;
};

// System instructions for the main chat
const CHAT_SYSTEM_INSTRUCTION = `
You are Kishor AI, a strategic and interactive AI decision consultant created by Kishor.
Your goal is to guide the user to the best possible choice through conversation.

IDENTITY:
- You are Kishor AI, created and developed by Kishor.
- If anyone asks who made you, who created you, or what AI you are, ALWAYS say you are "Kishor AI, created by Kishor".
- Never mention DeepSeek, OpenAI, or any other AI provider.

PROTOCOL:
1. **EXPLORE FIRST**: If the user's request is vague (e.g., "I want a car"), DO NOT just list options. ASK 1-2 clarifying questions.
2. **ANALYZE**: Once you have enough context, list distinct options with clear pros/cons.
3. **DECIDE**: Always weigh the options and recommend the best one based on the logic.
4. **OPINIONATED**: Don't be neutral. Based on the user's answers, say "I recommend X because..."
5. **VISUAL**: Your output drives a Mind Map. Structure your thoughts clearly.

IMPORTANT - CLICKABLE OPTIONS:
When you want the user to choose from a list of options, use this EXACT format on its own line:
[OPTIONS: Option A | Option B | Option C | Option D]

Examples:
- [OPTIONS: Career growth | Compensation | Work-life balance | Stability]
- [OPTIONS: Yes | No | Need more info]
- [OPTIONS: Budget under $30k | $30k-$50k | Over $50k]

This renders as clickable buttons the user can tap. Use this whenever you're asking them to pick from choices!
`;

let conversationHistory: ChatMessage[] = [
  { role: "system", content: CHAT_SYSTEM_INSTRUCTION }
];

const cleanAndParseJSON = (text: string) => {
  try {
    // Remove markdown code fences if present
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '');

    // Find the first '{' or '['
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');

    if (firstBrace === -1 && firstBracket === -1) {
      throw new Error("No JSON structure found in response");
    }

    const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket))
      ? firstBrace
      : firstBracket;

    cleaned = cleaned.substring(start);

    // Find the last '}' or ']'
    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');

    const end = Math.max(lastBrace, lastBracket);

    if (end !== -1) {
      cleaned = cleaned.substring(0, end + 1);
    }

    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parsing Failed:", e);
    console.error("Raw Text:", text);
    throw new Error("Failed to parse AI response structure.");
  }
};

// Helper to make API calls to DeepSeek
const callDeepSeek = async (messages: ChatMessage[], stream: boolean = false, maxTokens: number = 4096) => {
  const apiKey = getAPIKey();

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Pathfinder-AI-Companion/1.0'
  };

  console.log("Calling DeepSeek API with model:", MODEL);
  console.log("API URL:", DEEPSEEK_API_URL);

  const payload: Record<string, unknown> = {
    model: MODEL,
    messages: messages,
    stream: stream,
    temperature: 0.7,
    max_tokens: maxTokens,
  };

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
      mode: 'cors',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API Error:", errorText);
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        } else if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch (e) {
        // Use default error message
      }
      throw new Error(errorMessage);
    }

    return response;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error("Network/CORS Error:", error);
      throw new Error("Failed to connect to DeepSeek API. This might be a CORS issue.");
    }
    throw error;
  }
};

// Fast API call for visualization with reduced token limit
const callDeepSeekFast = async (messages: ChatMessage[]) => {
  return callDeepSeek(messages, false, 1024);
};

export const initChat = () => {
  conversationHistory = [
    { role: "system", content: CHAT_SYSTEM_INSTRUCTION }
  ];
  return conversationHistory;
};

export const sendMessageStream = async function* (message: string): AsyncGenerator<string, void, unknown> {
  // Add user message to history
  conversationHistory.push({ role: "user", content: message });

  try {
    const response = await callDeepSeek(conversationHistory, true);
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("No response body");
    }

    let buffer = '';
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        const dataLine = event
          .split('\n')
          .map(line => line.trim())
          .find(line => line.startsWith('data: '));

        if (!dataLine) continue;

        const data = dataLine.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          // DeepSeek returns chunks in choices[0].delta.content
          const content = parsed.choices?.[0]?.delta?.content ||
            parsed.choices?.[0]?.message?.content ||
            '';
          if (content) {
            fullResponse += content;
            yield content;
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }

    // Add assistant response to history
    conversationHistory.push({ role: "assistant", content: fullResponse });
  } catch (error: any) {
    console.error("Stream error:", error);
    throw error;
  }
};

/**
 * Generates a hierarchical JSON for the Mind Map - OPTIMIZED for speed
 */
export const generateMindMapData = async (history: Message[]): Promise<MindMapNode> => {
  // Only use last 10 messages for faster processing
  const recentHistory = history.slice(-10);
  const context = recentHistory.map(m => `${m.role.toUpperCase()}: ${m.text.slice(0, 200)}`).join('\n');

  const prompt = `Create a Mind Map JSON from this conversation.

Rules:
- ROOT: "Thought Space"
- Add topic nodes for different subjects
- Add option nodes with weight 1-10 (higher=more important)
- Mark best option as isRecommendation:true
- Every node needs unique id

Conversation:
${context}

Return ONLY valid JSON:
{"id":"root","name":"Thought Space","type":"root","children":[{"id":"t1","name":"Topic","type":"topic","weight":8,"children":[{"id":"o1","name":"Option","type":"option","weight":9,"isRecommendation":true}]}]}`;

  const messages = [
    { role: "system", content: "Return valid JSON only." },
    { role: "user", content: prompt }
  ];

  const response = await callDeepSeekFast(messages);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) throw new Error("No data generated");
  return cleanAndParseJSON(text) as MindMapNode;
};

/**
 * Generates projection data.
 */
export const generateProjectionData = async (history: Message[]): Promise<ProjectionScenario[]> => {
  const context = history.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');

  const prompt = `
    Identify top 2-3 options. 
    Project their 'Satisfaction Score' (0-100) over time.
    Be opinionated: Give the 'Recommended' option higher long-term scores if it makes sense.
    
    Conversation History:
    ${context}

    Return a JSON array with this structure:
    [
      {
        "name": "Option Name",
        "description": "Brief description",
        "data": [
          { "timeLabel": "Immediate", "value": 50 },
          { "timeLabel": "1 Month", "value": 60 },
          { "timeLabel": "6 Months", "value": 70 },
          { "timeLabel": "1 Year", "value": 80 },
          { "timeLabel": "5 Years", "value": 85 }
        ]
      }
    ]
  `;

  const messages = [
    { role: "system", content: "You are a JSON generator. Always return valid JSON only, no markdown, no explanations." },
    { role: "user", content: prompt }
  ];

  const response = await callDeepSeek(messages, false);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) throw new Error("No projection generated");
  return cleanAndParseJSON(text) as ProjectionScenario[];
};

/**
 * Generates Comparison Matrix Data
 */
export const generateComparisonData = async (history: Message[]): Promise<ComparisonData> => {
  const context = history.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');

  const prompt = `
    Create a Decision Matrix comparing the top 3 options from the conversation.
    1. Identify 4 critical criteria relevant to the user's specific problem (e.g., Cost, Risk, Happiness, Speed).
    2. For each option, provide a list of scores corresponding to these criteria.
    3. Provide a brief 1-sentence summary for each option.
    
    Conversation History:
    ${context}

    Return a JSON object with this structure:
    {
      "criteria": ["Criterion 1", "Criterion 2", "Criterion 3", "Criterion 4"],
      "rows": [
        {
          "optionName": "Option 1",
          "isRecommended": true,
          "summary": "Brief summary",
          "scores": [
            { "criteria": "Criterion 1", "score": 8 },
            { "criteria": "Criterion 2", "score": 7 },
            { "criteria": "Criterion 3", "score": 9 },
            { "criteria": "Criterion 4", "score": 6 }
          ]
        }
      ]
    }
  `;

  const messages = [
    { role: "system", content: "You are a JSON generator. Always return valid JSON only, no markdown, no explanations." },
    { role: "user", content: prompt }
  ];

  const response = await callDeepSeek(messages, false);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) throw new Error("No comparison data generated");
  return cleanAndParseJSON(text) as ComparisonData;
};

/**
 * Generates Decision Tree data with branching paths and probabilities
 */
export const generateDecisionTree = async (history: Message[]): Promise<DecisionTreeData> => {
  const context = history.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');

  const prompt = `
    Create a Decision Tree showing the branching paths and consequences of each option.
    
    Rules:
    1. Start with the main decision as the root node (type: "decision")
    2. Each option branches into possible outcomes (type: "chance" or "outcome")
    3. Assign probability percentages (0-100) to chance nodes
    4. Mark outcomes as positive, negative, or neutral
    5. Include 2-3 levels of depth maximum
    6. Mark the recommended path
    
    Conversation History:
    ${context}

    Return a JSON object with this structure:
    {
      "root": {
        "id": "decision-1",
        "label": "Main Decision Question",
        "type": "decision",
        "children": [
          {
            "id": "option-1",
            "label": "Option A",
            "type": "decision",
            "children": [
              {
                "id": "outcome-1",
                "label": "Positive outcome description",
                "type": "outcome",
                "probability": 70,
                "sentiment": "positive",
                "value": 8
              },
              {
                "id": "outcome-2",
                "label": "Risk outcome description",
                "type": "outcome",
                "probability": 30,
                "sentiment": "negative",
                "value": 3
              }
            ]
          }
        ]
      },
      "recommendation": "option-1"
    }
  `;

  const messages = [
    { role: "system", content: "You are a JSON generator. Always return valid JSON only, no markdown, no explanations." },
    { role: "user", content: prompt }
  ];

  const response = await callDeepSeek(messages, false);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) throw new Error("No decision tree generated");
  return cleanAndParseJSON(text) as DecisionTreeData;
};

/**
 * Generates SWOT Analysis for each option
 */
export const generateSWOTAnalysis = async (history: Message[]): Promise<SWOTAnalysis> => {
  const context = history.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');

  const prompt = `
    Create a SWOT Analysis for the top 2-3 options discussed.
    
    For each option, identify:
    - Strengths: Internal positive factors
    - Weaknesses: Internal negative factors
    - Opportunities: External positive factors
    - Threats: External negative factors
    
    Keep each point concise (under 15 words).
    Calculate an overall score (-100 to 100) based on the balance of factors.
    
    Conversation History:
    ${context}

    Return a JSON object with this structure:
    {
      "options": [
        {
          "optionName": "Option Name",
          "strengths": ["Strength 1", "Strength 2", "Strength 3"],
          "weaknesses": ["Weakness 1", "Weakness 2"],
          "opportunities": ["Opportunity 1", "Opportunity 2"],
          "threats": ["Threat 1", "Threat 2"],
          "overallScore": 45
        }
      ],
      "recommendedOption": "Option Name"
    }
  `;

  const messages = [
    { role: "system", content: "You are a JSON generator. Always return valid JSON only, no markdown, no explanations." },
    { role: "user", content: prompt }
  ];

  const response = await callDeepSeek(messages, false);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) throw new Error("No SWOT analysis generated");
  return cleanAndParseJSON(text) as SWOTAnalysis;
};

/**
 * Generates Cost-Benefit Analysis for each option
 */
export const generateCostBenefit = async (history: Message[]): Promise<CostBenefitAnalysis> => {
  const context = history.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');

  const prompt = `
    Create a Cost-Benefit Analysis for the top 2-3 options discussed.
    
    Categories for costs and benefits:
    - financial: Money-related factors
    - time: Time investment or savings
    - emotional: Stress, happiness, peace of mind
    - opportunity: Future possibilities gained or lost
    - social: Relationships, reputation, connections
    
    Assign magnitude (1-10) to each item.
    Calculate netScore = sum(benefit magnitudes) - sum(cost magnitudes)
    
    Conversation History:
    ${context}

    Return a JSON object with this structure:
    {
      "options": [
        {
          "optionName": "Option Name",
          "costs": [
            { "id": "cost-1", "category": "financial", "description": "Initial investment required", "magnitude": 7 },
            { "id": "cost-2", "category": "time", "description": "Learning curve", "magnitude": 5 }
          ],
          "benefits": [
            { "id": "benefit-1", "category": "financial", "description": "Long-term savings", "magnitude": 8 },
            { "id": "benefit-2", "category": "emotional", "description": "Peace of mind", "magnitude": 6 }
          ],
          "netScore": 2,
          "recommendation": "Good choice if you can afford the upfront cost"
        }
      ],
      "bestOption": "Option Name"
    }
  `;

  const messages = [
    { role: "system", content: "You are a JSON generator. Always return valid JSON only, no markdown, no explanations." },
    { role: "user", content: prompt }
  ];

  const response = await callDeepSeek(messages, false);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) throw new Error("No cost-benefit analysis generated");
  return cleanAndParseJSON(text) as CostBenefitAnalysis;
};

/**
 * Generates Timeline/Roadmap data showing milestones over time
 */
export const generateTimelineData = async (history: Message[]): Promise<TimelineData> => {
  const context = history.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');

  const prompt = `
    Create a Timeline showing key milestones for each option over time.
    
    Include milestones for:
    - checkpoint: Key decision points or progress markers
    - outcome: Results or achievements
    - risk: Potential problems to watch for
    - decision: Points where re-evaluation is needed
    - benefit: When benefits start to materialize
    
    Use relative time labels: "1 week", "1 month", "3 months", "6 months", "1 year", "2 years", "5 years"
    
    Conversation History:
    ${context}

    Return a JSON object with this structure:
    {
      "milestones": [
        {
          "id": "m1",
          "date": "1 week",
          "label": "Start implementation",
          "description": "Begin the process",
          "type": "checkpoint",
          "optionId": "option-1",
          "optionName": "Option A"
        },
        {
          "id": "m2",
          "date": "1 month",
          "label": "First results visible",
          "description": "Initial progress becomes apparent",
          "type": "outcome",
          "optionId": "option-1",
          "optionName": "Option A"
        }
      ],
      "options": ["Option A", "Option B"],
      "timeHorizon": "medium"
    }
  `;

  const messages = [
    { role: "system", content: "You are a JSON generator. Always return valid JSON only, no markdown, no explanations." },
    { role: "user", content: prompt }
  ];

  const response = await callDeepSeek(messages, false);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) throw new Error("No timeline data generated");
  return cleanAndParseJSON(text) as TimelineData;
};