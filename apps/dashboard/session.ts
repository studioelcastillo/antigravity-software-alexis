import { decryptSession } from "./utils/session";

const normalizeUser = (user: any) => {
  if (!user || typeof user !== 'object') return user;

  const profile = user.profile || user.profiles || null;
  const profId = user.prof_id ?? profile?.prof_id ?? null;

  return {
    ...user,
    profile,
    prof_id: profId ?? user.prof_id,
  };
};

const readSession = (key: string) => {
  const value = decryptSession(key);
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }
  return value;
};

export const getStoredUser = () => {
  const dashboardUser = readSession("dashboard_user");
  const user = dashboardUser ?? readSession("user");
  if (!user) return null;
  return normalizeUser(user);
};
