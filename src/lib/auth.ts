import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const SESSION_COOKIE_NAME = "achados_nanda_session";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  // Se não houver cookie, buscar o usuário admin padrão
  // Para ambiente pessoal, garantimos que haja sempre o usuário administrador
  if (!token) {
    const admin = await prisma.user.findFirst();
    if (admin) {
      return {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        avatarUrl: admin.avatarUrl,
        role: admin.role,
      };
    }
    return null;
  }

  // Se houver token com ID do usuário
  const user = await prisma.user.findUnique({
    where: { id: token },
  });

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };
}
