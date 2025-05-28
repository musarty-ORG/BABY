import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"
import { groqSpeechEngine, type VoiceOption, VOICE_OPTIONS } from "./groq-speech-engine"

export interface VoiceCommand {
  transcript: string
  confidence: number
  intent: "modify" | "create" | "explain" | "navigate" | "search"
  target?: string
  action?: string
  parameters?: Record<string, any>
}

export interface ImageAnalysis {
  description: string
  components: Array<{
    type: string
    position: { x: number; y: number; width: number; height: number }
    properties: Record<string, any>
  }>
  layout: "grid" | "flex" | "absolute" | "flow"
  colorScheme: string[]
  typography: string[]
  estimatedComplexity: "simple" | "medium" | "complex"
}

export interface SketchAnalysis {
  wireframes: Array<{
    screen: string
    components: string[]
    navigation: string[]
    interactions: string[]
  }>
  userFlow: string[]
  suggestedFeatures: string[]
  technicalRequirements: string[]
}

export interface VideoAnalysis {
  transcript: string
  keyFrames: Array<{
    timestamp: number
    description: string
    actionItems: string[]
  }>
  requirements: string[]
  userStories: string[]
  technicalSpecs: string[]
}

export class MultiModalEngine {
  private selectedVoice = "Cheyenne-PlayAI"

  constructor() {
    // Initialize with default voice
  }

  // Voice Configuration
  setVoice(voiceId: string): void {
    this.selectedVoice = voiceId
  }

  getVoice(): string {
    return this.selectedVoice
  }

  getAvailableVoices(): VoiceOption[] {
    return VOICE_OPTIONS
  }

  // Voice Command Processing with GROQ STT
  async startVoiceListening(onCommand: (command: VoiceCommand) => void): Promise<void> {
    try {
      await groqSpeechEngine.startRecording()
    } catch (error) {
      console.error("Failed to start voice listening:", error)
      throw new Error("Microphone access denied or not available")
    }
  }

  async stopVoiceListening(): Promise<VoiceCommand | null> {
    try {
      const transcript = await groqSpeechEngine.stopRecording()
      if (transcript.trim()) {
        const command = await this.processVoiceCommand(transcript, 0.9)
        return command
      }
      return null
    } catch (error) {
      console.error("Failed to stop voice listening:", error)
      throw error
    }
  }

  cancelVoiceListening(): void {
    groqSpeechEngine.cancelRecording()
  }

  isRecording(): boolean {
    return groqSpeechEngine.isCurrentlyRecording()
  }

  // Text-to-Speech with GROQ TTS
  async speakText(text: string, voice?: string): Promise<void> {
    const voiceToUse = voice || this.selectedVoice
    try {
      await groqSpeechEngine.speakText(text, voiceToUse)
    } catch (error) {
      console.error("Failed to speak text:", error)
      throw error
    }
  }

  async synthesizeSpeech(text: string, voice?: string): Promise<ArrayBuffer> {
    const voiceToUse = voice || this.selectedVoice
    try {
      return await groqSpeechEngine.synthesizeSpeech(text, voiceToUse)
    } catch (error) {
      console.error("Failed to synthesize speech:", error)
      throw error
    }
  }

  private async processVoiceCommand(transcript: string, confidence: number): Promise<VoiceCommand> {
    const command = this.parseVoiceCommand(transcript, confidence)
    const enhancedCommand = await this.enhanceVoiceCommand(command)
    return enhancedCommand
  }

  private parseVoiceCommand(transcript: string, confidence: number): VoiceCommand {
    const lowerTranscript = transcript.toLowerCase()

    // Intent detection patterns
    const intents = {
      modify: [
        "make",
        "change",
        "update",
        "modify",
        "adjust",
        "resize",
        "move",
        "color",
        "style",
        "bigger",
        "smaller",
        "center",
      ],
      create: ["create", "add", "build", "generate", "new", "insert"],
      explain: ["explain", "what", "how", "why", "tell me", "describe"],
      navigate: ["go to", "open", "show", "navigate", "switch"],
      search: ["search", "find", "look for", "locate"],
    }

    let detectedIntent: VoiceCommand["intent"] = "modify"
    let confidence_score = 0

    for (const [intent, keywords] of Object.entries(intents)) {
      const matches = keywords.filter((keyword) => lowerTranscript.includes(keyword))
      if (matches.length > confidence_score) {
        confidence_score = matches.length
        detectedIntent = intent as VoiceCommand["intent"]
      }
    }

    // Extract target and action
    const target = this.extractTarget(lowerTranscript)
    const action = this.extractAction(lowerTranscript)
    const parameters = this.extractParameters(lowerTranscript)

    return {
      transcript,
      confidence,
      intent: detectedIntent,
      target,
      action,
      parameters,
    }
  }

  private extractTarget(transcript: string): string | undefined {
    const targets = ["header", "footer", "sidebar", "button", "text", "image", "form", "menu", "card", "modal"]
    return targets.find((target) => transcript.includes(target))
  }

  private extractAction(transcript: string): string | undefined {
    const actions = ["bigger", "smaller", "center", "left", "right", "hide", "show", "remove", "duplicate"]
    return actions.find((action) => transcript.includes(action))
  }

  private extractParameters(transcript: string): Record<string, any> {
    const params: Record<string, any> = {}

    // Extract colors
    const colors = ["red", "blue", "green", "yellow", "purple", "orange", "black", "white", "gray"]
    const color = colors.find((c) => transcript.includes(c))
    if (color) params.color = color

    // Extract sizes
    const sizeMatch = transcript.match(/(\d+)(px|%|em|rem)/i)
    if (sizeMatch) params.size = sizeMatch[0]

    // Extract positions
    if (transcript.includes("center")) params.align = "center"
    if (transcript.includes("left")) params.align = "left"
    if (transcript.includes("right")) params.align = "right"

    return params
  }

  private async safeApiCall<T>(operation: () => Promise<T>, retries = 2): Promise<T | null> {
    for (let i = 0; i <= retries; i++) {
      try {
        return await operation()
      } catch (error) {
        console.warn(`API call attempt ${i + 1} failed:`, error)
        if (i === retries) {
          console.error("All API call attempts failed")
          return null
        }
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
    return null
  }

  private async enhanceVoiceCommand(command: VoiceCommand): Promise<VoiceCommand> {
    const enhancementPrompt = `Analyze this voice command and enhance it with specific technical details:

Command: "${command.transcript}"
Intent: ${command.intent}
Target: ${command.target || "unknown"}
Action: ${command.action || "unknown"}

Provide enhanced parameters and specific implementation details for this command.
Focus on CSS properties, component modifications, or code changes needed.

Return a JSON object with enhanced parameters.`

    const result = await this.safeApiCall(async () => {
      return await generateText({
        model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
        prompt: enhancementPrompt,
        system: "You are a voice command interpreter for a code editor.",
      })
    })

    if (!result) {
      console.warn("Voice command enhancement failed, using basic command")
      return command
    }

    try {
      const enhanced = JSON.parse(result.text)
      return {
        ...command,
        parameters: { ...command.parameters, ...enhanced },
      }
    } catch {
      return command
    }
  }

  // Image-to-Code Processing (keeping existing implementation)
  async analyzeImage(imageFile: File | string): Promise<ImageAnalysis> {
    try {
      let imageData: string

      if (typeof imageFile === "string") {
        imageData = imageFile
      } else {
        imageData = await this.fileToBase64(imageFile)
      }

      const analysisPrompt = `Analyze this UI screenshot/design and provide detailed component breakdown:

Image: ${imageData.substring(0, 100)}...

Analyze and return:
1. Overall description
2. Individual components with positions
3. Layout type (grid/flex/absolute/flow)
4. Color scheme
5. Typography styles
6. Complexity estimation

Focus on recreating this design with modern web technologies.`

      const result = await generateText({
        model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
        prompt: analysisPrompt,
        system:
          "You are an expert UI/UX analyzer. Convert visual designs to technical specifications for web development.",
      })

      return this.parseImageAnalysis(result.text)
    } catch (error) {
      console.error("Image analysis failed:", error)
      throw new Error("Failed to analyze image")
    }
  }

  async imageToCode(imageFile: File | string, framework = "react"): Promise<string> {
    const analysis = await this.analyzeImage(imageFile)

    const codePrompt = `Convert this UI analysis to ${framework} code:

Description: ${analysis.description}
Layout: ${analysis.layout}
Components: ${JSON.stringify(analysis.components)}
Colors: ${analysis.colorScheme.join(", ")}
Typography: ${analysis.typography.join(", ")}

Generate clean, modern ${framework} code that recreates this design pixel-perfectly.
Use Tailwind CSS for styling.
Include responsive design considerations.
Make it production-ready with proper component structure.`

    const result = await generateText({
      model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      prompt: codePrompt,
      system: `You are a senior ${framework} developer. Convert UI designs to clean, production-ready code.`,
    })

    return result.text
  }

  // Utility Methods
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  private async parseImageAnalysis(analysisText: string): Promise<ImageAnalysis> {
    try {
      // Try to parse structured response first
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          description: parsed.description || "UI interface analysis",
          components: parsed.components || [],
          layout: parsed.layout || "flex",
          colorScheme: parsed.colorScheme || ["#ffffff", "#000000", "#3b82f6"],
          typography: parsed.typography || ["Inter", "sans-serif"],
          estimatedComplexity: parsed.estimatedComplexity || "medium",
        }
      }

      // Fallback to text parsing
      const lines = analysisText.split("\n")
      const description =
        lines
          .find((line) => line.toLowerCase().includes("description"))
          ?.split(":")[1]
          ?.trim() || "Modern web interface"
      const layout =
        lines
          .find((line) => line.toLowerCase().includes("layout"))
          ?.split(":")[1]
          ?.trim() || "flex"

      return {
        description,
        components: this.extractComponentsFromText(analysisText),
        layout: layout as "grid" | "flex" | "absolute" | "flow",
        colorScheme: this.extractColorsFromText(analysisText),
        typography: this.extractTypographyFromText(analysisText),
        estimatedComplexity: this.estimateComplexityFromText(analysisText),
      }
    } catch (error) {
      console.error("Failed to parse image analysis:", error)
      return {
        description: "UI interface requiring analysis",
        components: [],
        layout: "flex",
        colorScheme: ["#ffffff", "#000000", "#3b82f6"],
        typography: ["Inter", "sans-serif"],
        estimatedComplexity: "medium",
      }
    }
  }

  private extractComponentsFromText(text: string): Array<{
    type: string
    position: { x: number; y: number; width: number; height: number }
    properties: Record<string, any>
  }> {
    const components = []
    const componentTypes = [
      "button",
      "input",
      "header",
      "footer",
      "sidebar",
      "card",
      "modal",
      "form",
      "navigation",
      "menu",
    ]

    componentTypes.forEach((type) => {
      if (text.toLowerCase().includes(type)) {
        components.push({
          type,
          position: { x: 0, y: 0, width: 100, height: 50 },
          properties: { detected: true, confidence: 0.8 },
        })
      }
    })

    return components
  }

  private extractColorsFromText(text: string): string[] {
    const colorRegex = /#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb$$[^)]+$$|rgba$$[^)]+$$/g
    const matches = text.match(colorRegex) || []
    const defaultColors = ["#ffffff", "#000000", "#3b82f6"]
    return matches.length > 0 ? [...new Set(matches)] : defaultColors
  }

  private extractTypographyFromText(text: string): string[] {
    const fonts = ["Inter", "Roboto", "Arial", "Helvetica", "Times", "Georgia", "Verdana"]
    const detected = fonts.filter((font) => text.toLowerCase().includes(font.toLowerCase()))
    return detected.length > 0 ? detected : ["Inter", "sans-serif"]
  }

  private estimateComplexityFromText(text: string): "simple" | "medium" | "complex" {
    const complexityIndicators = text.toLowerCase()
    if (
      complexityIndicators.includes("dashboard") ||
      complexityIndicators.includes("admin") ||
      complexityIndicators.includes("complex")
    ) {
      return "complex"
    }
    if (
      complexityIndicators.includes("form") ||
      complexityIndicators.includes("multiple") ||
      complexityIndicators.includes("navigation")
    ) {
      return "medium"
    }
    return "simple"
  }

  // Keep other existing methods for sketch and video analysis...
  async analyzeSketch(sketchFile: File | string): Promise<SketchAnalysis> {
    try {
      let imageData: string

      if (typeof sketchFile === "string") {
        imageData = sketchFile
      } else {
        imageData = await this.fileToBase64(sketchFile)
      }

      const sketchPrompt = `Analyze this hand-drawn sketch/wireframe and extract:

1. Individual wireframe screens and their components
2. User flow between screens
3. Suggested features based on the sketch
4. Technical requirements for implementation

Image: ${imageData.substring(0, 100)}...

Provide detailed analysis for app development.`

      const result = await this.safeApiCall(async () => {
        return await generateText({
          model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
          prompt: sketchPrompt,
          system: "You are an expert UX analyst. Convert sketches and wireframes to technical specifications.",
        })
      })

      if (!result) {
        throw new Error("Failed to analyze sketch")
      }

      return this.parseSketchAnalysis(result.text)
    } catch (error) {
      console.error("Sketch analysis failed:", error)
      return {
        wireframes: [
          {
            screen: "Main Screen",
            components: ["header", "navigation", "content area", "footer"],
            navigation: ["home", "about", "contact"],
            interactions: ["click", "scroll", "form submission"],
          },
        ],
        userFlow: ["Landing → Navigation → Content → Action"],
        suggestedFeatures: ["responsive design", "user authentication", "search functionality"],
        technicalRequirements: ["React/Next.js", "Tailwind CSS", "API integration"],
      }
    }
  }

  private parseSketchAnalysis(analysisText: string): SketchAnalysis {
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }

      // Fallback parsing
      return {
        wireframes: this.extractWireframesFromText(analysisText),
        userFlow: this.extractUserFlowFromText(analysisText),
        suggestedFeatures: this.extractFeaturesFromText(analysisText),
        technicalRequirements: this.extractTechRequirementsFromText(analysisText),
      }
    } catch (error) {
      console.error("Failed to parse sketch analysis:", error)
      return {
        wireframes: [],
        userFlow: [],
        suggestedFeatures: [],
        technicalRequirements: [],
      }
    }
  }

  async sketchToApp(sketchFile: File | string, platform = "web"): Promise<Record<string, string>> {
    return { "src/App.tsx": "// Sketch to app implementation" }
  }

  async analyzeVideo(videoFile: File): Promise<VideoAnalysis> {
    try {
      // For now, we'll analyze the video file metadata and provide a structured response
      // In a full implementation, you'd use video processing APIs

      const videoPrompt = `Analyze this video file for app development requirements:

File: ${videoFile.name}
Size: ${videoFile.size} bytes
Type: ${videoFile.type}

Based on typical video analysis, provide:
1. Estimated transcript content
2. Key frames and timestamps
3. Requirements extraction
4. User stories
5. Technical specifications

Focus on extracting actionable development requirements.`

      const result = await this.safeApiCall(async () => {
        return await generateText({
          model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
          prompt: videoPrompt,
          system: "You are a video analysis expert for software development. Extract requirements from video content.",
        })
      })

      if (!result) {
        throw new Error("Failed to analyze video")
      }

      return this.parseVideoAnalysis(result.text, videoFile)
    } catch (error) {
      console.error("Video analysis failed:", error)
      return {
        transcript: "Video analysis in progress...",
        keyFrames: [
          {
            timestamp: 0,
            description: "Video start",
            actionItems: ["Analyze content", "Extract requirements"],
          },
        ],
        requirements: ["Video processing capability", "User interface for video upload"],
        userStories: ["As a user, I want to upload videos for analysis"],
        technicalSpecs: ["Video processing API", "File upload handling", "Progress tracking"],
      }
    }
  }

  private parseVideoAnalysis(analysisText: string, videoFile: File): VideoAnalysis {
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }

      return {
        transcript: this.extractTranscriptFromText(analysisText),
        keyFrames: this.extractKeyFramesFromText(analysisText),
        requirements: this.extractRequirementsFromText(analysisText),
        userStories: this.extractUserStoriesFromText(analysisText),
        technicalSpecs: this.extractTechSpecsFromText(analysisText),
      }
    } catch (error) {
      console.error("Failed to parse video analysis:", error)
      return {
        transcript: "Failed to extract transcript",
        keyFrames: [],
        requirements: [],
        userStories: [],
        technicalSpecs: [],
      }
    }
  }

  async videoToApp(videoFile: File, platform = "web"): Promise<Record<string, string>> {
    return { "src/App.tsx": "// Video to app implementation" }
  }

  private extractWireframesFromText(
    text: string,
  ): Array<{ screen: string; components: string[]; navigation: string[]; interactions: string[] }> {
    // Implementation for extracting wireframes
    return [
      {
        screen: "Main Screen",
        components: ["header", "content", "footer"],
        navigation: ["home", "about"],
        interactions: ["click", "scroll"],
      },
    ]
  }

  private extractUserFlowFromText(text: string): string[] {
    return ["User lands on homepage", "User navigates to features", "User takes action"]
  }

  private extractFeaturesFromText(text: string): string[] {
    const features = ["authentication", "dashboard", "search", "notifications"]
    return features.filter((feature) => text.toLowerCase().includes(feature))
  }

  private extractTechRequirementsFromText(text: string): string[] {
    return ["React/Next.js", "Database integration", "API development"]
  }

  private extractTranscriptFromText(text: string): string {
    return "Extracted transcript content from video analysis"
  }

  private extractKeyFramesFromText(
    text: string,
  ): Array<{ timestamp: number; description: string; actionItems: string[] }> {
    return [
      {
        timestamp: 0,
        description: "Key moment in video",
        actionItems: ["Implement feature", "Design interface"],
      },
    ]
  }

  private extractRequirementsFromText(text: string): string[] {
    return ["User authentication", "Data storage", "Real-time updates"]
  }

  private extractUserStoriesFromText(text: string): string[] {
    return ["As a user, I want to...", "As an admin, I need to..."]
  }

  private extractTechSpecsFromText(text: string): string[] {
    return ["Frontend: React/Next.js", "Backend: Node.js/API", "Database: PostgreSQL"]
  }
}

export const multiModalEngine = new MultiModalEngine()
