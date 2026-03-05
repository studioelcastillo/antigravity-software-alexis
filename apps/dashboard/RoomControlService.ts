import { supabase } from './supabaseClient';
import {
  Room,
  RoomAssignment,
  RoomTicket,
  RoomAlert,
  UserRanking,
  WarehouseItem,
  WarehouseMovement,
  RoomType,
  InventoryItem,
  SystemAlert,
  RankingFilterParams,
  StockMovementType,
} from './types';
import { getStoredUser } from './session';

const DEFAULT_STUDIO_ID = 1;
const getStudioId = () => Number(getStoredUser()?.std_id || DEFAULT_STUDIO_ID);

const toNumber = (value: any) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const formatRelativeMinutes = (dateValue?: string) => {
  if (!dateValue) return '0 min';
  const date = new Date(dateValue).getTime();
  const diff = Math.max(Date.now() - date, 0);
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `${hours} h`;
};

const loadUsersMap = async (userIds: number[]) => {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map<number, any>();

  const { data } = await supabase
    .from('users')
    .select('user_id, user_name, user_surname, user_photo_url, prof_id')
    .in('user_id', uniqueIds);

  const map = new Map<number, any>();
  (data || []).forEach((row: any) => {
    map.set(row.user_id, row);
  });
  return map;
};

const resolveRoomTypeId = async (typeName: string | undefined, stdId: number) => {
  const trimmed = (typeName || '').trim();
  if (!trimmed) return null;

  const { data } = await supabase
    .from('room_types')
    .select('room_type_id')
    .ilike('room_type_name', trimmed)
    .eq('std_id', stdId)
    .limit(1)
    .maybeSingle();

  if (data?.room_type_id) return data.room_type_id;

  const { data: created } = await supabase
    .from('room_types')
    .insert([
      {
        std_id: stdId,
        room_type_name: trimmed,
        room_type_description: null,
        room_type_active: true,
      },
    ])
    .select('room_type_id')
    .single();

  return created?.room_type_id || null;
};

const mapInventory = (row: any): InventoryItem => ({
  id: String(row.room_inventory_id),
  warehouse_item_id: row.warehouse_item_id ? String(row.warehouse_item_id) : undefined,
  name: row.item_name,
  qty: toNumber(row.item_qty),
  unit_cost: toNumber(row.unit_cost),
  condition: row.item_condition || 'OK',
});

const mapWarehouseItem = (row: any): WarehouseItem => ({
  id: String(row.warehouse_item_id),
  name: row.item_name,
  category: row.item_category || 'General',
  brand: row.item_brand || undefined,
  model: row.item_model || undefined,
  unit_cost: toNumber(row.unit_cost),
  currency: row.currency || 'COP',
  stock_qty: toNumber(row.stock_qty),
  is_active: row.is_active !== false,
  serial_required: row.serial_required === true,
  updated_at: row.updated_at || row.created_at || new Date().toISOString(),
});

const mapWarehouseMovement = (row: any, roomCodeMap: Map<number, string>): WarehouseMovement => ({
  id: String(row.warehouse_move_id),
  item_id: String(row.warehouse_item_id),
  item_name: row.item_name || row.warehouse_items?.item_name || 'Item',
  type: row.movement_type,
  qty: toNumber(row.movement_qty),
  unit_cost_snapshot: toNumber(row.unit_cost_snapshot),
  related_room_code: row.related_stdroom_id ? roomCodeMap.get(row.related_stdroom_id) : undefined,
  date: row.created_at || new Date().toISOString(),
  user: row.user_name || row.users?.user_name || 'Sistema',
  notes: row.movement_notes || '',
});

const RoomControlService = {
  async getRooms(filters: { date: string; shift: string; studioId: string }): Promise<Room[]> {
    const stdId = Number(filters?.studioId) || getStudioId();
    const { data: roomsData, error } = await supabase
      .from('studios_rooms')
      .select(
        'stdroom_id, std_id, stdroom_code, stdroom_name, stdroom_floor, stdroom_status, stdroom_notes, stdroom_incidents_count, stdroom_active, stdroom_occupied, room_type_id, room_type:room_types(room_type_id, room_type_name)'
      )
      .eq('std_id', stdId)
      .order('stdroom_consecutive', { ascending: true })
      .order('stdroom_name', { ascending: true });

    if (error) {
      console.error('RoomControl getRooms error', error);
      return [];
    }

    const roomIds = (roomsData || []).map((row: any) => row.stdroom_id).filter(Boolean);
    const { data: inventoryRows } = roomIds.length
      ? await supabase.from('room_inventory').select('*').in('stdroom_id', roomIds)
      : { data: [] };

    const inventoryByRoom = new Map<number, InventoryItem[]>();
    (inventoryRows || []).forEach((row: any) => {
      const list = inventoryByRoom.get(row.stdroom_id) || [];
      list.push(mapInventory(row));
      inventoryByRoom.set(row.stdroom_id, list);
    });

    let assignmentQuery = supabase
      .from('room_assignments')
      .select('*')
      .eq('std_id', stdId);

    if (filters?.shift) {
      assignmentQuery = assignmentQuery.eq('shift_type', filters.shift);
    }

    if (filters?.date) {
      assignmentQuery = assignmentQuery
        .lte('assign_date', filters.date)
        .or(`assign_end_date.is.null,assign_end_date.gte.${filters.date}`);
    }

    const { data: assignmentRows } = await assignmentQuery;
    const userIds = (assignmentRows || [])
      .flatMap((row: any) => [row.user_id_model, row.user_id_monitor])
      .filter(Boolean);
    const userMap = await loadUsersMap(userIds);

    const assignmentByRoom = new Map<number, RoomAssignment>();
    (assignmentRows || []).forEach((row: any) => {
      const model = userMap.get(row.user_id_model);
      const monitor = userMap.get(row.user_id_monitor);
      const assignment: RoomAssignment = {
        id: String(row.room_assign_id),
        room_id: String(row.stdroom_id),
        model_id: row.user_id_model,
        model_name:
          row.model_name || `${model?.user_name || ''} ${model?.user_surname || ''}`.trim(),
        model_avatar: model?.user_photo_url || undefined,
        monitor_id: row.user_id_monitor,
        monitor_name:
          row.monitor_name || `${monitor?.user_name || ''} ${monitor?.user_surname || ''}`.trim(),
        date: row.assign_date,
        shift: row.shift_type,
        status: row.assign_status,
        created_at: row.created_at || new Date().toISOString(),
        isRange: row.assign_is_range || false,
        endDate: row.assign_end_date || undefined,
      };

      const current = assignmentByRoom.get(row.stdroom_id);
      if (!current || assignment.status === 'ACTIVE') {
        assignmentByRoom.set(row.stdroom_id, assignment);
      }
    });

    return (roomsData || []).map((row: any) => {
      const assignment = assignmentByRoom.get(row.stdroom_id);
      const status = row.stdroom_status || (row.stdroom_active ? 'ACTIVE' : 'INACTIVE');
      return {
        id: String(row.stdroom_id),
        code: row.stdroom_code || row.stdroom_name || `Room-${row.stdroom_id}`,
        type: row.room_type?.room_type_name || row.stdroom_name || 'Standard',
        floor: row.stdroom_floor || undefined,
        status,
        notes: row.stdroom_notes || undefined,
        inventory: inventoryByRoom.get(row.stdroom_id) || [],
        incidents_count: row.stdroom_incidents_count || 0,
        current_assignment: assignment,
      } as Room;
    });
  },

  async getRoomDetails(roomId: string): Promise<Room | undefined> {
    const { data, error } = await supabase
      .from('studios_rooms')
      .select('*')
      .eq('stdroom_id', Number(roomId))
      .single();

    if (error || !data) {
      console.error('RoomControl getRoomDetails error', error);
      return undefined;
    }

    const { data: inventoryRows } = await supabase
      .from('room_inventory')
      .select('*')
      .eq('stdroom_id', data.stdroom_id);

    return {
      id: String(data.stdroom_id),
      code: data.stdroom_code || data.stdroom_name || `Room-${data.stdroom_id}`,
      type: data.stdroom_name || 'Standard',
      floor: data.stdroom_floor || undefined,
      status: data.stdroom_status || 'ACTIVE',
      notes: data.stdroom_notes || undefined,
      inventory: (inventoryRows || []).map(mapInventory),
      incidents_count: data.stdroom_incidents_count || 0,
    } as Room;
  },

  async createRoom(roomData: Partial<Room>): Promise<Room> {
    const stdId = getStudioId();
    const roomTypeId = roomData.type ? await resolveRoomTypeId(roomData.type, stdId) : null;
    const payload = {
      std_id: stdId,
      stdroom_code: roomData.code,
      stdroom_name: roomData.code,
      stdroom_floor: roomData.floor,
      stdroom_status: roomData.status || 'ACTIVE',
      stdroom_notes: roomData.notes || null,
      stdroom_incidents_count: roomData.incidents_count || 0,
      room_type_id: roomTypeId,
      stdroom_active: roomData.status !== 'INACTIVE',
      stdroom_occupied: false,
    };

    const { data, error } = await supabase
      .from('studios_rooms')
      .insert([payload])
      .select('*')
      .single();

    if (error || !data) {
      throw new Error('No se pudo crear el cuarto');
    }

    return {
      id: String(data.stdroom_id),
      code: data.stdroom_code || data.stdroom_name,
      type: roomData.type || 'Standard',
      floor: data.stdroom_floor || undefined,
      status: data.stdroom_status || 'ACTIVE',
      notes: data.stdroom_notes || undefined,
      inventory: [],
      incidents_count: data.stdroom_incidents_count || 0,
    } as Room;
  },

  async updateRoom(roomId: string, updates: Partial<Room>): Promise<Room | undefined> {
    const stdId = getStudioId();
    const roomTypeId = updates.type ? await resolveRoomTypeId(updates.type, stdId) : null;

    if (updates.inventory) {
      await supabase.from('room_inventory').delete().eq('stdroom_id', Number(roomId));

      if (updates.inventory.length > 0) {
        const payload = updates.inventory.map((item) => ({
          stdroom_id: Number(roomId),
          warehouse_item_id: item.warehouse_item_id ? Number(item.warehouse_item_id) : null,
          item_name: item.name,
          item_qty: item.qty,
          unit_cost: item.unit_cost,
          item_condition: item.condition,
        }));
        await supabase.from('room_inventory').insert(payload);
      }
    }

    if ('current_assignment' in updates && updates.current_assignment === undefined) {
      await supabase
        .from('room_assignments')
        .update({ assign_status: 'COMPLETED', assign_end_date: new Date().toISOString().split('T')[0] })
        .eq('stdroom_id', Number(roomId))
        .eq('assign_status', 'ACTIVE');

      await supabase
        .from('studios_rooms')
        .update({ stdroom_occupied: false })
        .eq('stdroom_id', Number(roomId));
    }

    const payload = {
      stdroom_code: updates.code,
      stdroom_floor: updates.floor,
      stdroom_status: updates.status,
      stdroom_notes: updates.notes,
      stdroom_incidents_count: updates.incidents_count,
      room_type_id: roomTypeId || undefined,
      stdroom_active: updates.status ? updates.status !== 'INACTIVE' : undefined,
    };

    const { data, error } = await supabase
      .from('studios_rooms')
      .update(payload)
      .eq('stdroom_id', Number(roomId))
      .select('*')
      .single();

    if (error || !data) {
      console.error('RoomControl updateRoom error', error);
      return undefined;
    }

    return {
      id: String(data.stdroom_id),
      code: data.stdroom_code || data.stdroom_name,
      type: updates.type || data.stdroom_name || 'Standard',
      floor: data.stdroom_floor || undefined,
      status: data.stdroom_status || 'ACTIVE',
      notes: data.stdroom_notes || undefined,
      inventory: updates.inventory || [],
      incidents_count: data.stdroom_incidents_count || 0,
    } as Room;
  },

  async removeItemFromRoom(roomId: string, itemId: string): Promise<boolean> {
    const numericId = Number(itemId);
    if (!Number.isFinite(numericId)) return true;
    const { error } = await supabase.from('room_inventory').delete().eq('room_inventory_id', numericId);
    if (error) {
      console.error('RoomControl removeItemFromRoom error', error);
      throw new Error('No se pudo eliminar el item');
    }
    return true;
  },

  async getWarehouseItems(): Promise<WarehouseItem[]> {
    const { data, error } = await supabase
      .from('warehouse_items')
      .select('*')
      .order('item_name', { ascending: true });

    if (error) {
      console.error('RoomControl getWarehouseItems error', error);
      return [];
    }

    return (data || []).map(mapWarehouseItem);
  },

  async createWarehouseItem(item: Partial<WarehouseItem>): Promise<WarehouseItem> {
    const payload = {
      std_id: getStudioId(),
      item_name: item.name,
      item_category: item.category || 'General',
      item_brand: item.brand || null,
      item_model: item.model || null,
      unit_cost: item.unit_cost || 0,
      currency: item.currency || 'COP',
      stock_qty: item.stock_qty || 0,
      is_active: item.is_active !== false,
      serial_required: item.serial_required === true,
    };

    const { data, error } = await supabase
      .from('warehouse_items')
      .insert([payload])
      .select('*')
      .single();

    if (error || !data) {
      throw new Error('No se pudo crear el item');
    }

    if (data.stock_qty > 0) {
      await supabase.from('warehouse_movements').insert([
        {
          warehouse_item_id: data.warehouse_item_id,
          movement_type: 'PURCHASE_IN',
          movement_qty: data.stock_qty,
          unit_cost_snapshot: data.unit_cost,
          movement_notes: 'Stock inicial al crear item',
          movement_user_id: getStoredUser()?.user_id || null,
        },
      ]);
    }

    return mapWarehouseItem(data);
  },

  async updateWarehouseItem(id: string, data: Partial<WarehouseItem>): Promise<WarehouseItem> {
    const payload = {
      item_name: data.name,
      item_category: data.category,
      item_brand: data.brand,
      item_model: data.model,
      unit_cost: data.unit_cost,
      currency: data.currency,
      is_active: data.is_active,
      serial_required: data.serial_required,
      updated_at: new Date().toISOString(),
    };

    const { data: row, error } = await supabase
      .from('warehouse_items')
      .update(payload)
      .eq('warehouse_item_id', Number(id))
      .select('*')
      .single();

    if (error || !row) {
      throw new Error('No se pudo actualizar el item');
    }

    return mapWarehouseItem(row);
  },

  async adjustStock(
    itemId: string,
    movement: { type: StockMovementType; qty: number; notes: string; unit_cost?: number }
  ): Promise<{ item: WarehouseItem | null; movement: WarehouseMovement | null }> {
    const { data: itemRow } = await supabase
      .from('warehouse_items')
      .select('*')
      .eq('warehouse_item_id', Number(itemId))
      .single();

    if (!itemRow) {
      throw new Error('Item no encontrado');
    }

    let newStock = toNumber(itemRow.stock_qty);
    const qty = Math.abs(movement.qty);

    if (['ASSIGN', 'LOST', 'DAMAGED', 'RETURN'].includes(movement.type)) {
      if (movement.type === 'RETURN') {
        newStock += qty;
      } else {
        if (newStock < qty) {
          throw new Error(`Stock insuficiente (${newStock}) para realizar esta operacion.`);
        }
        newStock -= qty;
      }
    } else if (movement.type === 'ADJUSTMENT') {
      if (newStock + movement.qty < 0) {
        throw new Error('El ajuste resultaria en stock negativo.');
      }
      newStock += movement.qty;
    } else if (movement.type === 'PURCHASE_IN') {
      newStock += qty;
    }

    const { data: updated, error } = await supabase
      .from('warehouse_items')
      .update({ stock_qty: newStock, updated_at: new Date().toISOString() })
      .eq('warehouse_item_id', Number(itemId))
      .select('*')
      .single();

    if (error) {
      throw new Error('No se pudo actualizar el stock');
    }

    const { data: moveRow } = await supabase
      .from('warehouse_movements')
      .insert([
        {
          warehouse_item_id: Number(itemId),
          movement_type: movement.type,
          movement_qty: qty,
          unit_cost_snapshot: movement.unit_cost || itemRow.unit_cost,
          movement_notes: movement.notes,
          movement_user_id: getStoredUser()?.user_id || null,
        },
      ])
      .select('*')
      .single();

    return {
      item: updated ? mapWarehouseItem(updated) : null,
      movement: moveRow ? mapWarehouseMovement(moveRow, new Map()) : null,
    };
  },

  async getItemMovements(itemId: string): Promise<WarehouseMovement[]> {
    const { data, error } = await supabase
      .from('warehouse_movements')
      .select('*, warehouse_items(item_name), users(user_name)')
      .eq('warehouse_item_id', Number(itemId))
      .order('created_at', { ascending: false });

    if (error) {
      console.error('RoomControl getItemMovements error', error);
      return [];
    }

    const roomIds = (data || []).map((row: any) => row.related_stdroom_id).filter(Boolean);
    const { data: rooms } = roomIds.length
      ? await supabase
          .from('studios_rooms')
          .select('stdroom_id, stdroom_code, stdroom_name')
          .in('stdroom_id', roomIds)
      : { data: [] };

    const roomCodeMap = new Map<number, string>(
      (rooms || []).map((row: any) => [row.stdroom_id, row.stdroom_code || row.stdroom_name])
    );

    return (data || []).map((row: any) =>
      mapWarehouseMovement(
        {
          ...row,
          item_name: row.warehouse_items?.item_name,
          user_name: row.users?.user_name,
        },
        roomCodeMap
      )
    );
  },

  async assignToRoom(roomId: string, itemId: string, qty: number): Promise<boolean> {
    const { data: itemRow } = await supabase
      .from('warehouse_items')
      .select('*')
      .eq('warehouse_item_id', Number(itemId))
      .single();

    if (!itemRow) {
      throw new Error('Item no encontrado');
    }
    const currentStock = toNumber(itemRow.stock_qty);
    if (currentStock < qty) {
      throw new Error('Stock insuficiente en almacen');
    }

    await supabase
      .from('warehouse_items')
      .update({ stock_qty: currentStock - qty, updated_at: new Date().toISOString() })
      .eq('warehouse_item_id', Number(itemId));

    await supabase.from('warehouse_movements').insert([
      {
        warehouse_item_id: Number(itemId),
        movement_type: 'ASSIGN',
        movement_qty: qty,
        unit_cost_snapshot: itemRow.unit_cost,
        related_stdroom_id: Number(roomId),
        movement_notes: 'Asignado a habitacion',
        movement_user_id: getStoredUser()?.user_id || null,
      },
    ]);

    const { data: existing } = await supabase
      .from('room_inventory')
      .select('*')
      .eq('stdroom_id', Number(roomId))
      .eq('warehouse_item_id', Number(itemId))
      .maybeSingle();

    if (existing?.room_inventory_id) {
      await supabase
        .from('room_inventory')
        .update({ item_qty: toNumber(existing.item_qty) + qty })
        .eq('room_inventory_id', existing.room_inventory_id);
    } else {
      await supabase.from('room_inventory').insert([
        {
          stdroom_id: roomId,
          warehouse_item_id: itemId,
          item_name: itemRow.item_name,
          item_qty: qty,
          unit_cost: itemRow.unit_cost,
          item_condition: 'OK',
        },
      ]);
    }

    return true;
  },

  async createAssignment(data: Partial<RoomAssignment>): Promise<RoomAssignment> {
    const payload = {
      std_id: getStudioId(),
      stdroom_id: data.room_id ? Number(data.room_id) : null,
      user_id_model: data.model_id || null,
      user_id_monitor: data.monitor_id || null,
      model_name: data.model_name,
      monitor_name: data.monitor_name,
      model_avatar_url: data.model_avatar,
      assign_date: data.date,
      shift_type: data.shift,
      assign_status: data.status || 'SCHEDULED',
      assign_notes: data.isRange ? `Rango hasta ${data.endDate}` : null,
      assign_is_range: data.isRange || false,
      assign_end_date: data.endDate || null,
    };

    const { data: row, error } = await supabase
      .from('room_assignments')
      .insert([payload])
      .select('*')
      .single();

    if (error || !row) {
      throw new Error('No se pudo crear la asignacion');
    }

    if (payload.assign_status === 'ACTIVE' && data.room_id) {
      await supabase
        .from('studios_rooms')
        .update({ stdroom_occupied: true })
        .eq('stdroom_id', Number(data.room_id));
    }

    return {
      id: String(row.room_assign_id),
      room_id: String(row.stdroom_id),
      model_id: row.user_id_model,
      model_name: row.model_name || data.model_name || '',
      model_avatar: row.model_avatar_url || data.model_avatar,
      monitor_id: row.user_id_monitor,
      monitor_name: row.monitor_name || data.monitor_name || '',
      date: row.assign_date,
      shift: row.shift_type,
      status: row.assign_status,
      created_at: row.created_at || new Date().toISOString(),
      isRange: row.assign_is_range || false,
      endDate: row.assign_end_date || undefined,
    } as RoomAssignment;
  },

  async createTicket(data: Partial<RoomTicket>): Promise<RoomTicket> {
    const ticketId = data.id ? Number(data.id) : null;
    let row: any;

    if (ticketId) {
      const { data: updated } = await supabase
        .from('room_tickets')
        .update({
          room_assign_id: data.assignment_id ? Number(data.assignment_id) : null,
          stdroom_id: data.room_id ? Number(data.room_id) : null,
          ticket_type: data.type,
          ticket_status: data.status,
          ticket_notes: data.notes,
          rating_model_to_monitor: data.rating_model_to_monitor,
          rating_monitor_to_model: data.rating_monitor_to_model,
          signed_by_model: data.signed_by_model,
          signed_by_monitor: data.signed_by_monitor,
          updated_at: new Date().toISOString(),
        })
        .eq('room_ticket_id', ticketId)
        .select('*')
        .single();
      row = updated;
    } else {
      const { data: inserted } = await supabase
        .from('room_tickets')
        .insert([
          {
            room_assign_id: data.assignment_id ? Number(data.assignment_id) : null,
            stdroom_id: data.room_id ? Number(data.room_id) : null,
            ticket_type: data.type,
            ticket_status: data.status,
            ticket_notes: data.notes,
            rating_model_to_monitor: data.rating_model_to_monitor,
            rating_monitor_to_model: data.rating_monitor_to_model,
            signed_by_model: data.signed_by_model,
            signed_by_monitor: data.signed_by_monitor,
          },
        ])
        .select('*')
        .single();
      row = inserted;
    }

    if (!row) {
      throw new Error('No se pudo guardar el ticket');
    }

    await supabase.from('room_ticket_items').delete().eq('room_ticket_id', row.room_ticket_id);
    const checklist = data.checklist || [];
    if (checklist.length > 0) {
      await supabase.from('room_ticket_items').insert(
        checklist.map((item) => ({
          room_ticket_id: row.room_ticket_id,
          room_inventory_id: Number(item.id) || null,
          warehouse_item_id: item.warehouse_item_id ? Number(item.warehouse_item_id) : null,
          item_name: item.name,
          item_qty: item.qty,
          unit_cost: item.unit_cost,
          item_condition: item.condition,
        }))
      );
    }

    return {
      id: String(row.room_ticket_id),
      assignment_id: String(row.room_assign_id),
      room_id: String(row.stdroom_id),
      type: row.ticket_type,
      status: row.ticket_status,
      checklist,
      notes: row.ticket_notes || undefined,
      rating_model_to_monitor: row.rating_model_to_monitor || undefined,
      rating_monitor_to_model: row.rating_monitor_to_model || undefined,
      signed_by_model: row.signed_by_model,
      signed_by_monitor: row.signed_by_monitor,
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
    } as RoomTicket;
  },

  async getTicketsByAssignment(assignmentId: string): Promise<RoomTicket[]> {
    const { data: ticketRows, error } = await supabase
      .from('room_tickets')
      .select('*')
      .eq('room_assign_id', Number(assignmentId))
      .order('created_at', { ascending: false });

    if (error) {
      console.error('RoomControl getTicketsByAssignment error', error);
      return [];
    }

    const ticketIds = (ticketRows || []).map((row: any) => row.room_ticket_id);
    const { data: itemRows } = ticketIds.length
      ? await supabase.from('room_ticket_items').select('*').in('room_ticket_id', ticketIds)
      : { data: [] };

    const itemsByTicket = new Map<number, InventoryItem[]>();
    (itemRows || []).forEach((row: any) => {
      const list = itemsByTicket.get(row.room_ticket_id) || [];
      list.push({
        id: String(row.room_ticket_item_id),
        warehouse_item_id: row.warehouse_item_id ? String(row.warehouse_item_id) : undefined,
        name: row.item_name,
        qty: toNumber(row.item_qty),
        unit_cost: toNumber(row.unit_cost),
        condition: row.item_condition || 'OK',
      });
      itemsByTicket.set(row.room_ticket_id, list);
    });

    return (ticketRows || []).map((row: any) => ({
      id: String(row.room_ticket_id),
      assignment_id: String(row.room_assign_id),
      room_id: String(row.stdroom_id),
      type: row.ticket_type,
      status: row.ticket_status,
      checklist: itemsByTicket.get(row.room_ticket_id) || [],
      notes: row.ticket_notes || undefined,
      rating_model_to_monitor: row.rating_model_to_monitor || undefined,
      rating_monitor_to_model: row.rating_monitor_to_model || undefined,
      signed_by_model: row.signed_by_model,
      signed_by_monitor: row.signed_by_monitor,
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
    } as RoomTicket));
  },

  async getRoomHistory(roomId: string): Promise<any[]> {
    const history: any[] = [];

    const { data: assignments } = await supabase
      .from('room_assignments')
      .select('room_assign_id, model_name, monitor_name, assign_date, shift_type, created_at')
      .eq('stdroom_id', Number(roomId))
      .order('created_at', { ascending: false })
      .limit(20);

    (assignments || []).forEach((row: any) => {
      history.push({
        id: `assign_${row.room_assign_id}`,
        type: 'ASSIGNMENT',
        description: `Asignado a ${row.model_name || 'Modelo'}`,
        date: row.created_at,
        user: row.monitor_name || 'Sistema',
      });
    });

    const { data: tickets } = await supabase
      .from('room_tickets')
      .select('room_ticket_id, ticket_type, ticket_status, created_at')
      .eq('stdroom_id', Number(roomId))
      .order('created_at', { ascending: false })
      .limit(20);

    (tickets || []).forEach((row: any) => {
      history.push({
        id: `ticket_${row.room_ticket_id}`,
        type: 'TICKET',
        description: `${row.ticket_type} (${row.ticket_status})`,
        date: row.created_at,
        user: 'Sistema',
      });
    });

    const { data: movements } = await supabase
      .from('warehouse_movements')
      .select('warehouse_move_id, movement_type, movement_qty, created_at')
      .eq('related_stdroom_id', Number(roomId))
      .order('created_at', { ascending: false })
      .limit(20);

    (movements || []).forEach((row: any) => {
      history.push({
        id: `inv_${row.warehouse_move_id}`,
        type: 'INVENTORY',
        description: `${row.movement_type} x${row.movement_qty}`,
        date: row.created_at,
        user: 'Sistema',
      });
    });

    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return history;
  },

  async getAlerts(): Promise<RoomAlert[]> {
    const { data, error } = await supabase
      .from('system_alerts')
      .select('system_alert_id, severity, message, created_at')
      .eq('alert_status', 'OPEN')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('RoomControl getAlerts error', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: String(row.system_alert_id),
      severity: row.severity || 'INFO',
      message: row.message,
      timestamp: formatRelativeMinutes(row.created_at),
    }));
  },

  async getSystemAlerts(status: 'OPEN' | 'RESOLVED' | 'ALL' = 'OPEN'): Promise<SystemAlert[]> {
    let query = supabase.from('system_alerts').select('*').order('created_at', { ascending: false });
    if (status && status !== 'ALL') {
      query = query.eq('alert_status', status);
    }
    const { data, error } = await query;

    if (error) {
      console.error('RoomControl getSystemAlerts error', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: String(row.system_alert_id),
      alert_type: row.alert_type,
      subject_user_id: row.subject_user_id,
      subject_name: row.subject_name || 'Usuario',
      subject_role: row.subject_role || 'MODELO',
      severity: row.severity || 'INFO',
      status: row.alert_status || 'OPEN',
      streak_count: row.streak_count || 0,
      message: row.message,
      metadata_json: row.metadata_json,
      created_at: row.created_at,
      resolved_at: row.resolved_at || undefined,
      resolved_by: row.resolved_by ? String(row.resolved_by) : undefined,
    }));
  },

  async resolveSystemAlert(alertId: string, resolution?: string): Promise<boolean> {
    const { error } = await supabase
      .from('system_alerts')
      .update({
        alert_status: 'RESOLVED',
        resolved_at: new Date().toISOString(),
        resolved_by: getStoredUser()?.user_id || null,
      })
      .eq('system_alert_id', Number(alertId));

    if (error) {
      console.error('RoomControl resolveSystemAlert error', error);
      throw new Error('No se pudo resolver la alerta');
    }
    return true;
  },

  async getOccupancyStats(date: string, shift: string) {
    const rooms = await this.getRooms({
      date,
      shift,
      studioId: String(getStudioId()),
    });
    const validRooms = rooms.filter((room) => room.status !== 'INACTIVE');
    const total_active = validRooms.length;
    const maintenance = validRooms.filter((room) => room.status === 'MAINTENANCE').length;
    const occupied = validRooms.filter((room) => room.current_assignment?.status === 'ACTIVE').length;
    const available = total_active - occupied - maintenance;
    const percentage = total_active - maintenance > 0
      ? Math.round((occupied / (total_active - maintenance)) * 100)
      : 0;
    return { total_active, occupied, available, maintenance, percentage };
  },

  async getOperationalRankings(params: RankingFilterParams): Promise<UserRanking[]> {
    const role = params?.role || 'MONITOR';
    const { data: ticketRows, error } = await supabase
      .from('room_tickets')
      .select('room_ticket_id, room_assign_id, rating_model_to_monitor, rating_monitor_to_model, created_at')
      .order('created_at', { ascending: false });

    if (error || !ticketRows || ticketRows.length === 0) {
      return [];
    }

    const { data: assignments } = await supabase
      .from('room_assignments')
      .select('room_assign_id, user_id_model, user_id_monitor, model_name, monitor_name')
      .in(
        'room_assign_id',
        ticketRows.map((row: any) => row.room_assign_id).filter(Boolean)
      );

    const roleKey = role === 'MONITOR' ? 'user_id_monitor' : 'user_id_model';
    const nameKey = role === 'MONITOR' ? 'monitor_name' : 'model_name';

    const userMap = new Map<number, UserRanking>();
    (assignments || []).forEach((assign: any) => {
      const userId = assign[roleKey];
      if (!userId) return;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          user_id: userId,
          name: assign[nameKey] || 'Usuario',
          role,
          score: 0,
          tickets_count: 0,
          disputes_count: 0,
          avg_rating: 0,
          incidents_count: 0,
          trend: 'neutral',
          bad_streak_current: 0,
        });
      }
    });

    const ratingKey = role === 'MONITOR' ? 'rating_model_to_monitor' : 'rating_monitor_to_model';
    const ratingTotals = new Map<number, { sum: number; count: number }>();
    (ticketRows || []).forEach((ticket: any) => {
      const assign = (assignments || []).find((a: any) => a.room_assign_id === ticket.room_assign_id);
      if (!assign) return;
      const userId = assign[roleKey];
      if (!userId) return;
      const entry = userMap.get(userId);
      if (!entry) return;
      entry.tickets_count += 1;
      const rating = toNumber(ticket[ratingKey]);
      if (!ratingTotals.has(userId)) ratingTotals.set(userId, { sum: 0, count: 0 });
      const agg = ratingTotals.get(userId);
      if (agg) {
        agg.sum += rating;
        agg.count += rating ? 1 : 0;
      }
    });

    userMap.forEach((value, key) => {
      const agg = ratingTotals.get(key);
      value.avg_rating = agg && agg.count ? Number((agg.sum / agg.count).toFixed(2)) : 0;
      value.score = Math.min(100, Math.round((value.avg_rating || 0) * 20));
    });

    return Array.from(userMap.values()).sort((a, b) => b.score - a.score);
  },

  async getRoomTypes(): Promise<RoomType[]> {
    const { data, error } = await supabase
      .from('room_types')
      .select('*')
      .order('room_type_name', { ascending: true });

    if (error) {
      console.error('RoomControl getRoomTypes error', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: String(row.room_type_id),
      name: row.room_type_name,
      description: row.room_type_description || '',
      is_active: row.room_type_active !== false,
    }));
  },

  async createRoomType(data: Partial<RoomType>): Promise<RoomType> {
    const { data: row, error } = await supabase
      .from('room_types')
      .insert([
        {
          std_id: getStudioId(),
          room_type_name: data.name,
          room_type_description: data.description || null,
          room_type_active: data.is_active !== false,
        },
      ])
      .select('*')
      .single();

    if (error || !row) {
      throw new Error('No se pudo crear el tipo de cuarto');
    }

    return {
      id: String(row.room_type_id),
      name: row.room_type_name,
      description: row.room_type_description || '',
      is_active: row.room_type_active !== false,
    } as RoomType;
  },

  async updateRoomType(id: string, data: Partial<RoomType>): Promise<RoomType | undefined> {
    const { data: row, error } = await supabase
      .from('room_types')
      .update({
        room_type_name: data.name,
        room_type_description: data.description,
        room_type_active: data.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('room_type_id', Number(id))
      .select('*')
      .single();

    if (error || !row) {
      throw new Error('No se pudo actualizar el tipo de cuarto');
    }

    return {
      id: String(row.room_type_id),
      name: row.room_type_name,
      description: row.room_type_description || '',
      is_active: row.room_type_active !== false,
    } as RoomType;
  },

  async deleteRoomType(id: string): Promise<boolean> {
    const { error } = await supabase.from('room_types').delete().eq('room_type_id', Number(id));
    if (error) {
      throw new Error('No se pudo eliminar el tipo de cuarto');
    }
    return true;
  },
};

export default RoomControlService;
