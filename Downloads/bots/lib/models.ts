 export interface AIModel {
  name: string;
  value: string;
  providers: string[];
}

export const models: AIModel[] = [
  {
    name: 'GPT 4o',
    value: 'openai/gpt-4o',
    providers: ['openai']
  },
  {
    name: 'Deepseek R1',
    value: 'deepseek/deepseek-r1',
    providers: ['deepseek']
  },
  {
    name: 'Vercel v0-1.5-md',
    value: 'vercel/v0-1.5-md',
    providers: ['vercel']
  },
  {
    name: 'Google Gemini 3 Flash',
    value: 'google/gemini-3-flash',
    providers: ['google', 'google-vertex']
  },
  {
    name: 'Anthropic Claude Sonnet 4.5',
    value: 'anthropic/claude-sonnet-4.5',
    providers: ['amazon-bedrock', 'anthropic', 'google-vertex']
  },
  {
    name: 'OpenAI GPT-5.2',
    value: 'openai/gpt-5.2',
    providers: ['openai']
  },
  {
    name: 'OpenAI GPT-5.2 Codex',
    value: 'openai/gpt-5.2-codex',
    providers: ['openai']
  },
  {
    name: 'OpenAI GPT-5',
    value: 'openai/gpt-5',
    providers: ['azure', 'openai']
  },
  {
    name: 'xAI Grok Code Fast 1',
    value: 'xai/grok-code-fast-1',
    providers: ['xai']
  },
  {
    name: 'ZAI GLM-4.7',
    value: 'zai/glm-4.7',
    providers: ['cerebras', 'deepinfra', 'nova-ai', 'zai']
  },
  {
    name: 'OpenAI GPT-OSS-120B',
    value: 'openai/gpt-oss-120b',
    providers: ['amazon-bedrock', 'baseten', 'cerebras', 'crusoe', 'fireworks', 'groq', 'nebius', 'parasail']
  },
  {
    name: 'Mistral Devstral 2',
    value: 'mistral/devstral-2',
    providers: ['mistral']
  },
  {
    name: 'DeepSeek v3.2',
    value: 'deepseek/deepseek-v3.2',
    providers: ['deepinfra', 'deepseek', 'novita-ai']
  },
  {
    name: 'xAI Grok 4 Fast Reasoning',
    value: 'xai/grok-4-fast-reasoning',
    providers: ['xai']
  },
  {
    name: 'Meta Llama 4 Scout',
    value: 'meta/llama-4-scout',
    providers: ['amazon-bedrock', 'deepinfra', 'google-vertex', 'groq']
  },
  {
    name: 'Google Imagen 4.0',
    value: 'google/imagen-4.0-generate-001',
    providers: ['google-vertex']
  },
  {
    name: 'Recraft v3',
    value: 'recraft/recraft-v3',
    providers: ['recraft']
  },
  {
    name: 'Google Gemini 2.5 Flash Image',
    value: 'google/gemini-2.5-flash-image',
    providers: ['google', 'google-vertex']
  },
  {
    name: 'BFL Flux Pro 1.1',
    value: 'bfl/flux-pro-1.1',
    providers: ['black-forest-labs']
  },
  {
    name: 'BFL Flux Kontext Pro',
    value: 'bfl/flux-kontext-pro',
    providers: ['black-forest-labs', 'prodia']
  },
];

export default models;
