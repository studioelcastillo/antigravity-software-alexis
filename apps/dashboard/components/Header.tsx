
import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, Bell, ChevronDown, PanelLeft, User, Shield, LogOut, ExternalLink, Settings, Cake, Calendar, ArrowRight, Users as UsersIcon, Clock } from 'lucide-react';
import BirthdayService from '../BirthdayService';
import AttendanceService from '../AttendanceService';
import { BirthdayUser, OnSitePresence } from '../types';
import Avatar from './Avatar';
import { getStoredUser } from '../session';

interface HeaderProps {
  toggleSidebar: () => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  onLogoutClick: () => void;
  onUserSelect?: (userId: number) => void;
  onNavigate?: (page: string) => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isCollapsed, toggleCollapse, onLogoutClick, onUserSelect, onNavigate }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isBirthdayOpen, setIsBirthdayOpen] = useState(false);
  const [isPresenceOpen, setIsPresenceOpen] = useState(false);
  
  const [todaysBirthdays, setTodaysBirthdays] = useState<BirthdayUser[]>([]);
  const [monthBirthdays, setMonthBirthdays] = useState<BirthdayUser[]>([]);
  const [activeStaff, setActiveStaff] = useState<OnSitePresence[]>([]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const birthdayRef = useRef<HTMLDivElement>(null);
  const presenceRef = useRef<HTMLDivElement>(null);

  const userData = getStoredUser();
  const userName = userData?.user_name || 'Usuario';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bdayAll, presenceAll] = await Promise.all([
          BirthdayService.getBirthdays(),
          AttendanceService.getOnSitePresence()
        ]);
        
        setTodaysBirthdays(bdayAll.filter(u => u.isToday));
        const currentMonth = new Date().getMonth();
        setMonthBirthdays(bdayAll.filter(u => new Date(u.nextBirthday).getMonth() === currentMonth));
        setActiveStaff(presenceAll);
      } catch (error) {
        console.error("Error fetching header data", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
      if (birthdayRef.current && !birthdayRef.current.contains(event.target as Node)) setIsBirthdayOpen(false);
      if (presenceRef.current && !presenceRef.current.contains(event.target as Node)) setIsPresenceOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navegación segura que cierra estados de UI
  const handleProtectedNavigate = (id: string) => {
      setIsBirthdayOpen(false);
      setIsPresenceOpen(false);
      setIsDropdownOpen(false);
      if (onNavigate) onNavigate(id);
  };

  return (
    <header className="sticky top-0 z-[100] bg-white/90 backdrop-blur-xl border-b border-slate-200/60 transition-all">
      <div className="flex items-center justify-between h-16 md:h-20 px-4 md:px-8 relative">
        <div className="flex items-center gap-4">
          <button onClick={toggleSidebar} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl lg:hidden transition-all active:scale-95">
            <Menu size={22} />
          </button>
          <button onClick={toggleCollapse} className="hidden lg:flex p-2.5 -ml-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all">
            <PanelLeft size={20} className={isCollapsed ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
          <div className="hidden md:flex items-center text-slate-400 bg-slate-50/50 rounded-xl px-4 py-2.5 w-72 border border-transparent focus-within:border-amber-200 focus-within:bg-white focus-within:shadow-md transition-all group ml-2">
            <Search size={18} className="mr-3 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
            <input type="text" placeholder="Buscar..." className="bg-transparent border-none outline-none text-sm w-full text-slate-700 font-medium" />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          
          {/* PRESENCE COUNTER */}
          <div className="relative" ref={presenceRef}>
            <button 
                onClick={() => setIsPresenceOpen(!isPresenceOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${activeStaff.length > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}
            >
                <UsersIcon size={20} />
                <span className="text-xs font-black">{activeStaff.length}</span>
                <div className="hidden md:block text-[9px] font-black uppercase tracking-widest ml-1">En Sede</div>
            </button>

            {isPresenceOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 p-2 animate-in fade-in slide-in-from-top-2 z-50">
                    <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personal en Sede Hoy</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-1 space-y-1 custom-scrollbar">
                        {activeStaff.map(person => (
                            <button 
                                key={person.user_id} 
                                onClick={() => { onUserSelect?.(person.user_id); setIsPresenceOpen(false); }}
                                className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-all group text-left"
                            >
                                <Avatar name={person.full_name} src={person.photo_url} size="xs" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-700 truncate group-hover:text-amber-600 transition-colors">{person.full_name}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{person.role} • {person.location}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-emerald-600 flex items-center gap-1"><Clock size={10}/> {person.check_in_time}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="p-2 border-t border-slate-50">
                        <button onClick={() => handleProtectedNavigate('asistencia')} className="w-full py-2.5 bg-slate-900 text-amber-400 text-[10px] font-black uppercase rounded-xl hover:bg-black transition-all">Ver Monitor de Asistencia</button>
                    </div>
                </div>
            )}
          </div>

          {/* BIRTHDAY DROPDOWN */}
          <div className="relative" ref={birthdayRef}>
            <button onClick={() => setIsBirthdayOpen(!isBirthdayOpen)} className={`relative p-2 rounded-xl transition-all group ${todaysBirthdays.length > 0 ? 'text-pink-600 bg-pink-50' : 'text-slate-400 hover:bg-slate-50'}`}>
              <Cake size={20} className={todaysBirthdays.length > 0 ? 'animate-bounce-slow' : ''} />
              {todaysBirthdays.length > 0 && <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-pink-600 text-[9px] font-bold text-white ring-2 ring-white">{todaysBirthdays.length}</span>}
            </button>
            {isBirthdayOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 animate-in fade-in slide-in-from-top-2 z-50 overflow-hidden">
                 <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Calendar size={12} /> Cumpleaños Mes</p>
                    <span className="text-[9px] font-black text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full uppercase">{new Date().toLocaleString('es-ES', { month: 'long' })}</span>
                 </div>
                 <div className="max-h-64 overflow-y-auto p-1 custom-scrollbar">
                    {monthBirthdays.map(user => (
                        <button key={user.userId} onClick={() => { onUserSelect?.(user.userId); setIsBirthdayOpen(false); }} className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left mb-1 ${user.isToday ? 'bg-pink-50 hover:bg-pink-100' : 'hover:bg-slate-50'}`}>
                           <Avatar name={user.fullName} src={user.profilePhotoUrl} size="sm" />
                           <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate ${user.isToday ? 'text-pink-700' : 'text-slate-700'}`}>{user.fullName}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{user.roleName} • {user.isToday ? '¡Hoy!' : `Día ${new Date(user.nextBirthday).getDate()}`}</p>
                           </div>
                        </button>
                    ))}
                    {monthBirthdays.length === 0 && (
                        <div className="py-10 text-center text-slate-300">
                            <Cake size={24} className="mx-auto mb-2 opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Sin cumpleaños este mes</p>
                        </div>
                    )}
                 </div>
                 <div className="p-2 border-t border-slate-50 bg-slate-50/30">
                    <button 
                        onClick={() => handleProtectedNavigate('cumpleanos')} 
                        className="w-full py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-amber-400 hover:text-amber-600 transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                        Ver Calendario Completo <ArrowRight size={12} />
                    </button>
                 </div>
              </div>
            )}
          </div>

          <button className="relative p-2 text-slate-400 hover:bg-slate-50 hover:text-amber-500 rounded-xl transition-all">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full border-2 border-white shadow-sm"></span>
          </button>
          
          <div className="h-6 md:h-8 w-px bg-slate-200 mx-1 md:mx-2 hidden sm:block"></div>

          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-3 group py-1 px-1 rounded-xl hover:bg-slate-50 transition-all">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-black text-slate-800 group-hover:text-amber-600 transition-colors">{userName}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{userData?.prof_name || 'Admin'}</span>
              </div>
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-slate-900 flex items-center justify-center text-amber-400 shadow-lg overflow-hidden">
                {userData?.image ? <img src={userData.image} alt="P" className="w-full h-full object-cover" /> : <span className="font-black text-xs">{userName.charAt(0)}</span>}
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 animate-in fade-in slide-in-from-top-2 z-50">
                <div className="px-4 py-3 border-b border-slate-50">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cuenta Activa</p>
                   <p className="text-xs font-bold text-slate-600 truncate mt-1">{userData?.user_email || '...'}</p>
                </div>
                <div className="p-1.5 space-y-0.5">
                  <button
                    onClick={() => handleProtectedNavigate('myprofile')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl transition-all group"
                  >
                    <User size={18} className="text-slate-400 group-hover:text-amber-500" />
                    <span className="text-sm font-bold">Mi Perfil</span>
                  </button>
                  <button
                    onClick={() => handleProtectedNavigate('change_password')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl transition-all group"
                  >
                    <Shield size={18} className="text-slate-400 group-hover:text-amber-500" />
                    <span className="text-sm font-bold">Seguridad</span>
                  </button>
                  <button className="w-full flex items-center justify-between px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl transition-all group"><div className="flex items-center gap-3"><Settings size={18} className="text-slate-400 group-hover:text-amber-500" /><span className="text-sm font-bold">Ajustes</span></div><ExternalLink size={14} className="text-slate-300" /></button>
                </div>
                <div className="p-1.5 mt-1 border-t border-slate-50"><button onClick={() => { setIsDropdownOpen(false); onLogoutClick(); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all group"><LogOut size={18} className="group-hover:scale-110 transition-transform" /><span className="text-sm font-black uppercase tracking-widest">Cerrar Sesión</span></button></div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-amber-500 text-[#0B1120] px-4 py-1 relative overflow-hidden">
        <p className="text-[10px] font-black tracking-[0.3em] text-center uppercase relative z-10">• MODO DE PRUEBAS ACTIVO •</p>
      </div>
    </header>
  );
};

export default Header;
