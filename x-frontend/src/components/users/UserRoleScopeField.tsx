import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TenantNodePicker } from '@/components/patterns/TenantNodePicker'
import { roleLabel } from '@/lib/roleLabels'
import type { TenantNode } from '@/types/tenantNode'
import type { TenantRole } from '@/types/tenantUser'

/**
 * Phân quyền = **một vai trò** + **một hoặc nhiều đơn vị**.
 *
 * Một vai trò chứ không phải nhiều: lúc đăng nhập, `AuthServiceImpl.resolveTenantAuthorities()` gộp
 * phẳng vai trò thành `authorities` trong JWT và BỎ phần đơn vị đi kèm, còn `ScopeService` gộp phạm
 * vi thành hợp của mọi node. Cho nhiều vai trò ở các đơn vị khác nhau thì user dùng được vai trò
 * cao nhất trên toàn bộ phạm vi — backend chặn bằng `SINGLE_ROLE_ONLY`.
 */
export function UserRoleScopeField({
  roleId,
  selectedIds,
  roles,
  nodes,
  error,
  onRoleChange,
  onSelectedIdsChange,
}: {
  roleId: number | null
  selectedIds: number[]
  roles: TenantRole[]
  nodes: TenantNode[]
  error?: string
  onRoleChange: (roleId: number) => void
  onSelectedIdsChange: (ids: number[]) => void
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor="user-role" data-required>
          Vai trò
        </FieldLabel>
        <Select
          value={roleId ? String(roleId) : ''}
          onValueChange={(value) => onRoleChange(Number(value))}
        >
          <SelectTrigger id="user-role" className="w-full">
            <SelectValue placeholder="Chọn vai trò" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {roles.map((role) => (
                <SelectItem key={role.id} value={String(role.id)}>
                  {roleLabel(role.value)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field data-invalid={!!error}>
        <FieldLabel htmlFor="user-scope" data-required>
          Phạm vi
        </FieldLabel>
        <TenantNodePicker
          id="user-scope"
          mode="multiple"
          nodes={nodes}
          value={selectedIds}
          onChange={onSelectedIdsChange}
          placeholder="Chọn tổ chức"
          invalid={!!error}
        />
        <FieldError>{error}</FieldError>
      </Field>
    </div>
  )
}
