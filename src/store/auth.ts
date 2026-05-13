import { UserProfile } from "@/types";
import { hashPassword, newUid, nowIso, validatePasswordStrength, verifyPassword } from "./crypto";
import {
  StoredUser,
  emptyUserData,
  findUserByEmail,
  findUserByUid,
  getSessionUid,
  loadUserData,
  patchUser,
  readUsers,
  saveUserData,
  setSession,
  upsertUser,
} from "./localdb";
import { buildDefaultCategories } from "./seed";

function toProfile(u: StoredUser): UserProfile {
  return {
    uid: u.uid,
    email: u.email,
    display_name: u.display_name,
    phone: u.phone,
    business_name: u.business_name,
    default_currency: u.default_currency || "BRL",
    is_admin: u.is_admin,
    created_at: u.created_at,
  };
}

export async function register(email: string, password: string, displayName?: string): Promise<UserProfile> {
  const err = validatePasswordStrength(password);
  if (err) throw new Error(err);
  if (findUserByEmail(email)) throw new Error("Email já cadastrado");

  const isFirst = readUsers().length === 0;
  const uid = newUid();
  const user: StoredUser = {
    uid,
    email: email.trim().toLowerCase(),
    password_hash: await hashPassword(password),
    display_name: displayName?.trim() || null,
    phone: null,
    business_name: null,
    default_currency: "BRL",
    is_admin: isFirst,
    created_at: nowIso(),
  };
  upsertUser(user);

  // popula categorias padrão para o novo usuário
  const data = emptyUserData();
  data.categories = buildDefaultCategories(uid);
  saveUserData(uid, data);

  setSession(uid);
  return toProfile(user);
}

export async function login(email: string, password: string): Promise<UserProfile> {
  const user = findUserByEmail(email);
  if (!user) throw new Error("Email ou senha inválidos");
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw new Error("Email ou senha inválidos");
  setSession(user.uid);
  return toProfile(user);
}

export function logout(): void {
  setSession(null);
}

export function currentProfile(): UserProfile | null {
  const uid = getSessionUid();
  if (!uid) return null;
  const user = findUserByUid(uid);
  if (!user) {
    setSession(null);
    return null;
  }
  return toProfile(user);
}

export function currentUid(): string {
  const uid = getSessionUid();
  if (!uid) throw new Error("Não autenticado");
  if (!findUserByUid(uid)) {
    setSession(null);
    throw new Error("Sessão inválida");
  }
  return uid;
}

export function updateProfile(updates: Partial<UserProfile>): UserProfile {
  const uid = currentUid();
  const patch: Partial<StoredUser> = {
    display_name: updates.display_name ?? null,
    phone: updates.phone ?? null,
    business_name: updates.business_name ?? null,
    default_currency: updates.default_currency || "BRL",
  };
  const user = patchUser(uid, patch);
  if (!user) throw new Error("Perfil não encontrado");
  return toProfile(user);
}

export async function changePassword(currentPwd: string, newPwd: string): Promise<void> {
  const uid = currentUid();
  const user = findUserByUid(uid);
  if (!user) throw new Error("Sessão inválida");
  const ok = await verifyPassword(currentPwd, user.password_hash);
  if (!ok) throw new Error("Senha atual incorreta");
  const err = validatePasswordStrength(newPwd);
  if (err) throw new Error(err);
  patchUser(uid, { password_hash: await hashPassword(newPwd) });
}
