'use client'

import { useState, useCallback, useEffect } from 'react'
import { Mic, MicOff, Volume2, Settings, Play, Square } from 'lucide-react'
import { multiModalEngine, type VoiceCommand } from '@/lib/multi-modal-engine'
import { VOICE_OPTIONS } from '@/lib/groq-speech-engine'

interface VoiceInterfaceProps {
  onVoiceCommand?: (command: VoiceCommand) => void
  onSpeechResponse?: (text: string) => void
  className?: string
}

export default function VoiceInterface({
  onVoiceCommand,
  onSpeechResponse,
  className = '',
}: VoiceInterfaceProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState('Cheyenne-PlayAI')
  const [showSettings, setShowSettings] = useState(false)
  const [lastTranscript, setLastTranscript] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Update engine voice when selection changes
  useEffect(() => {
    multiModalEngine.setVoice(selectedVoice)
  }, [selectedVoice])

  // Start voice recording
  const startRecording = useCallback(async () => {
    try {
      setIsProcessing(true)
      await multiModalEngine.startVoiceListening(async (command) => {
        // This callback is for real-time processing if needed
      })
      setIsRecording(true)
      setIsProcessing(false)
    } catch (error) {
      console.error('Failed to start recording:', error)
      setIsProcessing(false)
      alert('Microphone access denied or not available')
    }
  }, [])

  // Stop voice recording and process
  const stopRecording = useCallback(async () => {
    try {
      setIsProcessing(true)
      const command = await multiModalEngine.stopVoiceListening()
      setIsRecording(false)

      if (command) {
        setLastTranscript(command.transcript)
        onVoiceCommand?.(command)

        // Optionally speak back a confirmation
        if (onSpeechResponse) {
          const response = `I heard: ${command.transcript}. Processing your ${command.intent} command.`
          onSpeechResponse(response)
        }
      }
      setIsProcessing(false)
    } catch (error) {
      console.error('Failed to stop recording:', error)
      setIsRecording(false)
      setIsProcessing(false)
    }
  }, [onVoiceCommand, onSpeechResponse])

  // Cancel recording
  const cancelRecording = useCallback(() => {
    multiModalEngine.cancelVoiceListening()
    setIsRecording(false)
    setIsProcessing(false)
  }, [])

  // Speak text using TTS
  const speakText = useCallback(
    async (text: string) => {
      try {
        setIsSpeaking(true)
        await multiModalEngine.speakText(text, selectedVoice)
        setIsSpeaking(false)
      } catch (error) {
        console.error('Failed to speak text:', error)
        setIsSpeaking(false)
      }
    },
    [selectedVoice]
  )

  // Test voice with sample text
  const testVoice = useCallback(async () => {
    const sampleText = `Hello! I'm ${VOICE_OPTIONS.find((v) => v.id === selectedVoice)?.name}. I'm ready to help you with voice commands!`
    await speakText(sampleText)
  }, [selectedVoice, speakText])

  return (
    <div
      className={`bg-gray-900/50 border border-purple-500/30 rounded-lg p-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-purple-400">
            Voice Interface
          </h3>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-purple-400 hover:text-purple-300 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Voice Settings */}
      {showSettings && (
        <div className="mb-4 p-3 bg-gray-800/50 border border-purple-500/20 rounded-lg">
          <h4 className="text-sm font-semibold text-purple-400 mb-3">
            Voice Settings
          </h4>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-purple-300/70 mb-2">
                Select Voice
              </label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full bg-gray-800 border border-purple-500/30 rounded px-3 py-2 text-purple-300 text-sm focus:border-purple-400 focus:outline-none"
              >
                {VOICE_OPTIONS.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} - {voice.description}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={testVoice}
              disabled={isSpeaking}
              className="flex items-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-400 px-3 py-2 rounded text-sm transition-all disabled:opacity-50"
            >
              <Play className="w-3 h-3" />
              Test Voice
            </button>
          </div>
        </div>
      )}

      {/* Recording Controls */}
      <div className="flex items-center gap-3 mb-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isProcessing || isSpeaking}
            className="flex items-center gap-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 px-4 py-2 rounded-lg transition-all disabled:opacity-50"
          >
            <Mic className="w-4 h-4" />
            Start Recording
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={stopRecording}
              disabled={isProcessing}
              className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 px-4 py-2 rounded-lg transition-all disabled:opacity-50"
            >
              <Square className="w-4 h-4" />
              Stop & Process
            </button>
            <button
              onClick={cancelRecording}
              className="flex items-center gap-2 bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/40 text-gray-400 px-3 py-2 rounded-lg transition-all"
            >
              <MicOff className="w-4 h-4" />
              Cancel
            </button>
          </div>
        )}

        {/* Speaking indicator */}
        {isSpeaking && (
          <div className="flex items-center gap-2 text-blue-400">
            <Volume2 className="w-4 h-4 animate-pulse" />
            <span className="text-sm">Speaking...</span>
          </div>
        )}
      </div>

      {/* Status Display */}
      <div className="space-y-2">
        {isRecording && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-400">
              <Mic className="w-4 h-4 animate-pulse" />
              <span className="text-sm font-semibold">
                Recording... Speak your command
              </span>
            </div>
            <p className="text-xs text-red-300/70 mt-1">
              Say things like: "Make the header bigger", "Add a search button",
              "Change color to blue"
            </p>
          </div>
        )}

        {isProcessing && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-400">
              <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-semibold">Processing audio...</span>
            </div>
          </div>
        )}

        {lastTranscript && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
            <div className="text-green-400 text-sm font-semibold mb-1">
              Last Command:
            </div>
            <div className="text-green-300/80 text-sm">"{lastTranscript}"</div>
          </div>
        )}
      </div>

      {/* Quick Commands Help */}
      <div className="mt-4 pt-3 border-t border-purple-500/30">
        <h4 className="text-xs font-semibold text-purple-400 mb-2">
          Quick Commands:
        </h4>
        <div className="grid grid-cols-1 gap-1 text-xs text-purple-300/70">
          <div>"Make the header bigger"</div>
          <div>"Add a search button"</div>
          <div>"Change the color to blue"</div>
          <div>"Center the content"</div>
          <div>"Create a new component"</div>
        </div>
      </div>
    </div>
  )
}
