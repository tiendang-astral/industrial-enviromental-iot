export interface Metric {
  id: number
  code: string
  name: string
  unit: string
  dataType: 'NUMBER' | 'BOOLEAN' | 'STRING'
  minValue: number | null
  maxValue: number | null
}
