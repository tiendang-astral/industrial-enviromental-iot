import html2canvas from 'html2canvas-pro'
import { jsPDF } from 'jspdf'

const A4 = { width: 210, height: 297 } // mm
const MARGIN = 10

/**
 * Xuất báo cáo thành FILE PDF tải thẳng về máy, không mở hộp thoại in.
 *
 * Chụp DOM thành ảnh rồi cắt thành từng trang A4, thay vì render lại nội dung bằng một bộ vẽ PDF:
 * cách đó phải dựng lần thứ hai toàn bộ bảng, biểu đồ ECharts và font tiếng Việt, và bản in sẽ trôi
 * dần khỏi thứ người dùng vừa nhìn thấy mỗi lần giao diện đổi.
 *
 * Dùng `html2canvas-pro` chứ không phải `html2canvas`: token màu của dự án khai bằng `oklch()`, bản
 * gốc không phân tích được và trả về ảnh mất màu.
 */
export async function exportReportPdf(element: HTMLElement, fileName: string) {
  // Ép nền sáng lúc chụp: người dùng thường xem theme tối, mà PDF nền đen vừa tốn mực vừa khó đọc.
  const root = document.documentElement
  const wasDark = root.classList.contains('dark')
  if (wasDark) root.classList.remove('dark')
  // Bật khối tiêu đề dành riêng cho bản xuất ra (xem index.css § [data-report-header]).
  root.setAttribute('data-exporting', '')
  // ECharts vẽ trên canvas nên không tự đổi màu/kích thước — phải bắt nó vẽ lại sau khi bỏ `.dark`
  // và sau khi lưới biểu đồ chuyển sang một cột. Chờ đủ lâu cho ResizeObserver của ResizableChart
  // chạy xong, nếu không ảnh chụp dính canvas cũ còn theo bề ngang hai cột.
  window.dispatchEvent(new Event('resize'))
  await new Promise((resolve) => setTimeout(resolve, 600))

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    })

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    const contentWidth = A4.width - MARGIN * 2
    const contentHeight = A4.height - MARGIN * 2
    // Bao nhiêu pixel ảnh lọt vào một trang giấy, theo đúng tỉ lệ đã thu nhỏ về bề ngang trang.
    const pxPerPage = Math.floor((contentHeight * canvas.width) / contentWidth)
    const breaks = breakPointsOf(element, canvas.height / element.offsetHeight)

    let offset = 0
    let page = 0
    while (offset < canvas.height) {
      const limit = offset + pxPerPage
      const end = limit >= canvas.height ? canvas.height : nearestBreak(breaks, offset, limit, pxPerPage)
      const sliceHeight = end - offset

      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = sliceHeight
      const context = slice.getContext('2d')
      if (!context) break
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, slice.width, slice.height)
      context.drawImage(canvas, 0, offset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)

      if (page > 0) pdf.addPage()
      pdf.addImage(
        slice.toDataURL('image/jpeg', 0.92),
        'JPEG',
        MARGIN,
        MARGIN,
        contentWidth,
        (sliceHeight * contentWidth) / canvas.width
      )
      offset = end
      page += 1
    }

    pdf.save(`${fileName}.pdf`)
  } finally {
    root.removeAttribute('data-exporting')
    if (wasDark) root.classList.add('dark')
    window.dispatchEvent(new Event('resize'))
  }
}

/**
 * Mép dưới của những khối không được cắt đôi (card biểu đồ, bảng, mục nhóm), quy về toạ độ pixel
 * của ảnh đã chụp.
 */
function breakPointsOf(element: HTMLElement, scale: number): number[] {
  const rootTop = element.getBoundingClientRect().top
  const blocks = element.querySelectorAll<HTMLElement>('[data-slot="card"], section, table')
  return [...blocks]
    .map((block) => (block.getBoundingClientRect().bottom - rootTop) * scale)
    .sort((a, b) => a - b)
}

/**
 * Chỗ cắt trang gần nhất nằm trước giới hạn trang. Không có mép khối nào phù hợp thì cắt cứng —
 * một card cao hơn cả trang giấy (bảng dài) thì buộc phải cắt, chỉ là không cắt giữa biểu đồ.
 *
 * Chặn dưới 55% trang để tránh cảnh trang giấy chỉ dùng một phần nhỏ rồi bỏ trống phần còn lại.
 */
function nearestBreak(breaks: number[], offset: number, limit: number, pxPerPage: number): number {
  const floor = offset + pxPerPage * 0.55
  let best = 0
  for (const point of breaks) {
    if (point > limit) break
    if (point >= floor) best = point
  }
  return best || limit
}
