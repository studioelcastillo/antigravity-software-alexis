import { supabase } from "../../supabaseClient";

type LoginParams = {
  email: string;
  password: string;
  policyId?: number;
  policyAnswer?: boolean;
};

const AuthSupabaseService = {
  async login({ email, password }: LoginParams) {
    let targetEmail = email;
    let userRecord: {
      user_email?: string;
      user_identification?: string | number | null;
      auth_user_id?: string | null;
    } | null = null;

    if (!email.includes("@")) {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("user_email, user_identification, auth_user_id")
        .eq("user_identification", email)
        .single();

      if (userError || !userData) {
        throw new Error("Usuario no encontrado por identificación");
      }
      targetEmail = userData.user_email;
      userRecord = userData;
    } else {
      const { data: userData } = await supabase
        .from("users")
        .select("user_email, user_identification, auth_user_id")
        .eq("user_email", email)
        .single();
      userRecord = userData || null;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password,
    });

    if (error) {
      throw error;
    }

    const { data: profile, error: profileError } =
      await AuthSupabaseService.getUserProfile(data.user.id);
    if (profileError) throw profileError;

    const clientIp = 'unknown';

    const { data: logData } = await supabase
      .from("login_history")
      .insert([
        {
          user_id: profile.user_id,
          lhist_ip: clientIp,
          lhist_success: true,
        },
      ])
      .select()
      .single();

    return {
      data: {
        status: "Success",
        data: {
          user: profile,
          access_token: data.session.access_token,
          lgnhist_id: logData ? logData.lhist_id : null,
        },
      },
    };
  },

  logout() {
    return supabase.auth.signOut();
  },

  signInWithOAuth({ provider }: { provider: string }) {
    return supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: window.location.origin + "/auth/callback",
      },
    });
  },

  recoveryPassword({ email }: { email: string }) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/recovery-password",
    });
  },

  newPassword({ password }: { password: string }) {
    return supabase.auth.updateUser({ password });
  },

  getSession() {
    return supabase.auth.getSession();
  },

  getUser() {
    return supabase.auth.getUser();
  },

  async checkSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return {
      data: {
        session: session ? "active" : "inactive",
      },
    };
  },

  async getActiveDataPolicy() {
    try {
      const { data, error } = await supabase
        .from("data_policies")
        .select("pol_id, pol_description")
        .eq("pol_active", true)
        .order("pol_id", { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        return {
          data: {
            status: "Success",
            data: {
              pol_id: data.pol_id,
              pol_description: data.pol_description,
            },
          },
        };
      }
    } catch (error) {
      // fallback if table does not exist
    }

    return {
      data: {
        status: "Success",
        data: {
          pol_id: 1,
          pol_description:
            "Al iniciar sesión en el sistema de El Castillo Group SAS, usted acepta el tratamiento de sus datos personales de acuerdo con las leyes vigentes de protección de datos personales de la República de Colombia (Ley 1581 de 2012) y sus decretos reglamentarios. Sus datos serán utilizados exclusivamente para la gestión administrativa, contractual y operativa al interior de la empresa.",
        },
      },
    };
  },

  getUserProfile(authUserId: string) {
    return supabase
      .from("users")
      .select("*, profiles(*)")
      .eq("auth_user_id", authUserId)
      .single();
  },

  async changePassword({ password, oldPassword }: { password: string; oldPassword: string }) {
    // Re-authenticate first to verify the current password (prevents unauthorized changes)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) throw new Error('No hay sesión activa.');

    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });
    if (reAuthError) throw new Error('La contraseña actual es incorrecta.');

    return supabase.auth.updateUser({ password });
  },
};

export default AuthSupabaseService;
