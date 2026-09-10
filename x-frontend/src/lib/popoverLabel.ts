/**
 * Handler `onInteractOutside` cho popover mở từ một nút có `<label for={id}>` đứng trên.
 *
 * Bấm vào nhãn thì trình duyệt chuyển cú click sang nút mở popover. Radix đóng popover ngay lúc
 * nhấn chuột ra ngoài, rồi cú click tới sau lại bật nó lên — nhìn như bấm ra ngoài mà dropdown mở
 * lại. Radix vốn đã miễn trừ đúng ca này cho chính nút trigger; nhãn trỏ tới trigger được miễn trừ
 * y như vậy, để cú click đi qua trigger và tự đóng popover.
 */
export function ignoreOwnLabelOutside(id: string | undefined) {
  return (event: { target: EventTarget | null; preventDefault: () => void }) => {
    if (!id || !(event.target instanceof Element)) return
    if (event.target.closest(`label[for="${CSS.escape(id)}"]`)) event.preventDefault()
  }
}
