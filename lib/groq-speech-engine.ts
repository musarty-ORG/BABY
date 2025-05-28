export interface VoiceOption {
  id: string
  name: string
  description: string
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: "Cheyenne-PlayAI", name: "Cheyenne", description: "Warm & friendly (default)" },
  { id: "Basil-PlayAI", name: "Basil", description: "Professional & clear" },
  { id: "Celeste-PlayAI", name: "Celeste", description: "Energetic & upbeat" },
  { id: "Thunder-PlayAI", name: "Thunder", description: "Deep & powerful" },
]

export class GroqSpeechEngine {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private isRecording = false

  // Start recording audio
  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.mediaRecorder = new MediaRecorder(stream)
      this.audioChunks = []

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.start()
      this.isRecording = true
    } catch (error) {
      console.error("Failed to start recording:", error)
      throw error
    }
  }

  // Stop recording and transcribe
  async stopRecording(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error("Not currently recording"))
        return
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(this.audioChunks, { type: "audio/wav" })
          const transcript = await this.transcribeAudio(audioBlob)
          this.isRecording = false
          resolve(transcript)
        } catch (error) {
          reject(error)
        }
      }

      this.mediaRecorder.stop()
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop())
    })
  }

  // Cancel recording
  cancelRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop()
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop())
      this.isRecording = false
      this.audioChunks = []
    }
  }

  // Check if currently recording
  isCurrentlyRecording(): boolean {
    return this.isRecording
  }

  // Transcribe audio using GROQ STT
  private async transcribeAudio(audioBlob: Blob): Promise<string> {
    const formData = new FormData()
    formData.append("audio", audioBlob, "recording.wav")

    const response = await fetch("/api/speech/transcribe", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Transcription failed")
    }

    const result = await response.json()
    return result.transcript || ""
  }

  // Speak text using GROQ TTS
  async speakText(text: string, voice = "Cheyenne-PlayAI"): Promise<void> {
    try {
      const audioBuffer = await this.synthesizeSpeech(text, voice)
      await this.playAudio(audioBuffer)
    } catch (error) {
      console.error("Failed to speak text:", error)
      throw error
    }
  }

  // Synthesize speech using GROQ TTS
  async synthesizeSpeech(text: string, voice = "Cheyenne-PlayAI"): Promise<ArrayBuffer> {
    const response = await fetch("/api/speech/synthesize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice,
        model: "playai-tts",
        response_format: "wav",
      }),
    })

    if (!response.ok) {
      throw new Error("Speech synthesis failed")
    }

    return response.arrayBuffer()
  }

  // Play audio from buffer
  private async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const audioBufferSource = audioContext.createBufferSource()

    try {
      const decodedAudio = await audioContext.decodeAudioData(audioBuffer)
      audioBufferSource.buffer = decodedAudio
      audioBufferSource.connect(audioContext.destination)
      audioBufferSource.start()

      return new Promise((resolve) => {
        audioBufferSource.onended = () => resolve()
      })
    } catch (error) {
      console.error("Failed to play audio:", error)
      throw error
    }
  }
}

export const groqSpeechEngine = new GroqSpeechEngine()
