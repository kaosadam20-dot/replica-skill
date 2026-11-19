import { useEffect, useRef, useState } from 'react'

type Props = {
  live?: boolean
  tone?: number
  timestamp?: boolean
  className?: string
}

export function CameraFeed({ live = false, tone = 34, timestamp = false, className = '' }: Props) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (!live) return
    let active = true
    let media: MediaStream | null = null

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) return
        media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        if (active) setStream(media)
        else media.getTracks().forEach((track) => track.stop())
      } catch {
        // No camera available: the generated scene stands in.
      }
    }

    start()
    return () => {
      active = false
      media?.getTracks().forEach((track) => track.stop())
    }
  }, [live])

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => undefined)
    }
  }, [stream])

  return (
    <div
      className={`scene ${stream ? 'scene--live' : ''} ${className}`}
      style={{ '--scene-hue': tone } as React.CSSProperties}
      aria-hidden="true"
    >
      {stream ? (
        <video ref={videoRef} muted playsInline autoPlay />
      ) : (
        <>
          <div className="scene__window" />
          <div className="scene__lamp" />
          <div className="scene__desk" />
          <div className="scene__person" />
          <div className="scene__laptop">
            <div className="scene__screen" />
          </div>
          <div className="scene__mug" />
          <div className="scene__scan" />
        </>
      )}
      {timestamp ? <div className="scene__time">CAM 01 · 2026-11-19 23:14</div> : null}
      <div className="scene__grain" />
      <div className="scene__vignette" />
    </div>
  )
}
