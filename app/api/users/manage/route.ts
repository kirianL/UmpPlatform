import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { hashPassword } from "@/lib/auth-helpers";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const convex = new ConvexHttpClient(CONVEX_URL);

export async function POST(request: Request) {
  try {
    const { action, email, password, name, role, allowedRoutes, userId } =
      await request.json();

    if (action === "create") {
      if (!email || !password) {
        return NextResponse.json(
          { error: "Email y contraseña requeridos" },
          { status: 400 }
        );
      }
      const passwordHash = hashPassword(password);
      await convex.mutation(api.users.create, {
        email: email.trim().toLowerCase(),
        passwordHash,
        name: name || undefined,
        role: role || "produccion",
        allowedRoutes: allowedRoutes || [],
      });
      return NextResponse.json({ success: true });
    }

    if (action === "updatePassword") {
      if (!userId || !password) {
        return NextResponse.json(
          { error: "Usuario y nueva contraseña requeridos" },
          { status: 400 }
        );
      }
      const passwordHash = hashPassword(password);
      await convex.mutation(api.users.updatePassword, {
        userId,
        passwordHash,
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (err: any) {
    console.error("Error in /api/users/manage:", err);
    return NextResponse.json(
      { error: err.message || "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}

