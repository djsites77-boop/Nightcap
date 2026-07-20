"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export async function updateProfile(formData: FormData) {
  const session = await requireSession();
  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid profile");
  }

  const { firstName, lastName, email, phone } = parsed.data;
  const name = `${firstName} ${lastName}`.trim();

  if (email !== session.user.email) {
    const taken = await prisma.user.findFirst({
      where: { email, NOT: { id: session.user.id } },
      select: { id: true },
    });
    if (taken) throw new Error("That email is already in use.");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { firstName, lastName, name, email, phone },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
