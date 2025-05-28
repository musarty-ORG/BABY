import { Groq } from "groq-sdk"

export interface VoiceOption {
  id: string
  name: string
  description: string
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: "Cheyenne-PlayAI", name: "Cheyenne", description: "Default - Warm and friendly" },
  { id: "Basil-PlayAI", name: "Basil", description: "Professional and clear" },
  { id: "Celeste-PlayAI", name: "Celeste", description: "Energetic and upbeat" },
  { id: "Thunder-PlayAI", name: "Thunder", description: "Deep and powerful" },
]

export class GroqSpeechEngine {
  private groq: Groq
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private isRecording = false

  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      dangerouslyAllowBrowser: true, // Only for client-side usage
    })
  }

  private async validateConnection(): Promise<boolean> {
    try {
      if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY not configured")
      }
      return true
    } catch (error) {
      console.error("Groq connection validation failed:", error)
      return false
    }
  }

  // Speech-to-Text (STT) using GROQ Whisper
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

      // Convert blob to File for GROQ API
      const audioFile = new File([audioBlob], "recording.webm", { type: "audio/webm" })

      const transcription = await this.groq.audio.transcriptions.create({
        file: audioFile,
        model: "distil-whisper-large-v3-en",
        language: "en", // English only as requested
        response_format: "text",
      })

      return transcription as string
    } catch (error) {
      console.error("Transcription failed:", error)
      throw new Error("Failed to transcribe audio")
    }
  }

  // Text-to-Speech (TTS) using GROQ PlayAI
  async synthesizeSpeech(
    text: string,
    voice = "Cheyenne-PlayAI",
    responseFormat: "mp3" | "wav" = "mp3",
  ): Promise<ArrayBuffer> {
    try {
      const isConnected = await this.validateConnection()
      if (!isConnected) {
        throw new Error("Service connection not available")
      }

      const response = await this.groq.audio.speech.create({
        model: "playai-tts",
        voice: voice as any,
        input: text,
        response_format: responseFormat,
      })

      return await response.arrayBuffer()
    } catch (error) {
      console.error("Speech synthesis failed:", error)
      throw new Error("Failed to synthesize speech")
    }
  }

  async speakText(text: string, voice = "Cheyenne-PlayAI"): Promise<void> {
    try {
      const isConnected = await this.validateConnection()
      if (!isConnected) {
        throw new Error("Service connection not available")
      }

      const audioBuffer = await this.synthesizeSpeech(text, voice)
      const audioBlob = new Blob([audioBuffer], { type: "audio/mp3" })
      const audioUrl = URL.createObjectURL(audioBlob)

      const audio = new Audio(audioUrl)

      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          resolve()
        }
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl)
          reject(new Error("Audio playback failed"))
        }
        audio.play()
      })
    } catch (error) {
      console.error("Text-to-speech failed:", error)
      throw error
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
}

export const groqSpeechEngine = new GroqSpeechEngine()
