import { useEffect, useRef, useState } from 'react'

const DURATION_MS = 700

/** Luôn đếm từ 0 lên `target` mỗi khi mount hoặc `target` đổi (skip animation khi reduced-motion). */
export function useCountUp(target: number) {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      fromRef.current = target
      return
    }

    const from = fromRef.current
    if (from === target) return

    const start = performance.now()
    let frame: number

    const tick = (now: number) => {
      const progress = Math.min((now - start) / DURATION_MS, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])

  return value
}
