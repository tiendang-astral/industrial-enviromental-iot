import type { TenantNode } from '@/types/tenantNode'

/**
 * Sắp cây theo thứ tự DFS — con luôn nằm ngay sau cha, các nhánh cùng cấp sắp theo tên.
 *
 * Không sort theo `path` dạng text: label ltree là `id` nên `10` đứng trước `2` khi so sánh lexical,
 * cây sẽ hiện sai thứ tự ngay khi tenant có quá 9 node.
 */
export function orderNodesDepthFirst(nodes: TenantNode[]): TenantNode[] {
  const byParent = new Map<number | null, TenantNode[]>()
  for (const node of nodes) {
    const list = byParent.get(node.parentId) ?? []
    list.push(node)
    byParent.set(node.parentId, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }

  const result: TenantNode[] = []
  function visit(parentId: number | null) {
    for (const node of byParent.get(parentId) ?? []) {
      result.push(node)
      visit(node.id)
    }
  }
  visit(null)
  return result
}

/** Chuỗi id từ node lên tới gốc (không gồm chính nó). */
export function ancestorIdsOf(node: TenantNode, byId: Map<number, TenantNode>): number[] {
  const result: number[] = []
  let current = node.parentId === null ? undefined : byId.get(node.parentId)
  while (current) {
    result.push(current.id)
    current = current.parentId === null ? undefined : byId.get(current.parentId)
  }
  return result
}

/** Con trực tiếp theo `parentId` — dựng một lần rồi tra, tránh quét lại mảng cho mỗi node. */
export function childrenByParentOf(nodes: TenantNode[]): Map<number, TenantNode[]> {
  const map = new Map<number, TenantNode[]>()
  for (const node of nodes) {
    if (node.parentId === null) continue
    const list = map.get(node.parentId) ?? []
    list.push(node)
    map.set(node.parentId, list)
  }
  return map
}

/** Toàn bộ hậu duệ của một node (không gồm chính nó). */
export function descendantIdsOf(id: number, childrenByParent: Map<number, TenantNode[]>): number[] {
  const result: number[] = []
  const stack = [...(childrenByParent.get(id) ?? [])]
  while (stack.length) {
    const node = stack.pop()!
    result.push(node.id)
    stack.push(...(childrenByParent.get(node.id) ?? []))
  }
  return result
}

/**
 * Bỏ những node đã được một tổ tiên trong tập bao phủ.
 *
 * Phạm vi quyền mở rộng theo cây (`ScopeService` lấy toàn bộ hậu duệ qua ltree), nên tick cả cha
 * lẫn con chỉ tạo ra dòng `user_role_scope` thừa mà không thêm quyền nào. Form giữ tập đầy đủ để
 * hiển thị đúng ô tick, còn lúc gửi đi thì rút về mức cao nhất.
 */
export function keepTopMost(selectedIds: number[], nodes: TenantNode[]): number[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const selected = new Set(selectedIds)
  return selectedIds.filter((id) => {
    const node = byId.get(id)
    return node ? !ancestorIdsOf(node, byId).some((ancestorId) => selected.has(ancestorId)) : false
  })
}

/** Ngược lại của keepTopMost: từ mức cao nhất bung ra tập đầy đủ để form tick đúng mọi ô. */
export function expandToDescendants(topMostIds: number[], nodes: TenantNode[]): number[] {
  const childrenByParent = childrenByParentOf(nodes)
  const result = new Set<number>()
  for (const id of topMostIds) {
    result.add(id)
    for (const descendantId of descendantIdsOf(id, childrenByParent)) result.add(descendantId)
  }
  return [...result]
}
