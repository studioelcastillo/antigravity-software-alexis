import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserProfile from "./UserProfile";
import UserService from "../UserService";
import { getStoredUser } from "../session";
import { User } from "../types";

const MyProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored?.user_id) {
      setLoading(false);
      return;
    }

    UserService.getUser(stored.user_id)
      .then((response) => {
        const data = response.data?.data?.[0];
        setUser((data || stored) as User);
      })
      .catch(() => {
        setUser(stored as User);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-slate-500 text-sm font-bold">Cargando perfil...</div>
    );
  }

  if (!user) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <p className="text-sm font-bold text-slate-500">
            No se encontro el usuario.
          </p>
        </div>
      </div>
    );
  }

  return (
    <UserProfile
      user={user}
      onBack={() => navigate("/dashboard")}
      onUpdate={(updated) => setUser(updated)}
    />
  );
};

export default MyProfilePage;
