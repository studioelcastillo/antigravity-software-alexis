
import { supabase } from "./supabaseClient";
import AuthSupabaseService from "./services/supabase/AuthSupabaseService";
import { User } from "./types";

export interface Policy {
  pol_id: number;
  pol_description: string;
  pol_type: string;
  pol_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface LoginParams {
  email: string;
  password: string;
  policyId: number;
  policyAnswer: boolean;
}

interface LoginResponse {
  success?: boolean;
  status?: string;
  data: {
    access_token: string;
    token_type: "Bearer";
    expires_at: string;
    user: User;
  };
  message: string;
}

interface PolicyResponse {
  status: string;
  data: Policy;
}

const getExpiresAt = async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session?.expires_at) {
    return new Date(data.session.expires_at * 1000).toISOString();
  }
  return new Date(Date.now() + 3600000).toISOString();
};

const AuthService = {
  getActiveDataPolicy: async () => {
    const response = await AuthSupabaseService.getActiveDataPolicy();
    const policy = response?.data?.data;
    return {
      data: {
        status: "success",
        data: {
          pol_id: policy?.pol_id ?? 1,
          pol_description: policy?.pol_description ?? "",
          pol_type: "DATA",
          pol_active: true,
        },
      },
    } as { data: PolicyResponse };
  },

  login: async (params: LoginParams) => {
    const response = await AuthSupabaseService.login(params);
    const payload = response?.data?.data;
    const expires_at = await getExpiresAt();

    return {
      data: {
        success: true,
        status: "Success",
        message: "User logged",
        data: {
          access_token: payload?.access_token ?? "",
          token_type: "Bearer",
          expires_at,
          user: payload?.user as User,
        },
      },
    } as { data: LoginResponse };
  },

  logout: async () => {
    localStorage.removeItem("user");
    localStorage.removeItem("dashboard_user");
    await AuthSupabaseService.logout();
  },

  checkSession: () => AuthSupabaseService.checkSession(),

  getUser: () => AuthSupabaseService.getUser(),

  recoveryPassword: (email: string) =>
    AuthSupabaseService.recoveryPassword({ email }),

  newPassword: (params: { u: string; t: string; password: string }) =>
    AuthSupabaseService.newPassword({ password: params.password }),

  changePassword: (params: { password: string; oldPassword?: string }) =>
    AuthSupabaseService.changePassword({ password: params.password }),
};

export default AuthService;
