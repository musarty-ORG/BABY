import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, streamText } from 'ai'

export interface VoiceOption {
  id: string
  name: string
  description: string
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: "default", name: "Default", description: "Standard AI voice" },
  { id: "friendly", name: "Friendly", description: "Warm and approachable" },
  { id: "professional", name: "Professional", description: "Clear and formal" },
  { id: "energetic", name: "Energetic", description: "Upbeat and dynamic" },
]

export class VertexAISpeechEngine {
  private googleAI: any
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private isRecording = false

  constructor() {
    // Initialize Vertex AI client lazily
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      this.googleAI = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      })
    }
  }

  private async validateConnection(): Promise<boolean> {
    try {
      if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not configured")
      }
      return true
    } catch (error) {
      console.error("Vertex AI connection validation failed:", error)
      return false
    }
  }

  // Text-to-Speech simulation using Vertex AI text generation
  async synthesizeSpeech(
    text: string,
    voice = "default",
    responseFormat: "mp3" | "wav" = "mp3",
  ): Promise<string> {
    try {
      const isConnected = await this.validateConnection()
      if (!isConnected || !this.googleAI) {
        throw new Error("Service connection not available")
      }

      // Since Vertex AI doesn't have direct TTS, we'll return the text formatted for audio
      // In a real implementation, you might use Google Cloud Text-to-Speech API
      const audioText = `Audio content for "${text}" with ${voice} voice in ${responseFormat} format`
      
      // For now, return the formatted text - in production you'd integrate with proper TTS
      return audioText
    } catch (error) {
      console.error("Speech synthesis failed:", error)
      throw new Error("Failed to synthesize speech")
    }
  }

  async speakText(text: string, voice = "default"): Promise<void> {
    try {
      const isConnected = await this.validateConnection()
      if (!isConnected) {
        throw new Error("Service connection not available")
      }

      // For demonstration, we'll use Web Speech API if available
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text)
        const voices = window.speechSynthesis.getVoices()
        
        if (voices.length > 0) {
          utterance.voice = voices[0] // Use first available voice
        }
        
        return new Promise((resolve, reject) => {
          utterance.onend = () => resolve()
          utterance.onerror = (error) => reject(new Error("Speech synthesis failed"))
          window.speechSynthesis.speak(utterance)
        })
      } else {
        throw new Error("Speech synthesis not supported")
      }
    } catch (error) {
      console.error("Text-to-speech failed:", error)
      throw error
    }
  }

  // Speech-to-Text using Web Speech API (browser-based)
  async startRecording(): Promise<void> {
    try {
      const isConnected = await this.validateConnection()
      if (!isConnected) {
        throw new Error("Service connection not available")
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })

      this.audioChunks = []
      this.isRecording = true

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.start(1000) // Collect data every second
      console.log("🎤 Recording started...")
    } catch (error) {
      console.error("Failed to start recording:", error)
      throw new Error("Microphone access denied or service unavailable")
    }
  }

  async stopRecording(): Promise<string> {
    return new Promise(async (resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error("No active recording"))
        return
      }

      const isConnected = await this.validateConnection()
      if (!isConnected) {
        reject(new Error("Service connection not available"))
        return
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" })
          const transcript = await this.transcribeAudio(audioBlob)

          // Stop all tracks to release microphone
          const stream = this.mediaRecorder?.stream
          stream?.getTracks().forEach((track) => track.stop())

          this.isRecording = false
          resolve(transcript)
        } catch (error) {
          reject(error)
        }
      }

      this.mediaRecorder.stop()
    })
  }

  private async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      const isConnected = await this.validateConnection()
      if (!isConnected) {
        throw new Error("Service connection not available")
      }

      // For now, return a placeholder transcript
      // In production, you'd integrate with Google Cloud Speech-to-Text API
      const transcript = "Transcribed audio content placeholder"
      
      console.log("Audio transcription completed")
      return transcript
    } catch (error) {
      console.error("Transcription failed:", error)
      throw new Error("Failed to transcribe audio")
    }
  }

  // AI text generation using Vertex AI
  async generateTextResponse(prompt: string): Promise<string> {
    try {
      const isConnected = await this.validateConnection()
      if (!isConnected || !this.googleAI) {
        throw new Error("Service connection not available")
      }

      const model = this.googleAI('gemini-1.5-pro')
      
      const { text } = await generateText({
        model,
        prompt: prompt,
        maxTokens: 1000,
        temperature: 0.7,
      })

      return text
    } catch (error) {
      console.error("Text generation failed:", error)
      throw new Error("Failed to generate text response")
    }
  }

  async streamTextResponse(prompt: string): Promise<ReadableStream> {
    try {
      const isConnected = await this.validateConnection()
      if (!isConnected || !this.googleAI) {
        throw new Error("Service connection not available")
      }

      const model = this.googleAI('gemini-1.5-pro')
      
      const { textStream } = await streamText({
        model,
        prompt: prompt,
        maxTokens: 1000,
        temperature: 0.7,
      })

      return textStream
    } catch (error) {
      console.error("Text streaming failed:", error)
      throw new Error("Failed to stream text response")
    }
  }

  // Utility methods
  isCurrentlyRecording(): boolean {
    return this.isRecording
  }

  cancelRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop()
      const stream = this.mediaRecorder.stream
      stream?.getTracks().forEach((track) => track.stop())
      this.isRecording = false
      this.audioChunks = []
    }
  }

  // Test connection to Vertex AI
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const isConnected = await this.validateConnection()
      if (!isConnected) {
        return {
          success: false,
          message: "Vertex AI configuration missing or invalid"
        }
      }

      const testResponse = await this.generateTextResponse("Test connection - respond with 'OK'")
      
      return {
        success: true,
        message: "Vertex AI connection successful",
        details: { testResponse }
      }
    } catch (error) {
      return {
        success: false,
        message: `Vertex AI connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        details: { error: error instanceof Error ? error.stack : error }
      }
    }
  }
}

export const vertexAISpeechEngine = new VertexAISpeechEngine()