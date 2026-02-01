"use client"
import React, { useEffect, useRef, useState, useCallback } from 'react'

interface PerformanceMetrics {
  fps: number
  inputLatency: number
  frameTime: number
  droppedFrames: number
}

interface PerformanceMonitorProps {
  enabled?: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export function PerformanceMonitor({
  enabled = true,
  position = 'bottom-right'
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    inputLatency: 0,
    frameTime: 0,
    droppedFrames: 0
  })
  const [isDrawing, setIsDrawing] = useState(false)
  const [baseline, setBaseline] = useState<PerformanceMetrics | null>(null)

  const frameCountRef = useRef(0)
  const lastFrameTimeRef = useRef(performance.now())
  const lastInputTimeRef = useRef(0)
  const latencySamplesRef = useRef<number[]>([])
  const frameTimesRef = useRef<number[]>([])
  const rafIdRef = useRef<number>()
  const droppedFramesRef = useRef(0)

  // FPS and frame time measurement
  const measureFrame = useCallback((timestamp: number) => {
    const delta = timestamp - lastFrameTimeRef.current
    lastFrameTimeRef.current = timestamp
    frameCountRef.current++

    // Track frame times for analysis
    frameTimesRef.current.push(delta)
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift()
    }

    // Detect dropped frames (frame took longer than 20ms = below 50fps)
    if (delta > 20) {
      droppedFramesRef.current++
    }

    rafIdRef.current = requestAnimationFrame(measureFrame)
  }, [])

  // Update displayed metrics every 500ms
  useEffect(() => {
    if (!enabled) return

    rafIdRef.current = requestAnimationFrame(measureFrame)

    const updateInterval = setInterval(() => {
      const avgFrameTime = frameTimesRef.current.length > 0
        ? frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length
        : 16.67

      const avgLatency = latencySamplesRef.current.length > 0
        ? latencySamplesRef.current.reduce((a, b) => a + b, 0) / latencySamplesRef.current.length
        : 0

      setMetrics({
        fps: Math.round(1000 / avgFrameTime),
        inputLatency: Math.round(avgLatency * 100) / 100,
        frameTime: Math.round(avgFrameTime * 100) / 100,
        droppedFrames: droppedFramesRef.current
      })

      // Reset samples for next measurement window
      frameCountRef.current = 0
      latencySamplesRef.current = []
    }, 500)

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
      clearInterval(updateInterval)
    }
  }, [enabled, measureFrame])

  // Global pointer event listeners for latency measurement
  useEffect(() => {
    if (!enabled) return

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'pen' || e.pointerType === 'touch') {
        lastInputTimeRef.current = e.timeStamp || performance.now()
        setIsDrawing(true)
      }
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDrawing) return

      const inputTime = e.timeStamp || performance.now()
      const now = performance.now()

      // Measure time from input event to current frame
      const latency = now - inputTime
      latencySamplesRef.current.push(latency)

      // Keep only last 30 samples
      if (latencySamplesRef.current.length > 30) {
        latencySamplesRef.current.shift()
      }
    }

    const handlePointerUp = () => {
      setIsDrawing(false)
    }

    // Listen on document to capture all pointer events
    document.addEventListener('pointerdown', handlePointerDown, { passive: true })
    document.addEventListener('pointermove', handlePointerMove, { passive: true })
    document.addEventListener('pointerup', handlePointerUp, { passive: true })
    document.addEventListener('pointercancel', handlePointerUp, { passive: true })

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
      document.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [enabled, isDrawing])

  const captureBaseline = () => {
    setBaseline({ ...metrics })
    console.log('📊 Baseline captured:', metrics)
  }

  const exportMetrics = () => {
    const data = {
      timestamp: new Date().toISOString(),
      current: metrics,
      baseline: baseline,
      improvement: baseline ? {
        fpsChange: metrics.fps - baseline.fps,
        latencyChange: baseline.inputLatency - metrics.inputLatency,
        frameTimeChange: baseline.frameTime - metrics.frameTime
      } : null
    }
    console.log('📊 Performance Metrics Export:', JSON.stringify(data, null, 2))

    // Copy to clipboard
    navigator.clipboard?.writeText(JSON.stringify(data, null, 2))
      .then(() => console.log('📋 Metrics copied to clipboard'))
      .catch(() => {})
  }

  if (!enabled) return null

  const positionClasses = {
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2'
  }

  const getLatencyColor = (latency: number) => {
    if (latency <= 16) return 'text-green-500' // Excellent - within one frame
    if (latency <= 33) return 'text-yellow-500' // OK - within two frames
    return 'text-red-500' // Poor - noticeable lag
  }

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return 'text-green-500' // Good
    if (fps >= 30) return 'text-yellow-500' // Acceptable
    return 'text-red-500' // Poor
  }

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 bg-black/80 text-white p-3 rounded-lg font-mono text-xs min-w-[200px] select-none`}
      style={{ pointerEvents: 'auto' }}
    >
      <div className="font-bold mb-2 text-blue-400 flex items-center gap-2">
        📊 Performance Monitor
        {isDrawing && <span className="text-green-400 animate-pulse">● Drawing</span>}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <span>FPS:</span>
          <span className={getFpsColor(metrics.fps)}>{metrics.fps}</span>
        </div>

        <div className="flex justify-between">
          <span>Input Latency:</span>
          <span className={getLatencyColor(metrics.inputLatency)}>
            {metrics.inputLatency.toFixed(1)}ms
          </span>
        </div>

        <div className="flex justify-between">
          <span>Frame Time:</span>
          <span>{metrics.frameTime.toFixed(1)}ms</span>
        </div>

        <div className="flex justify-between">
          <span>Dropped Frames:</span>
          <span className={metrics.droppedFrames > 0 ? 'text-red-500' : ''}>
            {metrics.droppedFrames}
          </span>
        </div>
      </div>

      {baseline && (
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div className="text-gray-400 text-[10px] mb-1">vs Baseline:</div>
          <div className="flex justify-between text-[10px]">
            <span>Latency:</span>
            <span className={baseline.inputLatency > metrics.inputLatency ? 'text-green-400' : 'text-red-400'}>
              {baseline.inputLatency > metrics.inputLatency ? '↓' : '↑'}
              {Math.abs(baseline.inputLatency - metrics.inputLatency).toFixed(1)}ms
            </span>
          </div>
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-gray-600 flex gap-1">
        <button
          onClick={captureBaseline}
          className="flex-1 bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-[10px]"
        >
          Set Baseline
        </button>
        <button
          onClick={exportMetrics}
          className="flex-1 bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-[10px]"
        >
          Export
        </button>
      </div>

      <div className="mt-1 text-[9px] text-gray-500">
        Target: ≤16ms latency, 60fps
      </div>
    </div>
  )
}

export default PerformanceMonitor
