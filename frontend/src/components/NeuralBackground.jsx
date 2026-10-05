import { useEffect, useRef } from 'react'

const LINK_DISTANCE = 130
const POINTER_DISTANCE = 180

// Drifting network of nodes that link up with each other and with the cursor.
function NeuralBackground({ className = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const pointer = { x: -1e4, y: -1e4 }
    let width = 0
    let height = 0
    let nodes = []
    let frame = 0

    const draw = (time) => {
      ctx.clearRect(0, 0, width, height)

      for (const node of nodes) {
        if (reduceMotion) break
        node.x += node.vx
        node.y += node.vy
        if (node.x < 0 || node.x > width) node.vx *= -1
        if (node.y < 0 || node.y > height) node.vy *= -1
      }

      ctx.lineWidth = 0.6
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const dist = Math.hypot(a.x - b.x, a.y - b.y)
          if (dist < LINK_DISTANCE) {
            ctx.strokeStyle = `rgba(129, 140, 248, ${(1 - dist / LINK_DISTANCE) * 0.22})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }

        const pointerDist = Math.hypot(a.x - pointer.x, a.y - pointer.y)
        if (pointerDist < POINTER_DISTANCE) {
          ctx.strokeStyle = `rgba(103, 232, 249, ${(1 - pointerDist / POINTER_DISTANCE) * 0.45})`
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(pointer.x, pointer.y)
          ctx.stroke()
        }
      }

      for (const node of nodes) {
        const alpha = 0.35 + 0.35 * Math.sin(time * 0.002 + node.phase)
        ctx.fillStyle = `rgba(199, 210, 254, ${alpha})`
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count = Math.min(110, Math.round((width * height) / 14000))
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.3 + 0.5,
        phase: Math.random() * Math.PI * 2,
      }))
      if (reduceMotion) draw(0)
    }

    const loop = (time) => {
      draw(time)
      frame = requestAnimationFrame(loop)
    }

    const handleMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      pointer.x = e.clientX - rect.left
      pointer.y = e.clientY - rect.top
    }

    const handleLeave = () => {
      pointer.x = -1e4
      pointer.y = -1e4
    }

    resize()
    window.addEventListener('resize', resize)
    if (!reduceMotion) {
      window.addEventListener('pointermove', handleMove)
      document.documentElement.addEventListener('pointerleave', handleLeave)
      frame = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', handleMove)
      document.documentElement.removeEventListener('pointerleave', handleLeave)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none h-full w-full ${className}`} />
}

export default NeuralBackground
