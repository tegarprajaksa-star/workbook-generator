// Shared types and API helpers for Workbook Generator

export type SessionUser = {
  id: string
  email: string
  name: string
  role: string
}

export type Kra = { name: string; formula: string; target: string; unit: string }

export type BpmnStep = {
  type: 'START' | 'TASK' | 'GATEWAY' | 'END' | 'CORRECTION'
  lane: number
  label: string
  sla: string
  order: number
  branchLabel?: string
  yesTargetOrder?: number
  noTargetOrder?: number
}

export type Sop = { instruction: string; workInstruction: string; output: string }
export type FormField = { label: string; standard?: string }

export type WorkbookProcess = {
  id: string
  code: string
  name: string
  description: string
  inputText: string
  outputText: string
  totalSla: string
  category: string
  lanesJson: string
  stepsJson: string
  sopsJson: string
  formsJson: string
  order: number
}

export type Workbook = {
  id: string
  userId: string
  title: string
  companyName: string
  companyTagline: string
  positionTitle: string
  department: string
  reportsTo: string
  subordinates: string
  purpose: string
  authority: string
  responsibilities: string
  dutiesPrimary: string
  dutiesDaily: string
  dutiesWeekly: string
  dutiesMonthly: string
  krasJson: string
  status: string
  accentColor: string
  createdAt: string
  updatedAt: string
  processes?: WorkbookProcess[]
  _count?: { processes: number }
}

// API helper
export async function api<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    cache: 'no-store',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  // For blob responses (file downloads)
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return res.json()
  }
  return res.blob() as unknown as T
}
