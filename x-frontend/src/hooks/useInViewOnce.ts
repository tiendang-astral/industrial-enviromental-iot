import { useEffect, useRef, useState } from 'react'

/**
 * Trả `true` từ lần đầu phần tử lọt vào khung nhìn và giữ nguyên sau đó.
 *
 * Dùng để hoãn dựng biểu đồ dưới màn hình đầu: một gateway 20 kênh là 20 instance ECharts, dựng
 * hết cùng lúc lúc mở trang thì đơ vài giây. Không bao giờ tháo ra khi cuộn qua — tháo rồi dựng
 * lại làm biểu đồ nháy mỗi lần cuộn ngược lên.
 */
export function useInViewOnce<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || inView) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setInView(true)
      },
      { rootMargin: '200px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [inView])

  return { ref, inView }
}
