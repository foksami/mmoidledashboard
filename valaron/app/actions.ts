"use server"

import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import { db } from "@/lib/db"
import { goals } from "@/lib/schema"
import { eq } from "drizzle-orm"

export async function addGoal(formData: FormData) {
  const name = (formData.get("name") as string | null)?.trim()
  const metric = formData.get("metric") as string | null
  const target = Number(formData.get("target"))
  const skill = (formData.get("skill") as string | null)?.trim()
  const stat = (formData.get("stat") as string | null)?.trim()
  const hashedId = formData.get("hashedId") as string | null
  const deadline = (formData.get("deadline") as string | null) || null

  if (!name || !metric || !target || !hashedId) return

  const metricArgs: Record<string, string> = {}
  if (skill) metricArgs.skill = skill.toLowerCase()
  if (stat) metricArgs.stat = stat.toLowerCase()

  await db.insert(goals).values({
    id: randomUUID(),
    hashedId,
    name,
    metric,
    metricArgs: Object.keys(metricArgs).length > 0 ? JSON.stringify(metricArgs) : null,
    target,
    deadline,
    createdAt: new Date().toISOString(),
  })

  revalidatePath("/")
}

export async function deleteGoal(id: string) {
  await db.delete(goals).where(eq(goals.id, id))
  revalidatePath("/")
}
