'use client'

import type React from 'react'

import { useState, useRef, useCallback } from 'react'
import {
  Mic,
  Camera,
  Upload,
  Video,
  ImageIcon,
  Wand2,
  Brain,
  Code,
  Zap,
  Square,
} from 'lucide-react'
import { multiModalEngine, type VoiceCommand } from '@/lib/multi-modal-engine'
import VoiceInterface from './voice-interface'

interface MultiModalInterfaceProps {
  onCodeGenerated: (code: string | Record<string, string>) => void
  onVoiceCommand: (command: VoiceCommand) => void
  currentProject?: string
}

export default function MultiModalInterface({
  onCodeGenerated,
  onVoiceCommand,
  currentProject,
}: MultiModalInterfaceProps) {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeMode, setActiveMode] = useState<
    'voice' | 'image' | 'sketch' | 'video' | null
  >(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // File Upload Handling
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      setUploadedFile(file)

      // Create preview URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)

      // Determine file type and set active mode
      if (file.type.startsWith('image/')) {
        setActiveMode('image')
      } else if (file.type.startsWith('video/')) {
        setActiveMode('video')
      }
    },
    []
  )

  // Image to Code Processing
  const processImageToCode = useCallback(async () => {
    if (!uploadedFile || !uploadedFile.type.startsWith('image/')) return

    setIsProcessing(true)
    try {
      const code = await multiModalEngine.imageToCode(uploadedFile, 'react')
      onCodeGenerated(code)
    } catch (error) {
      console.error('Image to code failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [uploadedFile, onCodeGenerated])

  // Sketch to App Processing
  const processSketchToApp = useCallback(async () => {
    if (!uploadedFile || !uploadedFile.type.startsWith('image/')) return

    setIsProcessing(true)
    try {
      const appCode = await multiModalEngine.sketchToApp(uploadedFile, 'web')
      onCodeGenerated(appCode)
    } catch (error) {
      console.error('Sketch to app failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [uploadedFile, onCodeGenerated])

  // Video to App Processing
  const processVideoToApp = useCallback(async () => {
    if (!uploadedFile || !uploadedFile.type.startsWith('video/')) return

    setIsProcessing(true)
    try {
      const appCode = await multiModalEngine.videoToApp(uploadedFile, 'web')
      onCodeGenerated(appCode)
    } catch (error) {
      console.error('Video to app failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [uploadedFile, onCodeGenerated])

  // Camera Capture
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setActiveMode('image')
    } catch (error) {
      console.error('Camera access failed:', error)
    }
  }, [])

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const context = canvas.getContext('2d')

    if (context) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)

      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'capture.png', { type: 'image/png' })
          setUploadedFile(file)
          setPreviewUrl(URL.createObjectURL(file))

          // Stop camera
          const stream = video.srcObject as MediaStream
          stream?.getTracks().forEach((track) => track.stop())
        }
      })
    }
  }, [])

  const clearFile = useCallback(() => {
    setUploadedFile(null)
    setPreviewUrl(null)
    setActiveMode(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  return (
    <div className="bg-gray-900/50 border border-green-500/30 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="w-6 h-6 text-purple-400" />
        <h3 className="text-lg font-semibold text-green-400">
          Multi-Modal AI Interface
        </h3>
        {currentProject && (
          <span className="text-xs text-green-500/70">
            Project: {currentProject}
          </span>
        )}
      </div>

      {/* Input Methods */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Voice Commands */}
        <VoiceInterface
          onVoiceCommand={onVoiceCommand}
          onSpeechResponse={(text) => {
            // Optionally handle speech responses
            console.log('AI Response:', text)
          }}
          className="col-span-full"
        />

        {/* Camera Capture */}
        <button
          onClick={startCamera}
          className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-gray-800/50 border-green-500/30 hover:border-green-400 text-green-400 transition-all"
        >
          <Camera className="w-6 h-6" />
          <span className="text-sm font-semibold">Camera</span>
          <span className="text-xs opacity-70">Capture UI</span>
        </button>

        {/* File Upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-gray-800/50 border-green-500/30 hover:border-green-400 text-green-400 transition-all"
        >
          <Upload className="w-6 h-6" />
          <span className="text-sm font-semibold">Upload</span>
          <span className="text-xs opacity-70">Image/Video</span>
        </button>

        {/* Sketch Mode */}
        <button
          onClick={() => setActiveMode('sketch')}
          className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
            activeMode === 'sketch'
              ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
              : 'bg-gray-800/50 border-green-500/30 hover:border-green-400 text-green-400'
          }`}
        >
          <Wand2 className="w-6 h-6" />
          <span className="text-sm font-semibold">Sketch</span>
          <span className="text-xs opacity-70">Draw wireframes</span>
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Camera Preview */}
      {activeMode === 'image' && !uploadedFile && (
        <div className="mb-6">
          <div className="relative bg-gray-800/50 border border-green-500/30 rounded-lg p-4">
            <video
              ref={videoRef}
              className="w-full max-w-md mx-auto rounded-lg"
              autoPlay
              muted
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex justify-center mt-4">
              <button
                onClick={captureImage}
                className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 px-4 py-2 rounded-lg transition-all"
              >
                <Camera className="w-4 h-4 inline mr-2" />
                Capture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview and Processing */}
      {uploadedFile && previewUrl && (
        <div className="mb-6">
          <div className="bg-gray-800/50 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-green-400">
                {uploadedFile.type.startsWith('image/')
                  ? 'Image Preview'
                  : 'Video Preview'}
              </h4>
              <button
                onClick={clearFile}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <Square className="w-4 h-4" />
              </button>
            </div>

            {uploadedFile.type.startsWith('image/') ? (
              <img
                src={previewUrl || '/placeholder.svg'}
                alt="Preview"
                className="w-full max-w-md mx-auto rounded-lg mb-4"
              />
            ) : (
              <video
                src={previewUrl}
                controls
                className="w-full max-w-md mx-auto rounded-lg mb-4"
              />
            )}

            {/* Processing Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {uploadedFile.type.startsWith('image/') && (
                <>
                  <button
                    onClick={processImageToCode}
                    disabled={isProcessing}
                    className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                  >
                    <Code className="w-4 h-4" />
                    <span>Image to Code</span>
                  </button>

                  <button
                    onClick={processSketchToApp}
                    disabled={isProcessing}
                    className="flex items-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-400 px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                  >
                    <Wand2 className="w-4 h-4" />
                    <span>Sketch to App</span>
                  </button>
                </>
              )}

              {uploadedFile.type.startsWith('video/') && (
                <button
                  onClick={processVideoToApp}
                  disabled={isProcessing}
                  className="flex items-center gap-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                >
                  <Video className="w-4 h-4" />
                  <span>Video to App</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-yellow-400">
            <Zap className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-semibold">Processing with AI...</span>
          </div>
          <p className="text-xs text-yellow-300/70 mt-1">
            Converting your input to code. This may take a moment.
          </p>
        </div>
      )}

      {/* Voice Command Status */}
      {isListening && (
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-400">
            <Mic className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-semibold">
              Listening for voice commands...
            </span>
          </div>
          <p className="text-xs text-purple-300/70 mt-1">
            Try saying: "Make the header bigger", "Add a search button", "Change
            the color to blue"
          </p>
        </div>
      )}

      {/* Quick Examples */}
      <div className="border-t border-green-500/30 pt-4">
        <h4 className="text-sm font-semibold text-green-400 mb-3">
          Quick Examples:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-gray-800/30 rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              <Mic className="w-3 h-3 text-purple-400" />
              <span className="font-semibold text-purple-400">
                Voice Commands
              </span>
            </div>
            <ul className="space-y-1 text-green-300/70">
              <li>"Make the header bigger"</li>
              <li>"Add a search button"</li>
              <li>"Change color to blue"</li>
              <li>"Center the content"</li>
            </ul>
          </div>

          <div className="bg-gray-800/30 rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="w-3 h-3 text-blue-400" />
              <span className="font-semibold text-blue-400">Image/Sketch</span>
            </div>
            <ul className="space-y-1 text-green-300/70">
              <li>Upload UI screenshots</li>
              <li>Draw wireframes</li>
              <li>Capture existing designs</li>
              <li>Sketch app layouts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
