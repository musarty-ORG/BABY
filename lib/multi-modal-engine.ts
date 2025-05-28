// Browser Speech Recognition API types
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition
    }
    webkitSpeechRecognition: {
      new (): SpeechRecognition
    }
  }
}

import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"

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
  private recognition: SpeechRecognition | null = null
  private isListening = false

  constructor() {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      this.recognition = new (window as any).webkitSpeechRecognition()
      this.setupSpeechRecognition()
    }
  }

  // Voice Command Processing
  private setupSpeechRecognition() {
    if (!this.recognition) return

    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = "en-US"

    this.recognition.onresult = (event) => {
      const results = Array.from(event.results)
      const transcript = results
        .map((result) => result[0].transcript)
        .join("")
        .trim()

      if (event.results[event.results.length - 1].isFinal) {
        this.processVoiceCommand(transcript, event.results[event.results.length - 1][0].confidence)
      }
    }

    this.recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error)
    }
  }

  async startVoiceListening(onCommand: (command: VoiceCommand) => void): Promise<void> {
    if (!this.recognition) {
      throw new Error("Speech recognition not supported in this browser")
    }

    this.isListening = true
    this.recognition.onresult = (event) => {
      const results = Array.from(event.results)
      const transcript = results
        .map((result) => result[0].transcript)
        .join("")
        .trim()

      if (event.results[event.results.length - 1].isFinal) {
        const command = this.parseVoiceCommand(transcript, event.results[event.results.length - 1][0].confidence)
        onCommand(command)
      }
    }

    this.recognition.start()
  }

  stopVoiceListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
      this.isListening = false
    }
  }

  private async processVoiceCommand(transcript: string, confidence: number): Promise<VoiceCommand> {
    const command = this.parseVoiceCommand(transcript, confidence)

    // Enhanced command processing with AI
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

  private async enhanceVoiceCommand(command: VoiceCommand): Promise<VoiceCommand> {
    try {
      const enhancementPrompt = `Analyze this voice command and enhance it with specific technical details:

Command: "${command.transcript}"
Intent: ${command.intent}
Target: ${command.target || "unknown"}
Action: ${command.action || "unknown"}

Provide enhanced parameters and specific implementation details for this command.
Focus on CSS properties, component modifications, or code changes needed.

Return a JSON object with enhanced parameters.`

      const result = await generateText({
        model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
        prompt: enhancementPrompt,
        system:
          "You are a voice command interpreter for a code editor. Convert natural language to specific technical parameters.",
      })

      try {
        const enhanced = JSON.parse(result.text)
        return {
          ...command,
          parameters: { ...command.parameters, ...enhanced },
        }
      } catch {
        return command
      }
    } catch (error) {
      console.error("Voice command enhancement failed:", error)
      return command
    }
  }

  // Image-to-Code Processing
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

      // Parse the analysis result
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

  // Sketch-to-App Processing
  async analyzeSketch(sketchFile: File | string): Promise<SketchAnalysis> {
    try {
      let sketchData: string

      if (typeof sketchFile === "string") {
        sketchData = sketchFile
      } else {
        sketchData = await this.fileToBase64(sketchFile)
      }

      const analysisPrompt = `Analyze this hand-drawn wireframe/sketch and extract app structure:

Sketch: ${sketchData.substring(0, 100)}...

Extract:
1. Individual screens/pages
2. Components on each screen
3. Navigation flow
4. User interactions
5. Suggested features
6. Technical requirements

Focus on understanding the user's intent and app concept.`

      const result = await generateText({
        model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
        prompt: analysisPrompt,
        system: "You are an expert product manager and UX designer. Convert sketches to detailed app specifications.",
      })

      return this.parseSketchAnalysis(result.text)
    } catch (error) {
      console.error("Sketch analysis failed:", error)
      throw new Error("Failed to analyze sketch")
    }
  }

  async sketchToApp(sketchFile: File | string, platform = "web"): Promise<Record<string, string>> {
    const analysis = await this.analyzeSketch(sketchFile)

    const appPrompt = `Convert this wireframe analysis to a complete ${platform} application:

Wireframes: ${JSON.stringify(analysis.wireframes)}
User Flow: ${analysis.userFlow.join(" -> ")}
Features: ${analysis.suggestedFeatures.join(", ")}
Requirements: ${analysis.technicalRequirements.join(", ")}

Generate a complete application with:
- Multiple pages/screens
- Navigation system
- Component structure
- State management
- API integration points
- Database schema (if needed)

Make it production-ready and scalable.`

    const result = await generateText({
      model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      prompt: appPrompt,
      system: `You are a senior full-stack developer. Convert wireframes to complete ${platform} applications.`,
    })

    // Parse the result into multiple files
    return this.parseAppCode(result.text)
  }

  // Video Walkthrough Processing
  async analyzeVideo(videoFile: File): Promise<VideoAnalysis> {
    try {
      // Extract audio for transcription
      const audioData = await this.extractAudioFromVideo(videoFile)
      const transcript = await this.transcribeAudio(audioData)

      // Extract key frames for visual analysis
      const keyFrames = await this.extractKeyFrames(videoFile)

      const analysisPrompt = `Analyze this video walkthrough transcript and extract development requirements:

Transcript: ${transcript}
Key Frames: ${keyFrames.length} frames extracted

Extract:
1. User requirements and stories
2. Feature specifications
3. Technical requirements
4. Step-by-step implementation plan
5. Database/API needs

Focus on converting the explanation into actionable development tasks.`

      const result = await generateText({
        model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
        prompt: analysisPrompt,
        system:
          "You are a senior product manager and technical architect. Convert video explanations to detailed specifications.",
      })

      return this.parseVideoAnalysis(result.text, transcript, keyFrames)
    } catch (error) {
      console.error("Video analysis failed:", error)
      throw new Error("Failed to analyze video")
    }
  }

  async videoToApp(videoFile: File, platform = "web"): Promise<Record<string, string>> {
    const analysis = await this.analyzeVideo(videoFile)

    const appPrompt = `Convert this video walkthrough analysis to a complete ${platform} application:

Requirements: ${analysis.requirements.join(", ")}
User Stories: ${analysis.userStories.join(", ")}
Technical Specs: ${analysis.technicalSpecs.join(", ")}
Transcript Context: ${analysis.transcript.substring(0, 500)}...

Generate a complete application that fulfills all the requirements mentioned in the video.
Include proper architecture, components, and implementation details.`

    const result = await generateText({
      model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      prompt: appPrompt,
      system: `You are a senior full-stack developer. Convert video requirements to complete ${platform} applications.`,
    })

    return this.parseAppCode(result.text)
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

  private parseImageAnalysis(analysisText: string): ImageAnalysis {
    // Parse AI response into structured format
    // This would include more sophisticated parsing logic
    return {
      description: "Modern web interface with clean design",
      components: [],
      layout: "flex",
      colorScheme: ["#ffffff", "#000000", "#3b82f6"],
      typography: ["Inter", "sans-serif"],
      estimatedComplexity: "medium",
    }
  }

  private parseSketchAnalysis(analysisText: string): SketchAnalysis {
    return {
      wireframes: [],
      userFlow: [],
      suggestedFeatures: [],
      technicalRequirements: [],
    }
  }

  private parseVideoAnalysis(analysisText: string, transcript: string, keyFrames: any[]): VideoAnalysis {
    return {
      transcript,
      keyFrames: [],
      requirements: [],
      userStories: [],
      technicalSpecs: [],
    }
  }

  private parseAppCode(codeText: string): Record<string, string> {
    // Parse generated code into multiple files
    const files: Record<string, string> = {}

    // Extract file blocks from the generated code
    const fileBlocks = codeText.match(/```(\w+)?\s*file="([^"]+)"\s*([\s\S]*?)```/g) || []

    fileBlocks.forEach((block) => {
      const match = block.match(/```(\w+)?\s*file="([^"]+)"\s*([\s\S]*?)```/)
      if (match) {
        const [, , filename, content] = match
        files[filename] = content.trim()
      }
    })

    // If no file blocks found, create a default structure
    if (Object.keys(files).length === 0) {
      files["src/App.tsx"] = codeText
    }

    return files
  }

  private async extractAudioFromVideo(videoFile: File): Promise<ArrayBuffer> {
    // Video processing would require additional libraries
    // For now, return empty buffer
    return new ArrayBuffer(0)
  }

  private async transcribeAudio(audioData: ArrayBuffer): Promise<string> {
    // Audio transcription would use speech-to-text service
    // For now, return placeholder
    return "Video transcript placeholder"
  }

  private async extractKeyFrames(videoFile: File): Promise<any[]> {
    // Key frame extraction would require video processing
    // For now, return empty array
    return []
  }
}

export const multiModalEngine = new MultiModalEngine()
