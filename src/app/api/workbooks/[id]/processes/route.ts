import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Create a new process in a workbook (manual creation)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const wb = await db.workbook.findFirst({ where: { id, userId: user.id } })
    if (!wb) return NextResponse.json({ error: 'Workbook tidak ditemukan' }, { status: 404 })

    const body = await req.json()
    const {
      code, name, description, inputText, outputText, totalSla, category,
      lanes, steps, sops, forms,
    } = body

    if (!code || !name) {
      return NextResponse.json({ error: 'Code dan name wajib diisi' }, { status: 400 })
    }

    const count = await db.workbookProcess.count({ where: { workbookId: id } })

    const process = await db.workbookProcess.create({
      data: {
        workbookId: id,
        code,
        name,
        description: description || '',
        inputText: inputText || '',
        outputText: outputText || '',
        totalSla: totalSla || '',
        category: category || '',
        lanesJson: JSON.stringify(lanes || []),
        stepsJson: JSON.stringify(steps || []),
        sopsJson: JSON.stringify(sops || []),
        formsJson: JSON.stringify(forms || []),
        order: count + 1,
      },
    })

    return NextResponse.json({ process })
  } catch (error) {
    console.error('Create process error:', error)
    return NextResponse.json({ error: 'Gagal membuat proses' }, { status: 500 })
  }
}
