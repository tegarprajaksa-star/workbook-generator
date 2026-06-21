import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; processId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, processId } = await params
    const wb = await db.workbook.findFirst({ where: { id, userId: user.id } })
    if (!wb) return NextResponse.json({ error: 'Workbook tidak ditemukan' }, { status: 404 })

    const existing = await db.workbookProcess.findFirst({
      where: { id: processId, workbookId: id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Proses tidak ditemukan' }, { status: 404 })
    }

    const body = await req.json()
    const allowed = [
      'code', 'name', 'description', 'inputText', 'outputText', 'totalSla', 'category',
      'lanesJson', 'stepsJson', 'sopsJson', 'formsJson', 'order',
    ]
    const data: Record<string, unknown> = {}
    for (const f of allowed) {
      if (f in body) {
        // Accept either raw arrays (auto-serialize) or pre-stringified JSON
        if (f.endsWith('Json') && Array.isArray(body[f])) {
          data[f] = JSON.stringify(body[f])
        } else {
          data[f] = body[f]
        }
      }
    }

    const process = await db.workbookProcess.update({
      where: { id: processId },
      data,
    })

    return NextResponse.json({ process })
  } catch (error) {
    console.error('Update process error:', error)
    return NextResponse.json({ error: 'Gagal memperbarui proses' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; processId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, processId } = await params
    const wb = await db.workbook.findFirst({ where: { id, userId: user.id } })
    if (!wb) return NextResponse.json({ error: 'Workbook tidak ditemukan' }, { status: 404 })

    await db.workbookProcess.deleteMany({ where: { id: processId, workbookId: id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete process error:', error)
    return NextResponse.json({ error: 'Gagal menghapus proses' }, { status: 500 })
  }
}
