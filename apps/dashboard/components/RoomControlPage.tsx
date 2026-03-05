
import React, { useState, useEffect, useRef } from 'react';
import { 
  Key, Calendar, ChevronDown, Filter, AlertTriangle, 
  CheckCircle2, Clock, Search, MoreVertical, LogOut, LogIn,
  Settings, Zap, BarChart3, RotateCcw, Plus, Package, 
  FileText, XCircle, History, Edit2, Layout, Layers, ShieldAlert,
  Percent
} from 'lucide-react';
import { Room, RoomAlert, RoomAssignment, InventoryItem, RoomDashboardSettings, RoomTicket } from '../types';
import RoomControlService from '../RoomControlService';
import RoomTicketModal from './RoomTicketModal';
import RoomAssignmentModal from './RoomAssignmentModal';
import AddRoomModal from './AddRoomModal';
import RoomInventoryModal from './RoomInventoryModal';
import RoomRankingsModal from './RoomRankingsModal';
import RoomHistoryModal from './RoomHistoryModal';
import WarehouseModal from './WarehouseModal';
import RoomTypesModal from './RoomTypesModal';
import DashboardConfigModal from './DashboardConfigModal';
import OperationalAlertsModal from './OperationalAlertsModal';
import Avatar from './Avatar';
import { getStoredUser } from '../session';

const RoomControlPage: React.FC = () => {
  const sessionUser = getStoredUser();
  const studioId = sessionUser?.std_id ? String(sessionUser.std_id) : '';
  const [rooms, setRooms] = useState<Room[]>([]);
  const [alerts, setAlerts] = useState<RoomAlert[]>([]);
  const [occupancyStats, setOccupancyStats] = useState({ total_active: 0, occupied: 0, available: 0, maintenance: 0, percentage: 0 });
  const [selectedShift, setSelectedShift] = useState('MORNING');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState('ALL');
  
  // Dashboard Settings State
  const [dashboardSettings, setDashboardSettings] = useState<RoomDashboardSettings>({
    visibleColumns: { type: true, floor: true, status: true, assignment: true, occupancy: true, inventoryValue: false },
    compactMode: false,
    defaultFilter: 'ALL'
  });

  // Modals State
  const [ticketModal, setTicketModal] = useState<{ isOpen: boolean, room?: Room, type?: 'DELIVERY' | 'RETURN', existingTicket?: RoomTicket | null }>({ isOpen: false });
  const [assignModal, setAssignModal] = useState<{ isOpen: boolean, room?: Room }>({ isOpen: false });
  const [roomModal, setRoomModal] = useState<{ isOpen: boolean, room?: Room }>({ isOpen: false });
  const [inventoryModal, setInventoryModal] = useState<{ isOpen: boolean, room?: Room }>({ isOpen: false });
  const [rankingsModal, setRankingsModal] = useState(false);
  const [historyModal, setHistoryModal] = useState<{ isOpen: boolean, room?: Room }>({ isOpen: false });
  const [warehouseModal, setWarehouseModal] = useState(false);
  const [roomTypesModal, setRoomTypesModal] = useState(false);
  const [configModal, setConfigModal] = useState(false);
  const [alertsModal, setAlertsModal] = useState(false);

  // Context Menu State
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load Data
  const loadData = async () => {
    const [roomsData, alertsData, statsData] = await Promise.all([
      RoomControlService.getRooms({ date: selectedDate, shift: selectedShift, studioId }),
      RoomControlService.getAlerts(),
      RoomControlService.getOccupancyStats(selectedDate, selectedShift)
    ]);
    setRooms(roomsData);
    setAlerts(alertsData);
    setOccupancyStats(statsData);
  };

  useEffect(() => {
    loadData();
  }, [selectedDate, selectedShift]);

  // Click outside listener for context menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Handlers ---

  const handleSaveRoom = (roomData: Partial<Room>) => {
    if (roomData.id) {
        RoomControlService.updateRoom(roomData.id, roomData).then(() => loadData());
    } else {
        RoomControlService.createRoom(roomData).then(() => loadData());
    }
  };

  const handleUpdateInventory = (roomId: string, items: InventoryItem[]) => {
    RoomControlService.updateRoom(roomId, { inventory: items }).then(() => loadData());
  };

  const handleAssignmentSubmit = (newAssignment: any) => {
    if (!assignModal.room) return;
    RoomControlService.createAssignment({
        ...newAssignment,
        status: 'ACTIVE'
    }).then(() => {
        loadData();
        setAssignModal({ isOpen: false });
    });
  };

  const handleTicketSubmit = (ticket: RoomTicket) => {
      if (!ticketModal.room) return;
      loadData();
      setTicketModal({ isOpen: false });
  };

  const handleContextMenuAction = async (action: string, room: Room) => {
      setActiveMenu(null);
      if (action === 'details') { setHistoryModal({ isOpen: true, room }); }
      if (action === 'inventory') setInventoryModal({ isOpen: true, room });
      
      if (action === 'ticket_delivery' || action === 'ticket_return') {
          if (room.current_assignment) {
              const tickets = await RoomControlService.getTicketsByAssignment(room.current_assignment.id);
              const type = action === 'ticket_delivery' ? 'DELIVERY' : 'RETURN';
              const existing = tickets.find(t => t.type === type);
              setTicketModal({ isOpen: true, room, type, existingTicket: existing || null });
          }
      }
      
      if (action === 'cancel') {
          if (confirm('¿Cancelar asignación actual?')) {
              RoomControlService.updateRoom(room.id, { current_assignment: undefined }).then(() => loadData());
          }
      }
      if (action === 'edit') {
          setRoomModal({ isOpen: true, room });
      }
  };

  // --- Render Helpers ---

  const getStatusColor = (status: string, assignment?: RoomAssignment) => {
    if (status === 'MAINTENANCE') return 'bg-slate-100 border-slate-200 text-slate-400 opacity-80';
    if (assignment?.status === 'ACTIVE') return 'bg-amber-50 border-amber-200 text-amber-900 shadow-amber-500/10 shadow-lg';
    return 'bg-white border-slate-200 text-slate-600 hover:border-amber-200'; 
  };

  const filteredRooms = rooms.filter(r => {
    if (filterType === 'ALL') return true;
    if (filterType === 'AVAILABLE') return !r.current_assignment || r.current_assignment.status === 'COMPLETED';
    if (filterType === 'OCCUPIED') return r.current_assignment?.status === 'ACTIVE';
    return true;
  });

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* 1. Header with Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <div className="p-2 bg-slate-900 text-amber-400 rounded-xl shadow-lg"><Key size={24} /></div>
             Control de Cuartos
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">Gestión operativa de espacios, inventarios y turnos en tiempo real.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
            <button onClick={() => setAlertsModal(true)} className="p-3 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 text-red-500 transition-all flex-1 md:flex-none justify-center flex" title="Alertas Operativas">
                <ShieldAlert size={20} />
            </button>
            <button onClick={() => setConfigModal(true)} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-all flex-1 md:flex-none justify-center flex" title="Configurar Tablero">
                <Layout size={20} />
            </button>
            <button onClick={() => setRoomTypesModal(true)} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-all flex-1 md:flex-none justify-center flex" title="Tipos de Habitación">
                <Layers size={20} />
            </button>
            <button onClick={() => setWarehouseModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-600 transition-all">
                <Package size={16} /> Almacén
            </button>
            <button 
                onClick={() => setRoomModal({ isOpen: true })}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-[#0B1120] font-black rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 text-[10px] uppercase tracking-widest"
            >
                <Plus size={16} /> Agregar Cuarto
            </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
         
         {/* 2. Main Grid (Rooms) */}
         <div className="flex-1 w-full space-y-6">
            
            {/* OCCUPANCY SUMMARY KPIs (Always Visible) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex flex-col items-center justify-center p-2 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Activos</span>
                    <span className="text-xl font-black text-slate-900">{occupancyStats.total_active}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 bg-amber-50 rounded-xl">
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Ocupados</span>
                    <span className="text-xl font-black text-amber-700">{occupancyStats.occupied}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 bg-emerald-50 rounded-xl">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Disponibles</span>
                    <span className="text-xl font-black text-emerald-700">{occupancyStats.available}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 bg-slate-100 rounded-xl opacity-70">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mantenimiento</span>
                    <span className="text-xl font-black text-slate-600">{occupancyStats.maintenance}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 bg-indigo-50 rounded-xl col-span-2 md:col-span-1">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-1"><Percent size={10} /> Ocupación</span>
                    <div className="relative flex items-center justify-center w-12 h-12">
                       <svg className="w-full h-full transform -rotate-90">
                          <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-indigo-200" />
                          <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={113} strokeDashoffset={113 - (113 * occupancyStats.percentage) / 100} className="text-indigo-600 transition-all duration-1000" />
                       </svg>
                       <span className="absolute text-xs font-black text-indigo-800">{occupancyStats.percentage}%</span>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-2 rounded-2xl border border-slate-100 shadow-sm gap-4">
               {/* Shift Selector */}
               <div className="flex items-center gap-3 px-3 py-1 bg-slate-50 rounded-xl w-full md:w-auto">
                    <Calendar size={16} className="text-slate-400" />
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-transparent border-none text-xs font-bold outline-none flex-1 md:flex-none" />
                    <div className="h-4 w-px bg-slate-300"></div>
                    <select value={selectedShift} onChange={e => setSelectedShift(e.target.value)} className="bg-transparent text-[10px] font-black uppercase outline-none flex-1 md:flex-none">
                        <option value="MORNING">Mañana</option>
                        <option value="AFTERNOON">Tarde</option>
                        <option value="NIGHT">Noche</option>
                    </select>
               </div>

               <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
                  <button onClick={() => setFilterType('ALL')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterType === 'ALL' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Todas</button>
                  <button onClick={() => setFilterType('AVAILABLE')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterType === 'AVAILABLE' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Disp.</button>
                  <button onClick={() => setFilterType('OCCUPIED')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterType === 'OCCUPIED' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Ocup.</button>
               </div>
            </div>

            {/* Room Cards Grid */}
            <div className={`grid gap-4 ${dashboardSettings.compactMode ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'}`}>
               {filteredRooms.map(room => {
                  const assign = room.current_assignment;
                  const isActiveAssignment = assign?.status === 'ACTIVE';
                  
                  return (
                    <div 
                      key={room.id} 
                      className={`relative rounded-[24px] border transition-all group ${getStatusColor(room.status, assign)} ${dashboardSettings.compactMode ? 'p-4' : 'p-6'}`}
                    >
                       <div className="flex justify-between items-start mb-3">
                          <div>
                             <h3 className={`${dashboardSettings.compactMode ? 'text-lg' : 'text-2xl'} font-black tracking-tight`}>{room.code}</h3>
                             {dashboardSettings.visibleColumns.type && <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">{room.type}</p>}
                          </div>
                          {room.status === 'MAINTENANCE' ? (
                              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                          ) : isActiveAssignment ? (
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          ) : (
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          )}
                       </div>

                       {isActiveAssignment && assign ? (
                          <div className={`bg-white/60 rounded-2xl backdrop-blur-sm border border-white/50 mb-4 animate-in fade-in slide-in-from-bottom-2 ${dashboardSettings.compactMode ? 'p-2' : 'p-4'}`}>
                             <div className="flex items-center gap-3">
                                <Avatar name={assign.model_name} src={assign.model_avatar} size={dashboardSettings.compactMode ? "xs" : "sm"} />
                                <div className="overflow-hidden">
                                   <p className="text-xs font-bold text-slate-800 leading-none truncate">{assign.model_name}</p>
                                   {!dashboardSettings.compactMode && <p className="text-[9px] text-slate-500 uppercase tracking-wide mt-1">Modelo</p>}
                                </div>
                             </div>
                          </div>
                       ) : (
                          <div className={`flex items-center justify-center text-slate-300 font-bold text-xs uppercase tracking-widest border-2 border-dashed border-slate-200/50 rounded-2xl mb-4 group-hover:border-slate-300 transition-colors ${dashboardSettings.compactMode ? 'h-12' : 'h-24'}`}>
                             {room.status === 'ACTIVE' ? 'Disponible' : 'No Asignable'}
                          </div>
                       )}

                       {/* Actions */}
                       <div className="flex gap-2 relative">
                          {isActiveAssignment ? (
                             <button 
                               onClick={() => {
                                   if (room.current_assignment) {
                                       handleContextMenuAction('ticket_return', room); 
                                   }
                               }}
                               className="flex-1 py-2 bg-slate-900 text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10"
                             >
                                <LogOut size={12} /> Recibir
                             </button>
                          ) : (
                             <button 
                               disabled={room.status !== 'ACTIVE'}
                               onClick={() => setAssignModal({ isOpen: true, room })}
                               className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-amber-500 hover:text-amber-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                             >
                                <LogIn size={12} /> Asignar
                             </button>
                          )}
                          
                          {/* Context Menu Button */}
                          <div className="relative">
                              <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenu(activeMenu === room.id ? null : room.id);
                                }}
                                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all"
                              >
                                <MoreVertical size={16} />
                              </button>

                              {/* Dropdown Menu */}
                              {activeMenu === room.id && (
                                  <div ref={menuRef} className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 overflow-hidden animate-in zoom-in-95 origin-bottom-right">
                                      <div className="p-1.5 space-y-0.5">
                                          <button onClick={() => handleContextMenuAction('inventory', room)} className="w-full text-left px-3 py-2.5 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-2">
                                              <Package size={14} /> Inventario
                                          </button>
                                          {isActiveAssignment && (
                                              <>
                                                <button onClick={() => handleContextMenuAction('ticket_delivery', room)} className="w-full text-left px-3 py-2.5 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-2">
                                                    <FileText size={14} /> Ticket Entrega
                                                </button>
                                                <button onClick={() => handleContextMenuAction('ticket_return', room)} className="w-full text-left px-3 py-2.5 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-2">
                                                    <LogOut size={14} /> Ticket Recibo
                                                </button>
                                                <button onClick={() => handleContextMenuAction('cancel', room)} className="w-full text-left px-3 py-2.5 hover:bg-red-50 text-red-500 rounded-xl text-xs font-bold flex items-center gap-2">
                                                    <XCircle size={14} /> Cancelar Asig.
                                                </button>
                                              </>
                                          )}
                                          <button onClick={() => handleContextMenuAction('details', room)} className="w-full text-left px-3 py-2.5 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-2">
                                              <History size={14} /> Historial
                                          </button>
                                          <button onClick={() => handleContextMenuAction('edit', room)} className="w-full text-left px-3 py-2.5 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-2">
                                              <Edit2 size={14} /> Editar Cuarto
                                          </button>
                                      </div>
                                  </div>
                              )}
                          </div>
                       </div>
                    </div>
                  );
               })}
            </div>
         </div>

         {/* 3. Sidebar (Alerts & Rankings) - Hidden on mobile, visible on XL */}
         <div className="hidden xl:block w-80 space-y-6 shrink-0">
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">
               <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                     <AlertTriangle size={16} className="text-red-500" /> Alertas
                  </h3>
                  <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{alerts.length}</span>
               </div>
               <div className="p-4 space-y-3">
                  {alerts.map(alert => (
                     <div key={alert.id} className="p-4 rounded-2xl bg-red-50 border border-red-100">
                        <div className="flex justify-between items-start mb-1">
                           <span className="px-2 py-0.5 bg-white text-red-600 text-[8px] font-black uppercase tracking-widest rounded border border-red-100">{alert.severity}</span>
                           <span className="text-[9px] text-red-400 font-medium">{alert.timestamp}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 leading-snug">{alert.message}</p>
                     </div>
                  ))}
               </div>
            </div>

            <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
               <h3 className="text-lg font-black tracking-tight mb-6 relative z-10">Desempeño Turno</h3>
               
               <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                     <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Tickets Cerrados</span>
                     <span className="text-xl font-black text-emerald-400">24</span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden"><div className="w-3/4 h-full bg-emerald-500"></div></div>
                  
                  <div className="flex items-center justify-between pt-2">
                     <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Incidentes</span>
                     <span className="text-xl font-black text-amber-400">2</span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden"><div className="w-1/4 h-full bg-amber-500"></div></div>
               </div>

               <button 
                onClick={() => setRankingsModal(true)}
                className="w-full mt-8 py-3 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
               >
                  <BarChart3 size={14} /> Ver Rankings
               </button>
            </div>
         </div>
      </div>

      {/* --- MODALS --- */}

      {ticketModal.isOpen && ticketModal.room && (
         <RoomTicketModal 
            isOpen={ticketModal.isOpen} 
            onClose={() => setTicketModal({ isOpen: false })}
            room={ticketModal.room}
            assignment={ticketModal.room.current_assignment!}
            type={ticketModal.type || 'RETURN'} 
            existingTicket={ticketModal.existingTicket}
            onSubmit={handleTicketSubmit}
         />
      )}

      {assignModal.isOpen && assignModal.room && (
         <RoomAssignmentModal
            isOpen={assignModal.isOpen}
            onClose={() => setAssignModal({ isOpen: false })}
            room={assignModal.room}
            selectedDate={selectedDate}
            selectedShift={selectedShift}
            onSubmit={handleAssignmentSubmit}
         />
      )}

      {roomModal.isOpen && (
          <AddRoomModal 
            isOpen={roomModal.isOpen}
            onClose={() => setRoomModal({ isOpen: false })}
            existingRoom={roomModal.room}
            onSave={handleSaveRoom}
          />
      )}

      {inventoryModal.isOpen && inventoryModal.room && (
          <RoomInventoryModal 
            isOpen={inventoryModal.isOpen}
            onClose={() => setInventoryModal({ isOpen: false })}
            room={inventoryModal.room}
            onUpdate={(items) => handleUpdateInventory(inventoryModal.room!.id, items)}
          />
      )}

      {historyModal.isOpen && historyModal.room && (
          <RoomHistoryModal
            isOpen={historyModal.isOpen}
            onClose={() => setHistoryModal({ isOpen: false })}
            room={historyModal.room}
          />
      )}

      <WarehouseModal isOpen={warehouseModal} onClose={() => setWarehouseModal(false)} />
      <RoomTypesModal isOpen={roomTypesModal} onClose={() => setRoomTypesModal(false)} />
      <DashboardConfigModal isOpen={configModal} onClose={() => setConfigModal(false)} settings={dashboardSettings} onSave={setDashboardSettings} />
      <RoomRankingsModal isOpen={rankingsModal} onClose={() => setRankingsModal(false)} />
      <OperationalAlertsModal isOpen={alertsModal} onClose={() => setAlertsModal(false)} />

    </div>
  );
};

export default RoomControlPage;
