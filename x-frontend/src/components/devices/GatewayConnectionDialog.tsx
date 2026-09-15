import { useId, useState } from 'react'
import { AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CopyButton } from '@/components/patterns/CopyButton'
import { getApiErrorMessage } from '@/lib/apiError'
import { useGatewayConnectionInfoQuery } from '@/queries/useGatewayConnectionInfoQuery'
import type { Gateway, GatewayConnectionInfo } from '@/types/gateway'
import type { GatewayPin } from '@/types/gatewayPin'

const SAMPLE_COMMAND_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6'
// Ví dụ chỉ cần đủ thấy dạng lô, không cần liệt kê hết chân của gateway.
const MAX_SAMPLE_READINGS = 3

const ACTION_HINT = {
  PUBLISH: 'Gateway gửi lên topic này',
  SUBSCRIBE: 'Gateway đăng ký nhận từ topic này',
}

function ConnectionRow({
  label,
  value,
  secret = false,
}: {
  label: string
  value: string
  secret?: boolean
}) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <InputGroup>
        <InputGroupInput
          id={id}
          readOnly
          value={value}
          type={secret && !revealed ? 'password' : 'text'}
          className="font-mono text-[13px]"
          onFocus={(event) => event.currentTarget.select()}
        />
        <InputGroupAddon align="inline-end">
          {secret && (
            <InputGroupButton
              size="icon-xs"
              aria-pressed={revealed}
              onClick={() => setRevealed((value) => !value)}
            >
              {revealed ? <EyeOff /> : <Eye />}
              <span className="sr-only">{revealed ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</span>
            </InputGroupButton>
          )}
          <CopyButton value={value} label={`Sao chép ${label.toLowerCase()}`} />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

/** JSON hợp lệ nhưng mỗi phần tử mảng nằm gọn một dòng — in thụt lề đầy đủ thì payload cao gấp ba. */
function formatPayload(payload: Record<string, unknown>) {
  const inline = (value: unknown) =>
    value !== null && typeof value === 'object'
      ? `{ ${Object.entries(value)
          .map(([key, item]) => `"${key}": ${JSON.stringify(item)}`)
          .join(', ')} }`
      : JSON.stringify(value)

  const lines = Object.entries(payload).map(([key, value]) =>
    Array.isArray(value)
      ? `  "${key}": [\n${value.map((item) => `    ${inline(item)}`).join(',\n')}\n  ]`
      : `  "${key}": ${JSON.stringify(value)}`
  )
  return `{\n${lines.join(',\n')}\n}`
}

/** Một lượt trao đổi MQTT trình bày như request: hành động + topic, rồi payload. */
function MqttExchange({
  action,
  topic,
  payload,
}: {
  action: 'PUBLISH' | 'SUBSCRIBE'
  topic: string
  payload: Record<string, unknown>
}) {
  const json = formatPayload(payload)

  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-border">
      <div className="flex items-center gap-3 border-b border-border px-3 py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              className="shrink-0 rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary"
            >
              {action}
            </span>
          </TooltipTrigger>
          <TooltipContent>{ACTION_HINT[action]}</TooltipContent>
        </Tooltip>
        <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{topic}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="shrink-0 text-xs text-muted-foreground">
              QoS 1
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Chọn QoS 1 trên gateway để tin nhắn không bị mất khi mạng chập chờn
          </TooltipContent>
        </Tooltip>
        <CopyButton value={topic} label={`Sao chép topic ${topic}`} />
      </div>
      <div className="relative bg-surface-sunken">
        <pre className="px-3 py-3 pr-10 font-mono text-[12px] leading-[1.6] break-all whitespace-pre-wrap">
          {json}
        </pre>
        <CopyButton value={json} label="Sao chép payload" className="absolute top-2 right-2" />
      </div>
    </div>
  )
}

function FieldNotes({ notes }: { notes: [name: string, meaning: string][] }) {
  return (
    <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] content-start gap-x-4 gap-y-1.5 text-sm">
      {notes.map(([name, meaning]) => (
        <div key={name} className="contents">
          <dt className="font-mono text-[12px] leading-5 text-foreground">{name}</dt>
          <dd className="leading-5 text-muted-foreground">{meaning}</dd>
        </div>
      ))}
    </dl>
  )
}

function Examples({ info, pins }: { info: GatewayConnectionInfo; pins: GatewayPin[] | undefined }) {
  // Ví dụ dựng từ chân thật của gateway để người lắp đặt chép về dùng được ngay.
  const inputs = pins?.filter((pin) => pin.direction === 'INPUT' && pin.enabled) ?? []
  const readings = inputs.length
    ? inputs
        .slice(0, MAX_SAMPLE_READINGS)
        .map((pin) => ({ type: pin.type, pinNumber: pin.pinNumber, value: pin.type === 'DI' ? 1 : 23.5 }))
    : [
        { type: 'AI', pinNumber: 1, value: 23.5 },
        { type: 'DI', pinNumber: 1, value: 1 },
      ]
  const output = pins?.find((pin) => pin.direction === 'OUTPUT')
  const target = { pinType: output?.type ?? 'DO', pinNumber: output?.pinNumber ?? 1 }

  // Hàng tab đứng yên, chỉ nội dung tab cuộn — cột thông tin bên trái luôn nhìn thấy khi đọc ví dụ.
  const scrollArea = 'flex min-h-0 flex-col gap-4 lg:overflow-y-auto lg:pr-2'

  return (
    <Tabs defaultValue="data" className="min-w-0 gap-4 lg:h-full lg:min-h-0">
      <TabsList>
        <TabsTrigger value="data">Gửi số đo</TabsTrigger>
        <TabsTrigger value="command">Lệnh bật / tắt</TabsTrigger>
      </TabsList>

      <TabsContent value="data" className={scrollArea}>
        <MqttExchange
          action="PUBLISH"
          topic={info.dataTopic}
          payload={{ measuredAt: '2026-09-15T09:41:00Z', readings }}
        />
        <FieldNotes
          notes={[
            ['measuredAt', 'Thời điểm đo, giờ UTC theo ISO 8601'],
            ['readings[].type', 'Loại chân: AI hoặc DI'],
            ['readings[].pinNumber', 'Số chân'],
            ['readings[].value', 'Giá trị đo'],
          ]}
        />
      </TabsContent>

      <TabsContent value="command" className={scrollArea}>
        <section className="flex min-w-0 flex-col gap-3">
          <h3 className="text-sm font-medium">Lệnh gửi xuống</h3>
          <MqttExchange
            action="SUBSCRIBE"
            topic={info.commandTopic}
            payload={{ commandId: SAMPLE_COMMAND_ID, ...target, commandType: 'TURN_ON' }}
          />
          <FieldNotes
            notes={[
              ['commandId', 'Mã lệnh'],
              ['pinType, pinNumber', 'Chân relay'],
              ['commandType', 'TURN_ON hoặc TURN_OFF'],
            ]}
          />
        </section>

        <section className="flex min-w-0 flex-col gap-3 pt-2">
          <h3 className="text-sm font-medium">Kết quả gửi lên</h3>
          <MqttExchange
            action="PUBLISH"
            topic={info.ackTopic}
            payload={{ commandId: SAMPLE_COMMAND_ID, ...target, result: 'ACK', state: 'ON' }}
          />
          <FieldNotes
            notes={[
              ['commandId', 'Mã lệnh'],
              ['pinType, pinNumber', 'Chân điều khiển'],
              ['result', 'ACK nếu thực hiện được, NACK nếu từ chối'],
              ['state', 'Trạng thái relay: ON hoặc OFF'],
            ]}
          />
        </section>
      </TabsContent>
    </Tabs>
  )
}

export function GatewayConnectionDialog({
  gateway,
  pins,
  open,
  onOpenChange,
}: {
  gateway: Gateway
  pins: GatewayPin[] | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  // Chỉ gọi khi mở: response có mật khẩu dùng chung, không cần nằm sẵn trong cache.
  const { data: info, isLoading, error } = useGatewayConnectionInfoQuery(gateway.id, open)
  const ready = !isLoading && !!info

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* lg trở lên: chiều cao cố định, trái là ô thông tin, phải là tab ví dụ tự cuộn.
          Hẹp hơn thì hai phần xếp chồng và cả modal cuộn. */}
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-5 overflow-y-auto sm:max-w-5xl lg:h-[min(40rem,calc(100dvh-2rem))] lg:overflow-hidden">
        <DialogHeader>
          <DialogTitle>Thông tin kết nối</DialogTitle>
          <DialogDescription>{gateway.name}</DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Không tải được thông tin kết nối</AlertTitle>
            <AlertDescription>{getApiErrorMessage(error)}</AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-rows-[minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-4">
              {ready ? (
                <>
                  <ConnectionRow label="Máy chủ MQTT" value={info.brokerUrl} />
                  <ConnectionRow label="Client ID" value={info.clientId} />
                  <ConnectionRow label="Tài khoản" value={info.username} />
                  <ConnectionRow label="Mật khẩu" value={info.password} secret />
                </>
              ) : (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))
              )}
            </div>

            {ready ? <Examples info={info} pins={pins} /> : <Skeleton className="h-64 w-full" />}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
