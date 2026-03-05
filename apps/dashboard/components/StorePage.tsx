
import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag, Search, Filter, ShoppingCart, Plus, Minus,
  Trash2, CreditCard, User, Building2, Calendar, CheckCircle2,
  Package, Box, TrendingUp, FileText, AlertCircle, History,
  Truck, Wallet, X, ChevronRight, Store, LayoutGrid
} from 'lucide-react';
import StoreService from '../StoreService';
import { getStoredUser } from '../session';
import { StoreProduct, StoreCategory, StoreOrder, InventoryLot, PurchaseOrder, InstallmentPlan, Requisition, CostCenter, User as UserType } from '../types';

const getSessionUser = () => {
  const u = getStoredUser();
  return {
    id: u?.user_id ?? u?.id ?? null,
    name: `${u?.user_name ?? ''} ${u?.user_surname ?? ''}`.trim() || 'Usuario',
  };
};

const StorePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CATALOG' | 'CART' | 'ORDERS' | 'INVENTORY' | 'FINANCE'>('CATALOG');
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [cart, setCart] = useState<{product: StoreProduct, qty: number}[]>([]);
  const [loading, setLoading] = useState(false);

  // Checkout State
  const sessionUser = getSessionUser();
  const [selectedUser, setSelectedUser] = useState<number | null>(sessionUser.id);
  const [selectedUserName, setSelectedUserName] = useState<string>(sessionUser.name);
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'PAYROLL' | 'LOAN'>('CASH');
  const [installments, setInstallments] = useState(1);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);

  // Backoffice State
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [loans, setLoans] = useState<InstallmentPlan[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);

  useEffect(() => {
    loadCatalog();
    loadBackoffice();
  }, []);

  const loadCatalog = async () => {
    setLoading(true);
    const [p, c, cc] = await Promise.all([
        StoreService.getProducts(),
        StoreService.getCategories(),
        StoreService.getCostCenters()
    ]);
    setProducts(p);
    setCategories(c);
    setCostCenters(cc);
    setLoading(false);
  };

  const loadBackoffice = async () => {
      const [inv, l, r] = await Promise.all([
          StoreService.getInventory(),
          StoreService.getLoans(),
          StoreService.getRequisitions()
      ]);
      setLots(inv.lots);
      setLoans(l);
      setRequisitions(r);
  };

  const addToCart = (product: StoreProduct) => {
      setCart(prev => {
          const existing = prev.find(i => i.product.id === product.id);
          if (existing) {
              if (existing.qty + 1 > product.total_stock) {
                  alert("No hay más stock disponible");
                  return prev;
              }
              return prev.map(i => i.product.id === product.id ? {...i, qty: i.qty + 1} : i);
          }
          return [...prev, { product, qty: 1 }];
      });
  };

  const removeFromCart = (id: string) => {
      setCart(prev => prev.filter(i => i.product.id !== id));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price_base * item.qty), 0);

  const handleCheckout = async () => {
      if (!selectedUser || !selectedCostCenter) return alert("Selecciona usuario y centro de costos");

      try {
           const buyer_name = selectedUserName || sessionUser.name;
           await StoreService.checkout({
               buyer_user_id: selectedUser,
               buyer_name: buyer_name,
              cost_center_id: selectedCostCenter,
              payment_method: paymentMethod,
              items: cart.map(i => ({
                  product_id: i.product.id,
                  variant_id: i.product.variants[0]?.id || '', // Default to first variant
                  product_name: i.product.name,
                  variant_name: i.product.variants[0]?.name || 'Default', // Default to first variant
                  qty: i.qty,
                  unit_price: i.product.price_base,
                  total: i.product.price_base * i.qty
              })),
              total_amount: cartTotal
          }, { periods: installments }); // 5% Interest for Loan is handled in service

          alert("¡Pedido procesado con éxito!");
          setCart([]);
          setActiveTab('ORDERS');
          loadCatalog(); // Refresh stock
          loadBackoffice(); // Refresh loans/logs
      } catch (e: any) {
          alert("Error: " + e.message);
      }
  };

  const handleRequisition = async (productName: string) => {
      const reason = prompt("Describe la urgencia y motivo:");
      if (!reason) return;
      const u = getStoredUser();
      await StoreService.createRequisition({
          user_id: u?.user_id ?? u?.id ?? 0,
          user_name: `${u?.user_name ?? ''} ${u?.user_surname ?? ''}`.trim() || 'Usuario',
          product_name: productName,
          qty: 1,
          urgency: 'MEDIUM'
      });
      alert("Solicitud creada. Contabilidad ha sido notificada.");
      loadBackoffice();
  };

  // --- RENDER HELPERS ---

  const renderCatalog = () => (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(p => (
              <div key={p.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-lg transition-all group flex flex-col h-full">
                  <div className="h-48 bg-slate-100 relative overflow-hidden">
                      <img src={p.images[0]?.url_medium} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-3 right-3">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                              p.status === 'IN_STOCK' ? 'bg-emerald-500 text-white' :
                              p.status === 'LOW_STOCK' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                          }`}>
                              {p.status === 'IN_STOCK' ? 'Disponible' : p.status === 'LOW_STOCK' ? 'Poco Stock' : 'Agotado'}
                          </span>
                      </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-slate-900 leading-tight">{p.name}</h4>
                            <p className="text-xs font-black text-slate-500 text-right shrink-0">${(p.price_base/1000).toFixed(0)}k</p>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-4">{p.description_short}</p>
                      </div>

                      {p.total_stock > 0 ? (
                          <button
                            onClick={() => addToCart(p)}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95"
                          >
                              <Plus size={14} /> Agregar
                          </button>
                      ) : (
                          <button
                            onClick={() => handleRequisition(p.name)}
                            className="w-full py-3 bg-white border-2 border-amber-500 text-amber-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-amber-50 transition-all"
                          >
                              Solicitar
                          </button>
                      )}
                  </div>
              </div>
          ))}
      </div>
  );

  const renderCart = () => (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
              {cart.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                          <img src={item.product.images[0]?.url_thumb} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                          <h4 className="font-bold text-slate-900">{item.product.name}</h4>
                          <p className="text-xs text-slate-500">${item.product.price_base.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                          <span className="text-sm font-bold bg-slate-100 px-3 py-1 rounded-lg">x{item.qty}</span>
                          <button onClick={() => removeFromCart(item.product.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                  </div>
              ))}
              {cart.length === 0 && (
                  <div className="py-20 text-center text-slate-400 bg-slate-50 rounded-3xl border-dashed border-2 border-slate-200">
                      <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                      <p>Tu carrito está vacío</p>
                  </div>
              )}
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl h-fit">
              <h3 className="text-lg font-black text-slate-900 mb-6">Resumen de Orden</h3>

              <div className="space-y-4 mb-6">
                  <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Comprador</label>
                      <div className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700">
                        {selectedUserName || sessionUser.name}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">Comprando como el usuario autenticado</p>
                  </div>
                  <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Centro de Costos</label>
                      <select
                        className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 outline-none"
                        onChange={(e) => setSelectedCostCenter(e.target.value)}
                      >
                          <option value="">Seleccionar CC...</option>
                          {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Método de Pago</label>
                      <div className="grid grid-cols-3 gap-2">
                          {['CASH', 'PAYROLL', 'LOAN'].map(m => (
                              <button
                                key={m}
                                onClick={() => setPaymentMethod(m as any)}
                                className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${paymentMethod === m ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
                              >
                                  {m === 'CASH' ? 'Contado' : m === 'PAYROLL' ? 'Nómina' : 'Crédito'}
                              </button>
                          ))}
                      </div>
                  </div>

                  {(paymentMethod === 'PAYROLL' || paymentMethod === 'LOAN') && (
                      <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 animate-in fade-in">
                          <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest block mb-2">Cuotas / Plazo</label>
                          <div className="flex items-center gap-3">
                              <input
                                type="range" min="1" max="12"
                                value={installments}
                                onChange={e => setInstallments(Number(e.target.value))}
                                className="flex-1 accent-amber-500"
                              />
                              <span className="font-black text-amber-900 w-8">{installments}m</span>
                          </div>
                          {paymentMethod === 'LOAN' && <p className="text-[10px] text-amber-600 mt-2 font-bold">+ 5% Interés Mensual</p>}
                      </div>
                  )}
              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-between items-center mb-6">
                  <span className="text-sm font-bold text-slate-500">Total a Pagar</span>
                  <span className="text-2xl font-black text-slate-900">${cartTotal.toLocaleString()}</span>
              </div>

              <button
                disabled={cart.length === 0}
                onClick={handleCheckout}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
              >
                  Confirmar Orden
              </button>
          </div>
      </div>
  );

  const renderInventory = () => (
      <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Inventario</h4>
                  <p className="text-2xl font-black text-slate-900">
                      ${lots.reduce((acc, l) => acc + (l.current_qty * l.unit_cost), 0).toLocaleString()}
                  </p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lotes Activos (FIFO)</h4>
                  <p className="text-2xl font-black text-slate-900">{lots.filter(l => l.current_qty > 0).length}</p>
              </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                  <h3 className="font-black text-slate-900 flex items-center gap-2">
                      <Box size={20} className="text-slate-400" /> Kardex de Lotes (FIFO)
                  </h3>
              </div>
              <table className="w-full text-left">
                  <thead className="bg-slate-50">
                      <tr>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lote ID</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Ingreso</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Costo Unit.</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Stock</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                      {lots.map(lot => {
                          const prod = products.find(p => p.id === lot.product_variant_id); // Assuming simple match for mock, usually lookup via variant
                          return (
                              <tr key={lot.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{lot.id}</td>
                                  <td className="px-6 py-4 text-sm font-bold text-slate-800">{prod?.name || 'Unknown'}</td>
                                  <td className="px-6 py-4 text-xs font-medium text-slate-500">{new Date(lot.received_at).toLocaleDateString()}</td>
                                  <td className="px-6 py-4 text-right font-mono text-xs text-slate-600">${lot.unit_cost.toLocaleString()}</td>
                                  <td className="px-6 py-4 text-center">
                                      <span className={`px-2 py-1 rounded text-xs font-bold ${lot.current_qty > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                          {lot.current_qty} / {lot.initial_qty}
                                      </span>
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      </div>
  );

  const renderFinance = () => (
      <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                  <h3 className="text-lg font-black mb-6">Cartera de Préstamos Activa</h3>
                  <div className="grid grid-cols-3 gap-8">
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Prestado</p>
                          <p className="text-3xl font-black text-amber-400">${loans.reduce((acc, l) => acc + l.total_amount, 0).toLocaleString()}</p>
                      </div>
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Intereses Proyectados</p>
                          <p className="text-3xl font-black text-emerald-400">${loans.reduce((acc, l) => acc + (l.monthly_payment * l.term_months - l.total_amount), 0).toLocaleString()}</p>
                      </div>
                  </div>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                  <h3 className="font-black text-slate-900">Planes de Pago & Nómina</h3>
              </div>
              <table className="w-full text-left">
                  <thead className="bg-slate-50">
                      <tr>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan ID</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Empleado</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Monto</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Cuota Mes</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Progreso</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                      {loans.map(loan => (
                          <tr key={loan.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{loan.id}</td>
                              <td className="px-6 py-4 text-sm font-bold text-slate-800">{loan.user_name}</td>
                              <td className="px-6 py-4 text-right font-mono text-xs text-slate-600">${loan.total_amount.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right font-mono text-xs font-black text-slate-900">${loan.monthly_payment.toLocaleString()}</td>
                              <td className="px-6 py-4 text-center">
                                  <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold">{loan.term_months} Meses</span>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <Store size={32} className="text-amber-500" /> Tienda & Inventario
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">Gestión integral de compras, ventas internas y almacén.</p>
        </div>

        {/* NAV PILLS */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            {[
                { id: 'CATALOG', label: 'Catálogo', icon: LayoutGrid },
                { id: 'CART', label: `Carrito (${cart.reduce((a,b)=>a+b.qty,0)})`, icon: ShoppingCart },
                { id: 'INVENTORY', label: 'Almacén FIFO', icon: Box },
                { id: 'FINANCE', label: 'Finanzas', icon: Wallet },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                    <tab.icon size={14} /> {tab.label}
                </button>
            ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="min-h-[600px]">
          {activeTab === 'CATALOG' && renderCatalog()}
          {activeTab === 'CART' && renderCart()}
          {activeTab === 'INVENTORY' && renderInventory()}
          {activeTab === 'FINANCE' && renderFinance()}
      </div>

    </div>
  );
};

export default StorePage;
