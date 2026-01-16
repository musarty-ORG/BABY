import type { NextRequest } from 'next/server'
import { multiModalEngine } from '@/lib/multi-modal-engine'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const imageFile = formData.get('image') as File
    const framework = (formData.get('framework') as string) || 'react'

    if (!imageFile) {
      return Response.json({ error: 'image file is required' }, { status: 400 })
    }

    if (!imageFile.type.startsWith('image/')) {
      return Response.json({ error: 'file must be an image' }, { status: 400 })
    }

    // Process image to code
    const code = await multiModalEngine.imageToCode(imageFile, framework)

    return Response.json({
      success: true,
      code,
      framework,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Image to code processing error:', error)
    return Response.json(
      {
        error: 'Image to code processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
