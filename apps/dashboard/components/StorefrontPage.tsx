
import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag, Search, Filter, ShoppingCart, Plus, Minus,
  Trash2, X, ChevronRight, Star, Heart, CreditCard,
  Package, Truck, AlertCircle, CheckCircle2, ChevronLeft,
  LayoutGrid, List, Smartphone, User, Wallet, DollarSign, Calendar
} from 'lucide-react';
import StoreService from '../StoreService';
import { StoreProduct, StoreCategory, ProductVariant } from '../types';
import { getStoredUser } from '../session';

const StorefrontPage: React.FC = () => {
  // Data State
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);

  // UI State
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST' | 'COMPACT'>('GRID');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);

  // Loan Request Modal State
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);

  // Cart State
  const [cart, setCart] = useState<{product: StoreProduct, variant: ProductVariant, qty: number}[]>([]);

  // Checkout State
  const [checkoutStep, setCheckoutStep] = useState(1); // 1: Cart, 2: Payment, 3: Success
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'PAYROLL' | 'INSTALLMENTS'>('PAYROLL');
  const [installments, setInstallments] = useState(1);

  // User Context
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
      setCurrentUser(getStoredUser());
  }, []);

  // Initial Load
  useEffect(() => {
    const init = async () => {
      const [p, c] = await Promise.all([
        StoreService.getProducts(),
        StoreService.getCategories()
      ]);
      setProducts(p);
      setCategories(c);
    };
    init();
  }, []);

  // Filter Logic
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'ALL' || p.category_id === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, activeCategory]);

  // Cart Actions
  const addToCart = (product: StoreProduct, variant: ProductVariant, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.variant.id === variant.id);
      if (existing) {
        if (existing.qty + qty > variant.current_stock) {
            alert(`Solo quedan ${variant.current_stock} unidades de ${variant.name}.`);
            return prev;
        }
        return prev.map(i => i.variant.id === variant.id ? { ...i, qty: i.qty + qty } : i);
      }
      return [...prev, { product, variant, qty }];
    });
    setCartOpen(true);
  };

  const updateQty = (variantId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.variant.id === variantId) {
        const newQty = Math.max(1, i.qty + delta);
        if (newQty > i.variant.current_stock) return i;
        return { ...i, qty: newQty };
      }
      return i;
    }));
  };

  const removeItem = (variantId: string) => {
    setCart(prev => prev.filter(i => i.variant.id !== variantId));
  };

  const cartTotal = cart.reduce((acc, i) => acc + ((i.variant.price_override || i.product.price_base) * i.qty), 0);

  const handleCheckout = async () => {
    if (!currentUser) return alert("Error de sesión. Recarga la página.");

    try {
        await StoreService.checkout({
            buyer_user_id: currentUser.user_id,
            buyer_name: currentUser.user_name || 'Usuario',
            // Cost Center assigned automatically in backend logic (StoreService)
            payment_method: paymentMethod,
            items: cart.map(i => ({
                product_id: i.product.id,
                variant_id: i.variant.id,
                product_name: i.product.name,
                variant_name: i.variant.name,
                qty: i.qty,
                unit_price: i.variant.price_override || i.product.price_base,
                total: (i.variant.price_override || i.product.price_base) * i.qty,
                image_url: i.product.images[0]?.url_thumb
            })),
            subtotal: cartTotal,
            tax_total: 0,
            total_amount: cartTotal
        }, { periods: installments });

        setCheckoutStep(3); // Success Screen
        setCart([]);
    } catch (e: any) {
        alert(e.message || 'Error al procesar el pedido.');
    }
  };

  // --- COMPONENTS ---

  const ProductCard: React.FC<{ product: StoreProduct }> = ({ product }) => (
    <div
        className={`
            group bg-white border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex relative cursor-pointer
            ${viewMode === 'GRID' ? 'flex-col rounded-2xl md:rounded-[32px]' : viewMode === 'COMPACT' ? 'flex-col rounded-xl p-2' : 'flex-row rounded-2xl p-4 items-center gap-4 md:gap-6'}
        `}
        onClick={() => setSelectedProduct(product)}
    >
       {viewMode !== 'COMPACT' && (
           <div className="absolute top-3 left-3 md:top-4 md:left-4 z-10 flex flex-col gap-1 md:gap-2">
              {product.is_new && <span className="px-2 py-0.5 md:px-3 md:py-1 bg-slate-900 text-white text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg">Nuevo</span>}
              {product.status === 'LOW_STOCK' && <span className="px-2 py-0.5 md:px-3 md:py-1 bg-amber-500 text-white text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg">Poco Stock</span>}
              {product.status === 'OUT_OF_STOCK' && <span className="px-2 py-0.5 md:px-3 md:py-1 bg-red-500 text-white text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg">Agotado</span>}
           </div>
       )}

       <div className={`${viewMode === 'GRID' ? 'aspect-[4/5] w-full' : viewMode === 'COMPACT' ? 'aspect-square w-full rounded-lg' : 'w-24 h-24 md:w-32 md:h-32 rounded-xl'} overflow-hidden bg-slate-100 relative shrink-0`}>
          <img
            src={product.images[0]?.url_medium}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
       </div>

       <div className={`flex flex-col ${viewMode === 'GRID' ? 'p-3 md:p-5 flex-1' : viewMode === 'COMPACT' ? 'pt-2' : 'flex-1'}`}>
          <h3 className="text-xs md:text-sm font-bold text-slate-900 leading-tight mb-1">{product.name}</h3>

          {viewMode !== 'COMPACT' && <p className="text-[10px] md:text-xs text-slate-500 line-clamp-2 mb-2 md:mb-3">{product.description_short}</p>}

          <div className="mt-auto flex items-center justify-between">
             <span className="text-sm md:text-lg font-black text-slate-900">${product.price_base.toLocaleString()}</span>
             {viewMode === 'LIST' && (
                 <button className="px-4 py-2 md:px-6 md:py-2 bg-slate-900 text-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-black">
                     Ver Detalles
                 </button>
             )}
          </div>
       </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#F8FAFC]">

      {/* 1. STICKY HEADER */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200">
         <div className="max-w-[1600px] mx-auto px-4 py-3 md:px-8 md:h-20 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
            <div className="flex w-full md:w-auto justify-between items-center gap-4">
                <h1 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight">Tienda El Castillo</h1>
                <div className="flex md:hidden items-center gap-2">
                    <button
                        onClick={() => setIsLoanModalOpen(true)}
                        className="p-2 bg-emerald-100 text-emerald-700 rounded-lg active:scale-95"
                    >
                        <Wallet size={18} />
                    </button>
                    <button
                        onClick={() => setCartOpen(true)}
                        className="relative p-2 bg-slate-900 text-white rounded-lg active:scale-95"
                    >
                        <ShoppingBag size={18} />
                        {cart.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-900 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
                            {cart.reduce((a, b) => a + b.qty, 0)}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="flex-1 w-full md:max-w-xl relative">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <input
                 type="text"
                 placeholder="Buscar productos..."
                 className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-xl text-xs md:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
               />
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2">
                <button
                    onClick={() => setIsLoanModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 text-[10px] font-black uppercase tracking-widest"
                >
                    <Wallet size={16} /> Solicitar Préstamo
                </button>

                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setViewMode('GRID')} className={`p-2 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}><LayoutGrid size={18} /></button>
                    <button onClick={() => setViewMode('LIST')} className={`p-2 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}><List size={18} /></button>
                    <button onClick={() => setViewMode('COMPACT')} className={`p-2 rounded-lg transition-all ${viewMode === 'COMPACT' ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}><Smartphone size={18} /></button>
                </div>

                <button
                    onClick={() => setCartOpen(true)}
                    className="relative p-3 bg-slate-900 text-white rounded-xl hover:bg-black transition-all shadow-lg active:scale-95"
                >
                    <ShoppingBag size={20} />
                    {cart.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-900 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                        {cart.reduce((a, b) => a + b.qty, 0)}
                        </span>
                    )}
                </button>
            </div>
         </div>

         {/* Categories Chips */}
         <div className="max-w-[1600px] mx-auto px-4 md:px-8 pb-3 md:pb-4 flex gap-2 overflow-x-auto no-scrollbar pt-2 md:pt-0">
            <button
               onClick={() => setActiveCategory('ALL')}
               className={`px-4 py-1.5 md:px-5 md:py-2 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${activeCategory === 'ALL' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
            >
               Todos
            </button>
            {categories.map(cat => (
               <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-1.5 md:px-5 md:py-2 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${activeCategory === cat.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
               >
                  {cat.name}
               </button>
            ))}
         </div>
      </div>

      {/* 2. MAIN CONTENT */}
      <div className="max-w-[1600px] mx-auto p-4 md:p-8">
         <div className={`grid gap-3 md:gap-6 ${viewMode === 'GRID' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : viewMode === 'COMPACT' ? 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6' : 'grid-cols-1'}`}>
            {filteredProducts.map(p => (
               <ProductCard key={p.id} product={p} />
            ))}
         </div>
         {filteredProducts.length === 0 && (
            <div className="py-20 text-center text-slate-400">
               <Package size={48} className="mx-auto mb-4 opacity-20" />
               <p className="text-sm font-bold">No se encontraron productos.</p>
               <button onClick={() => {setActiveCategory('ALL'); setSearchQuery('');}} className="mt-4 text-amber-600 font-bold text-xs uppercase tracking-widest hover:underline">
                  Limpiar Filtros
               </button>
            </div>
         )}
      </div>

      {/* 3. PRODUCT DETAIL MODAL */}
      {selectedProduct && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setSelectedProduct(null)} />
            <div className="relative bg-white w-full max-w-5xl h-full md:h-[85vh] rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col md:flex-row">

               <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 md:top-6 md:right-6 z-20 p-2 bg-white/80 backdrop-blur rounded-full hover:bg-white transition-all shadow-sm">
                  <X size={24} />
               </button>

               {/* Gallery */}
               <div className="w-full md:w-1/2 bg-slate-100 relative h-64 md:h-full shrink-0">
                  <img
                     src={selectedProduct.images[0]?.url_original}
                     className="w-full h-full object-cover"
                     alt={selectedProduct.name}
                  />
                  <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 flex gap-2 overflow-x-auto max-w-[calc(100%-3rem)] no-scrollbar">
                     {selectedProduct.images.map((img, i) => (
                        <button key={i} className="w-12 h-12 md:w-16 md:h-16 rounded-xl border-2 border-white shadow-lg overflow-hidden flex-shrink-0 hover:scale-105 transition-transform">
                           <img src={img.url_thumb} className="w-full h-full object-cover" />
                        </button>
                     ))}
                  </div>
               </div>

               {/* Details */}
               <ProductDetailPane
                  product={selectedProduct}
                  categories={categories}
                  onAddToCart={addToCart}
                  onClose={() => setSelectedProduct(null)}
               />
            </div>
         </div>
      )}

      {/* 4. CART DRAWER */}
      {cartOpen && (
         <div className="fixed inset-0 z-[100] flex justify-end">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => setCartOpen(false)} />
            <div className="relative w-full md:max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

               {/* Cart Header */}
               <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-white z-10 sticky top-0">
                  <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Tu Carrito ({cart.reduce((a,b) => a+b.qty, 0)})</h3>
                  <button onClick={() => setCartOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={20} /></button>
               </div>

               {/* Cart Content or Success */}
               {checkoutStep === 3 ? (
                   <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in">
                       <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                           <CheckCircle2 size={48} />
                       </div>
                       <h3 className="text-2xl font-black text-slate-900 mb-2">¡Solicitud Enviada!</h3>
                       <p className="text-sm text-slate-500 mb-8">Tu pedido ha sido enviado a contabilidad. Recibirás una notificación cuando sea aprobado.</p>
                       <button
                          onClick={() => { setCheckoutStep(1); setCartOpen(false); }}
                          className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-all"
                       >
                           Seguir Comprando
                       </button>
                   </div>
               ) : (
                   <>
                       <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
                          {cart.length === 0 ? (
                             <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                                <ShoppingBag size={64} className="opacity-10" />
                                <p className="font-bold text-sm">Tu carrito está vacío</p>
                                <button onClick={() => setCartOpen(false)} className="text-amber-600 text-xs font-black uppercase tracking-widest hover:underline">Volver a la tienda</button>
                             </div>
                          ) : checkoutStep === 1 ? (
                             // Cart Items List
                             <div className="space-y-3 md:space-y-4">
                                {cart.map((item, idx) => (
                                   <div key={idx} className="flex gap-4 p-3 md:p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                      <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-xl overflow-hidden shrink-0 border border-slate-200">
                                         <img src={item.product.images[0]?.url_thumb} className="w-full h-full object-cover" />
                                      </div>
                                      <div className="flex-1 flex flex-col justify-between">
                                         <div>
                                            <h4 className="font-bold text-slate-900 text-xs md:text-sm line-clamp-1">{item.product.name}</h4>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.variant.name}</p>
                                         </div>
                                         <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-slate-500">${(item.variant.price_override || item.product.price_base).toLocaleString()}</span>
                                            <div className="flex items-center bg-white rounded-lg border border-slate-200 p-1">
                                               <button onClick={() => updateQty(item.variant.id, -1)} className="p-1 hover:bg-slate-100 rounded"><Minus size={12} /></button>
                                               <span className="w-6 md:w-8 text-center text-xs font-bold">{item.qty}</span>
                                               <button onClick={() => updateQty(item.variant.id, 1)} className="p-1 hover:bg-slate-100 rounded"><Plus size={12} /></button>
                                            </div>
                                            <button onClick={() => removeItem(item.variant.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                                         </div>
                                      </div>
                                   </div>
                                ))}
                             </div>
                          ) : (
                             // Payment Form
                             <div className="space-y-6 animate-in slide-in-from-right-4">
                                <div>
                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Método de Pago</label>
                                   <div className="grid grid-cols-2 gap-3">
                                      {['PAYROLL', 'CASH', 'INSTALLMENTS'].map(m => (
                                         <button
                                            key={m}
                                            onClick={() => setPaymentMethod(m as any)}
                                            className={`p-4 rounded-xl border text-left transition-all ${paymentMethod === m ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900 ring-offset-2' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                         >
                                            <span className="block text-[10px] font-black uppercase tracking-widest mb-1">
                                                {m === 'PAYROLL' ? 'Nómina' : m === 'CASH' ? 'Contado' : 'Cuotas'}
                                            </span>
                                            {m === 'INSTALLMENTS' && <span className="text-[9px] opacity-70 block">Financiado</span>}
                                         </button>
                                      ))}
                                   </div>
                                </div>

                                {(paymentMethod === 'PAYROLL' || paymentMethod === 'INSTALLMENTS') && (
                                   <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                                      <label className="text-[10px] font-black text-amber-800 uppercase tracking-widest block mb-4">Periodos a descontar</label>
                                      <div className="flex items-center gap-4">
                                         <input
                                            type="range" min="1" max="12" step="1"
                                            value={installments}
                                            onChange={(e) => setInstallments(Number(e.target.value))}
                                            className="flex-1 h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                                         />
                                         <span className="text-xl font-black text-amber-900 w-12 text-center">{installments}</span>
                                      </div>
                                      <div className="mt-4 flex justify-between text-xs font-bold text-amber-800 border-t border-amber-200 pt-3">
                                         <span>Cuota aprox:</span>
                                         <span>${Math.round(cartTotal / installments).toLocaleString()}/periodo</span>
                                      </div>
                                   </div>
                                )}

                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex gap-2 items-start">
                                    <AlertCircle size={16} className="text-slate-400 mt-0.5" />
                                    <p className="text-[10px] text-slate-500 leading-relaxed">
                                        Las compras financiadas o por nómina están sujetas a aprobación de contabilidad.
                                    </p>
                                </div>
                             </div>
                          )}
                       </div>

                       <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50 pb-safe">
                          <div className="flex justify-between items-center mb-4 text-sm font-bold text-slate-600">
                             <span>Subtotal</span>
                             <span>${cartTotal.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center mb-6 text-xl font-black text-slate-900">
                             <span>Total</span>
                             <span>${cartTotal.toLocaleString()}</span>
                          </div>

                          {checkoutStep === 1 ? (
                             <button
                                onClick={() => setCheckoutStep(2)}
                                disabled={cart.length === 0}
                                className="w-full py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-black transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                                Continuar Compra
                             </button>
                          ) : (
                             <div className="flex gap-3">
                                <button
                                   onClick={() => setCheckoutStep(1)}
                                   className="px-4 md:px-6 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl hover:bg-slate-50 transition-all"
                                >
                                   <ChevronLeft size={20} />
                                </button>
                                <button
                                   onClick={handleCheckout}
                                   className="flex-1 py-4 bg-emerald-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20"
                                >
                                   Enviar Solicitud
                                </button>
                             </div>
                          )}
                       </div>
                   </>
               )}
            </div>
         </div>
      )}

      {/* 5. LOAN REQUEST MODAL */}
      <LoanRequestModal isOpen={isLoanModalOpen} onClose={() => setIsLoanModalOpen(false)} currentUser={currentUser} />

    </div>
  );
};

// Loan Request Component
const LoanRequestModal: React.FC<{ isOpen: boolean, onClose: () => void, currentUser: any }> = ({ isOpen, onClose, currentUser }) => {
    const [amount, setAmount] = useState<number>(0);
    const [displayAmount, setDisplayAmount] = useState('');
    const [periods, setPeriods] = useState<number>(1);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove non-numeric chars
        const rawValue = e.target.value.replace(/\D/g, '');
        if (!rawValue) {
            setAmount(0);
            setDisplayAmount('');
            return;
        }

        const numValue = parseInt(rawValue, 10);
        setAmount(numValue);
        // Format with dots
        setDisplayAmount(numValue.toLocaleString('es-CO'));
    };

    const handleSubmit = async () => {
        if (!amount || amount <= 0) return;
        if (!currentUser) return alert("Error de sesión.");

        setLoading(true);
        try {
            await StoreService.requestLoan({
                user_id: currentUser.user_id, // Dynamic User ID
                amount,
                periods,
                reason
            });
            alert('Solicitud enviada exitosamente a contabilidad.');
            setAmount(0);
            setDisplayAmount('');
            setReason('');
            onClose();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={onClose} />
            <div className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl p-6 md:p-8 animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Wallet className="text-emerald-500" /> Solicitar Préstamo
                    </h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Monto a Solicitar</label>
                        <div className="relative">
                            <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 text-lg"
                                placeholder="0"
                                value={displayAmount}
                                onChange={handleAmountChange}
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 text-right">Pesos Colombianos</p>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Periodos a descontar</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range" min="1" max="12"
                                value={periods}
                                onChange={e => setPeriods(Number(e.target.value))}
                                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <span className="font-black text-slate-900 w-8 text-center">{periods}</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Motivo</label>
                        <textarea
                            rows={3}
                            className="w-full p-4 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none resize-none"
                            placeholder="Describe brevemente el motivo..."
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                        />
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex gap-2 items-start">
                        <AlertCircle size={16} className="text-blue-500 mt-0.5" />
                        <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                            Esta solicitud será enviada a contabilidad para su aprobación. Recibirás una notificación cuando sea procesada.
                        </p>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl text-xs uppercase tracking-widest">Cancelar</button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || amount <= 0 || !reason}
                        className="flex-1 py-3 bg-slate-900 text-emerald-400 font-bold rounded-xl hover:bg-black transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest"
                    >
                        {loading ? 'Enviando...' : 'Enviar Solicitud'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ... ProductDetailPane ... (No changes needed, already present in previous turn)
const ProductDetailPane: React.FC<{
    product: StoreProduct,
    categories: StoreCategory[],
    onAddToCart: (p: StoreProduct, v: ProductVariant, q: number) => void,
    onClose: () => void
}> = ({ product, categories, onAddToCart, onClose }) => {
    // 1. Extract Unique Attributes
    const colors = useMemo(() => {
        const unique = new Map();
        product.variants.forEach(v => {
            if (v.attributes.color && v.attributes.color_hex) {
                unique.set(v.attributes.color, v.attributes.color_hex);
            }
        });
        return Array.from(unique.entries());
    }, [product]);

    const sizes = useMemo(() => {
        const unique = new Set<string>();
        product.variants.forEach(v => {
            if (v.attributes.size) unique.add(v.attributes.size);
        });
        return Array.from(unique);
    }, [product]);

    // 2. Selection State
    const [selectedColor, setSelectedColor] = useState<string | null>(colors.length > 0 ? colors[0][0] : null);
    const [selectedSize, setSelectedSize] = useState<string | null>(sizes.length > 0 ? sizes[0] : null);
    const [qty, setQty] = useState(1);

    // 3. Resolve Variant based on selection
    const activeVariant = useMemo(() => {
        return product.variants.find(v => {
            const matchColor = !selectedColor || v.attributes.color === selectedColor;
            const matchSize = !selectedSize || v.attributes.size === selectedSize;
            return matchColor && matchSize;
        });
    }, [product, selectedColor, selectedSize]);

    const price = activeVariant?.price_override || product.price_base;
    const isOutOfStock = !activeVariant || activeVariant.current_stock <= 0;

    return (
        <div className="w-full md:w-1/2 p-6 md:p-12 overflow-y-auto custom-scrollbar flex flex-col bg-white">
            <div className="mb-auto">
                <span className="text-amber-600 font-black text-[10px] uppercase tracking-[0.2em] mb-2 block">
                    {categories.find(c => c.id === product.category_id)?.name}
                </span>
                <h2 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight mb-2 md:mb-4">{product.name}</h2>
                <p className="text-xl md:text-2xl font-medium text-slate-900 mb-6">${price.toLocaleString()}</p>

                {/* Color Swatches */}
                {colors.length > 0 && (
                    <div className="mb-6">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Color: <span className="text-slate-900">{selectedColor}</span></label>
                        <div className="flex gap-3 flex-wrap">
                            {colors.map(([name, hex]) => {
                                // Check availability for this color
                                const isColorAvailable = product.variants.some(v => v.attributes.color === name && v.current_stock > 0);
                                return (
                                    <button
                                        key={name}
                                        onClick={() => setSelectedColor(name)}
                                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${selectedColor === name ? 'border-slate-900 scale-110' : 'border-slate-100 hover:border-slate-300'}`}
                                        title={name}
                                    >
                                        <div
                                            className="w-8 h-8 rounded-full shadow-sm relative"
                                            style={{ backgroundColor: hex }}
                                        >
                                            {!isColorAvailable && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-full">
                                                    <div className="w-full h-0.5 bg-red-500 rotate-45 transform"></div>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Size Chips */}
                {sizes.length > 0 && (
                    <div className="mb-8">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Tamaño / Presentación</label>
                        <div className="flex flex-wrap gap-2">
                            {sizes.map(size => {
                                // Check if this size is available for selected color
                                const variantForSize = product.variants.find(v =>
                                    (!selectedColor || v.attributes.color === selectedColor) &&
                                    v.attributes.size === size
                                );
                                const sizeAvailable = variantForSize && variantForSize.current_stock > 0;

                                return (
                                    <button
                                        key={size}
                                        onClick={() => setSelectedSize(size)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                            selectedSize === size
                                            ? 'bg-slate-900 text-white border-slate-900'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                        } ${!sizeAvailable ? 'opacity-50 cursor-not-allowed decoration-slice' : ''}`}
                                    >
                                        {size}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="prose prose-sm text-slate-500 mb-8 leading-relaxed text-xs md:text-sm">
                    <p>{product.description_long}</p>
                </div>

                {isOutOfStock ? (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 mb-6">
                        <AlertCircle size={20} />
                        <span className="font-bold text-sm">Combinación agotada temporalmente.</span>
                    </div>
                ) : (
                    <div className="flex gap-4 mb-4 md:mb-0">
                        <div className="flex items-center bg-slate-100 rounded-2xl p-1">
                            <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-3 hover:bg-white rounded-xl transition-all"><Minus size={16} /></button>
                            <span className="w-8 md:w-10 text-center font-bold">{qty}</span>
                            <button onClick={() => setQty(Math.min(activeVariant!.current_stock, qty + 1))} className="p-3 hover:bg-white rounded-xl transition-all"><Plus size={16} /></button>
                        </div>
                        <button
                            onClick={() => { if(activeVariant) { onAddToCart(product, activeVariant, qty); onClose(); } }}
                            className="flex-1 py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-3"
                        >
                            <ShoppingBag size={18} /> Agregar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StorefrontPage;
