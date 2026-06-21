// Shared types and API helpers for BPM app

export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF'

export type SessionUser = {
  id: string
  email: string
  name: string
  role: UserRole
  employeeId: string | null
}

export type Department = {
  id: string
  name: string
  description: string | null
}

export type Position = {
  id: string
  title: string
  departmentId: string
  department: Department
  reportsToId: string | null
  reportsTo: Position | null
  purpose: string | null
  authority: string | null
  responsibilities: string | null
  dutiesPrimary: string | null
  dutiesDaily: string | null
  dutiesWeekly: string | null
  dutiesMonthly: string | null
  color: string | null
  employees: Employee[]
  kras: Kra[]
  _count?: { processSteps: number }
}

export type Employee = {
  id: string
  name: string
  email: string
  phone: string | null
  positionId: string
  position: Position & { department: Department; reportsTo?: Position | null }
  status: string
  hireDate: string
  _count?: { tasks: number }
}

export type ProcessLane = {
  id: string
  name: string
  order: number
}

export type ProcessStep = {
  id: string
  type: 'START' | 'TASK' | 'GATEWAY' | 'END' | 'CORRECTION'
  label: string
  sla: string | null
  order: number
  branchLabel: string | null
  yesTargetOrder: number | null
  noTargetOrder: number | null
  description: string | null
  lane: ProcessLane
  position: { id: string; title: string; color: string | null } | null
}

export type SopStep = {
  id: string
  order: number
  instruction: string
  workInstruction: string
  output: string
}

export type Process = {
  id: string
  code: string
  name: string
  description: string | null
  inputText: string | null
  outputText: string | null
  totalSla: string | null
  category: string | null
  status: string
  lanes: ProcessLane[]
  steps: ProcessStep[]
  sops: SopStep[]
  forms: FormTemplate[]
  _count?: { tasks: number }
}

export type FormTemplate = {
  id: string
  name: string
  description: string | null
  fieldsJson: string
}

export type Kra = {
  id: string
  name: string
  formula: string
  target: string
  unit: string | null
  order: number
  position: Position & { department: Department }
}

export type Task = {
  id: string
  title: string
  description: string | null
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate: string | null
  createdAt: string
  assignedTo: (Employee & { position: { id: string; title: string; color: string | null } }) | null
  process: { id: string; code: string; name: string } | null
  createdBy: { name: string } | null
  logs: TaskLog[]
}

export type TaskLog = {
  id: string
  action: string
  note: string | null
  createdAt: string
  user: { name: string } | null
  employee: { name: string } | null
}

// API helpers
const API_BASE = '/api'

export async function api<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(data.error || `HTTP ${res.status}`)
  }

  return res.json()
}
