import { supabase } from './supabaseClient';
import { getStoredUser } from './session';
import {
  StoreProduct,
  StoreCategory,
  InventoryLot,
  StockMovement,
  InstallmentPlan,
  LoanRequest,
  StoreOrder,
  FinancialRule,
  Requisition,
  CostCenter,
  AnalyticsSummary,
  SalesSeriesData,
  ProductPerformance,
  InventoryAging,
  CategoryPerformance,
} from './types';

const DEFAULT_STUDIO_ID = 1;

const getStudioId = () => Number(getStoredUser()?.std_id || DEFAULT_STUDIO_ID);

const toNumber = (value: any) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const slugify = (value: string) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const mapVariant = (row: any) => ({
  id: String(row.variant_id),
  product_id: String(row.prod_id),
  sku: row.variant_sku || '',
  name: row.variant_name || 'Default',
  attributes: row.attributes_json || {},
  current_stock: toNumber(row.variant_stock),
  status: row.variant_status || 'IN_STOCK',
  price_override: row.price_override ?? undefined,
});

const mapProduct = (row: any): StoreProduct => {
  const images = (row.product_images || []).map((img: any) => ({
    id: String(img.prod_image_id),
    url_thumb: img.url_thumb || img.url_original || '',
    url_medium: img.url_medium || img.url_original || '',
    url_original: img.url_original || '',
    is_main: img.is_main === true,
  }));

  const variants = (row.product_variants || []).map(mapVariant);

  const totalStock =
    row.prod_stock ?? variants.reduce((acc: number, v: any) => acc + toNumber(v.variant_stock), 0);
  const minStock = toNumber(row.prod_min_stock);
  let status = row.prod_status;
  if (!status) {
    status = totalStock <= 0 ? 'OUT_OF_STOCK' : totalStock <= minStock ? 'LOW_STOCK' : 'IN_STOCK';
  }

  return {
    id: String(row.prod_id),
    studio_id: String(row.std_id || DEFAULT_STUDIO_ID),
    name: row.prod_name,
    category_id: String(row.cate_id),
    brand: row.prod_brand || undefined,
    unit: row.prod_unit || 'UND',
    description_short: row.prod_description_short || '',
    description_long: row.prod_description_long || '',
    images,
    price_base: toNumber(row.prod_sale_price),
    min_stock: minStock,
    total_stock: toNumber(totalStock),
    is_active: row.prod_is_active !== false,
    status,
    tax_rate: toNumber(row.prod_tax_rate),
    variants,
  };
};

const StoreService = {
  async getProducts(): Promise<StoreProduct[]> {
    const stdId = getStudioId();
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variants(*), product_images(*)')
      .eq('std_id', stdId)
      .order('prod_name', { ascending: true });

    if (error) {
      console.error('Store products error', error);
      return [];
    }

    return (data || []).map(mapProduct);
  },

  async getCategories(): Promise<StoreCategory[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('cate_id, cate_name')
      .order('cate_name', { ascending: true });

    if (error) {
      console.error('Store categories error', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: String(row.cate_id),
      name: row.cate_name,
      slug: slugify(row.cate_name || ''),
    }));
  },

  async getCostCenters(): Promise<CostCenter[]> {
    const stdId = getStudioId();
    const { data, error } = await supabase
      .from('cost_centers')
      .select('*')
      .eq('std_id', stdId)
      .order('cost_center_name', { ascending: true });

    if (error) {
      console.error('Cost centers error', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: String(row.cost_center_id),
      code: row.cost_center_code,
      name: row.cost_center_name,
      active: row.cost_center_active !== false,
    }));
  },

  async getInventory(): Promise<{ lots: InventoryLot[]; movements: StockMovement[] }> {
    const { data: lotsRows, error: lotsError } = await supabase
      .from('inventory_lots')
      .select('*')
      .order('received_at', { ascending: false });

    const { data: movRows, error: movError } = await supabase
      .from('inventory_movements')
      .select('*')
      .order('movement_date', { ascending: false });

    if (lotsError || movError) {
      console.error('Inventory error', lotsError || movError);
    }

    const lots = (lotsRows || []).map((row: any) => ({
      id: String(row.lot_id),
      product_variant_id: String(row.variant_id),
      received_at: row.received_at,
      unit_cost: toNumber(row.unit_cost),
      initial_qty: toNumber(row.initial_qty),
      current_qty: toNumber(row.current_qty),
    }));

    const movements = (movRows || []).map((row: any) => ({
      id: String(row.movement_id),
      variant_id: String(row.variant_id),
      type: row.movement_type,
      qty: toNumber(row.qty),
      date: row.movement_date || row.created_at,
    }));

    return { lots, movements };
  },

  async getLoans(): Promise<InstallmentPlan[]> {
    const { data, error } = await supabase
      .from('installment_plans')
      .select('*, users(user_name, user_surname)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Loans error', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: String(row.plan_id),
      user_name: `${row.users?.user_name || ''} ${row.users?.user_surname || ''}`.trim(),
      total_amount: toNumber(row.total_amount),
      monthly_payment: toNumber(row.monthly_payment),
      term_months: row.term_months,
    }));
  },

  async getLoanRequests(): Promise<LoanRequest[]> {
    const { data, error } = await supabase
      .from('loan_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Loan requests error', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: String(row.loan_request_id),
      user_id: row.user_id,
      amount: toNumber(row.amount),
      periods: row.periods,
      reason: row.reason || '',
      status: row.status,
    }));
  },

  async getOrders(): Promise<StoreOrder[]> {
    const { data, error } = await supabase
      .from('store_orders')
      .select('*, store_order_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Orders error', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: String(row.order_id),
      studio_id: String(row.std_id || DEFAULT_STUDIO_ID),
      buyer_user_id: row.buyer_user_id,
      buyer_name: row.buyer_name || '',
      cost_center_id: row.cost_center_id ? String(row.cost_center_id) : undefined,
      status: row.order_status,
      items: row.store_order_items || [],
      subtotal: toNumber(row.subtotal),
      tax_total: toNumber(row.tax_total),
      total_amount: toNumber(row.total_amount),
      payment_method: row.payment_method,
      created_at: row.created_at,
      payment_details: row.payment_details || undefined,
    }));
  },

  async getRequisitions(): Promise<Requisition[]> {
    const { data, error } = await supabase
      .from('requisitions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Requisitions error', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: String(row.requisition_id),
      user_id: row.user_id,
      user_name: row.user_name || '',
      product_name: row.product_name,
      qty: toNumber(row.qty),
      urgency: row.urgency,
    }));
  },

  async getFinancialRules(role: any): Promise<FinancialRule[]> {
    const roleId = role?.roleId ?? role?.role_id ?? role;
    const { data, error } = await supabase
      .from('financial_rules')
      .select('*')
      .eq('role_id', roleId);

    if (error) {
      console.error('Financial rules error', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      role_id: row.role_id,
      term_type: row.term_type,
      allowed: row.allowed !== false,
      max_amount: toNumber(row.max_amount),
      max_periods: row.max_periods,
      interest_rate: toNumber(row.interest_rate),
      requires_approval: row.requires_approval === true,
    }));
  },

  async createProduct(product: Partial<StoreProduct>) {
    const stdId = getStudioId();
    const payload: any = {
      std_id: stdId,
      cate_id: product.category_id ? Number(product.category_id) : null,
      prod_code: product.name ? slugify(product.name).toUpperCase() : 'NEW',
      prod_name: product.name || 'Nuevo Producto',
      prod_purchase_price: 0,
      prod_sale_price: product.price_base || 0,
      prod_stock: product.total_stock || 0,
      prod_brand: product.brand || null,
      prod_unit: product.unit || 'UND',
      prod_description_short: product.description_short || '',
      prod_description_long: product.description_long || '',
      prod_min_stock: product.min_stock || 0,
      prod_is_active: product.is_active !== false,
      prod_status: product.status || null,
      prod_tax_rate: product.tax_rate || 0,
    };

    const { data: row, error } = await supabase
      .from('products')
      .insert([payload])
      .select('*')
      .single();

    const prodId = row?.prod_id;

    if (prodId && product.images && product.images.length) {
      await supabase.from('product_images').insert(
        product.images.map((img) => ({
          prod_id: prodId,
          url_thumb: img.url_thumb,
          url_medium: img.url_medium,
          url_original: img.url_original,
          is_main: img.is_main === true,
        }))
      );
    }

    if (prodId && product.variants && product.variants.length) {
      await supabase.from('product_variants').insert(
        product.variants.map((v) => ({
          prod_id: prodId,
          variant_sku: v.sku,
          variant_name: v.name,
          attributes_json: v.attributes || {},
          variant_stock: v.current_stock || 0,
          variant_status: v.status || 'IN_STOCK',
          price_override: v.price_override ?? null,
        }))
      );
    }

    if (error) {
      console.error('Create product error', error);
    }

    return row
      ? mapProduct({ ...row, product_images: product.images || [], product_variants: product.variants || [] })
      : null;
  },

  async updateProduct(id: string, product: Partial<StoreProduct>) {
    const payload: any = {
      cate_id: product.category_id ? Number(product.category_id) : undefined,
      prod_name: product.name,
      prod_sale_price: product.price_base,
      prod_stock: product.total_stock,
      prod_brand: product.brand,
      prod_unit: product.unit,
      prod_description_short: product.description_short,
      prod_description_long: product.description_long,
      prod_min_stock: product.min_stock,
      prod_is_active: product.is_active,
      prod_status: product.status,
      prod_tax_rate: product.tax_rate,
      updated_at: new Date().toISOString(),
    };

    const { data: row, error } = await supabase
      .from('products')
      .update(payload)
      .eq('prod_id', id)
      .select('*')
      .single();

    if (product.images) {
      await supabase.from('product_images').delete().eq('prod_id', id);
      if (product.images.length) {
        await supabase.from('product_images').insert(
          product.images.map((img) => ({
            prod_id: id,
            url_thumb: img.url_thumb,
            url_medium: img.url_medium,
            url_original: img.url_original,
            is_main: img.is_main === true,
          }))
        );
      }
    }

    if (product.variants) {
      await supabase.from('product_variants').delete().eq('prod_id', id);
      if (product.variants.length) {
        await supabase.from('product_variants').insert(
          product.variants.map((v) => ({
            prod_id: id,
            variant_sku: v.sku,
            variant_name: v.name,
            attributes_json: v.attributes || {},
            variant_stock: v.current_stock || 0,
            variant_status: v.status || 'IN_STOCK',
            price_override: v.price_override ?? null,
          }))
        );
      }
    }

    if (error) {
      console.error('Update product error', error);
    }

    return row
      ? mapProduct({ ...row, product_images: product.images || [], product_variants: product.variants || [] })
      : null;
  },

  async registerPurchase(purchaseData: any) {
    if (!purchaseData?.variant_id || !purchaseData?.qty) return true;

    const qty = toNumber(purchaseData.qty);
    const unitCost = toNumber(purchaseData.unit_cost || 0);
    const variantId = Number(purchaseData.variant_id);

    const { data: variant } = await supabase
      .from('product_variants')
      .select('*')
      .eq('variant_id', variantId)
      .single();

    if (!variant) return true;

    await supabase.from('inventory_lots').insert([
      {
        variant_id: variantId,
        received_at: purchaseData.received_at || new Date().toISOString().split('T')[0],
        unit_cost: unitCost,
        initial_qty: qty,
        current_qty: qty,
      },
    ]);

    await supabase.from('inventory_movements').insert([
      {
        variant_id: variantId,
        movement_type: 'PURCHASE_IN',
        qty,
        unit_cost_snapshot: unitCost,
        notes: purchaseData.notes || 'Compra registrada',
      },
    ]);

    await supabase
      .from('product_variants')
      .update({ variant_stock: toNumber(variant.variant_stock) + qty })
      .eq('variant_id', variantId);

    if (variant.prod_id) {
      const { data: product } = await supabase
        .from('products')
        .select('prod_stock')
        .eq('prod_id', variant.prod_id)
        .single();
      const currentStock = toNumber(product?.prod_stock);
      await supabase
        .from('products')
        .update({ prod_stock: currentStock + qty })
        .eq('prod_id', variant.prod_id);
    }

    return true;
  },

  async checkout(orderData: Partial<StoreOrder>, config?: any) {
    const stdId = getStudioId();
    const payload: any = {
      std_id: stdId,
      buyer_user_id: orderData.buyer_user_id,
      buyer_name: orderData.buyer_name,
      cost_center_id: orderData.cost_center_id ? Number(orderData.cost_center_id) : null,
      order_status: 'PENDING_APPROVAL',
      subtotal: orderData.subtotal || 0,
      tax_total: orderData.tax_total || 0,
      total_amount: orderData.total_amount || 0,
      payment_method: orderData.payment_method || 'CASH',
      payment_details: orderData.payment_details || config || null,
    };

    const { data: order, error } = await supabase
      .from('store_orders')
      .insert([payload])
      .select('*')
      .single();

    const items = orderData.items || [];
    if (order && items.length) {
      await supabase.from('store_order_items').insert(
        items.map((item: any) => ({
          order_id: order.order_id,
          prod_id: item.product_id ? Number(item.product_id) : null,
          variant_id: item.variant_id ? Number(item.variant_id) : null,
          product_name: item.product_name,
          variant_name: item.variant_name,
          qty: item.qty,
          unit_price: item.unit_price,
          total: item.total,
          tax_rate: item.tax_rate || 0,
          tax_amount: item.tax_amount || 0,
          cogs_unit: item.cogs_unit || 0,
          image_url: item.image_url || null,
        }))
      );

      for (const item of items) {
        if (item.variant_id) {
          const { data: variant } = await supabase
            .from('product_variants')
            .select('variant_stock, prod_id')
            .eq('variant_id', item.variant_id)
            .single();
          if (variant) {
            const newStock = Math.max(0, toNumber(variant.variant_stock) - toNumber(item.qty));
            await supabase
              .from('product_variants')
              .update({ variant_stock: newStock })
              .eq('variant_id', item.variant_id);

            if (variant.prod_id) {
              const { data: product } = await supabase
                .from('products')
                .select('prod_stock')
                .eq('prod_id', variant.prod_id)
                .single();
              const prodStock = Math.max(0, toNumber(product?.prod_stock) - toNumber(item.qty));
              await supabase
                .from('products')
                .update({ prod_stock: prodStock })
                .eq('prod_id', variant.prod_id);
            }
          }
        }
      }
    }

    if (orderData.payment_method === 'LOAN' || orderData.payment_method === 'INSTALLMENTS') {
      const cfg = config || {};
      await supabase.from('loan_requests').insert([
        {
          user_id: orderData.buyer_user_id,
          amount: orderData.total_amount || 0,
          periods: cfg.periods || 1,
          reason: 'Compra en tienda',
          status: 'PENDING_APPROVAL',
        },
      ]);
    }

    if (error) {
      console.error('Checkout error', error);
    }

    return order
      ? {
          id: String(order.order_id),
          studio_id: String(order.std_id || DEFAULT_STUDIO_ID),
          buyer_user_id: order.buyer_user_id,
          buyer_name: order.buyer_name,
          cost_center_id: order.cost_center_id ? String(order.cost_center_id) : undefined,
          status: order.order_status,
          items,
          subtotal: toNumber(order.subtotal),
          tax_total: toNumber(order.tax_total),
          total_amount: toNumber(order.total_amount),
          payment_method: order.payment_method,
          created_at: order.created_at,
          payment_details: order.payment_details || undefined,
        }
      : null;
  },

  async requestLoan(data: any) {
    const { error } = await supabase.from('loan_requests').insert([
      {
        user_id: data.user_id,
        amount: data.amount,
        periods: data.periods,
        reason: data.reason,
        status: 'PENDING_APPROVAL',
      },
    ]);

    if (error) {
      console.error('Request loan error', error);
    }

    return true;
  },

  async createRequisition(data: any) {
    const { error } = await supabase.from('requisitions').insert([
      {
        user_id: data.user_id,
        user_name: data.user_name,
        product_name: data.product_name,
        qty: data.qty,
        urgency: data.urgency || 'MEDIUM',
        status: 'OPEN',
      },
    ]);

    if (error) {
      console.error('Create requisition error', error);
    }

    return true;
  },

  async approveLoan(id: string) {
    const { error } = await supabase
      .from('loan_requests')
      .update({ status: 'APPROVED' })
      .eq('loan_request_id', id);

    if (error) {
      console.error('Approve loan error', error);
    }

    return true;
  },

  async rejectLoan(id: string) {
    const { error } = await supabase
      .from('loan_requests')
      .update({ status: 'REJECTED' })
      .eq('loan_request_id', id);

    if (error) {
      console.error('Reject loan error', error);
    }

    return true;
  },

  async approveOrder(id: string) {
    const { error } = await supabase
      .from('store_orders')
      .update({ order_status: 'APPROVED' })
      .eq('order_id', id);

    if (error) {
      console.error('Approve order error', error);
    }

    return true;
  },

  async rejectOrder(id: string) {
    const { error } = await supabase
      .from('store_orders')
      .update({ order_status: 'CANCELLED' })
      .eq('order_id', id);

    if (error) {
      console.error('Reject order error', error);
    }

    return true;
  },

  async getAnalyticsSummary(start: string, end: string): Promise<AnalyticsSummary> {
    const { data: orders, error } = await supabase
      .from('store_orders')
      .select('order_id, subtotal, tax_total, total_amount, order_status, created_at')
      .gte('created_at', `${start}T00:00:00`)
      .lte('created_at', `${end}T23:59:59`);

    if (error) {
      console.error('Analytics summary error', error);
    }

    const validOrders = (orders || []).filter((o: any) => ['DELIVERED', 'APPROVED'].includes(o.order_status));
    const orderIds = validOrders.map((o: any) => o.order_id);
    const { data: items } = orderIds.length
      ? await supabase.from('store_order_items').select('*').in('order_id', orderIds)
      : { data: [] };

    let net_sales = 0;
    let tax_collected = 0;
    let gross_sales = 0;
    let cogs = 0;
    let units_sold = 0;

    validOrders.forEach((o: any) => {
      net_sales += toNumber(o.subtotal);
      tax_collected += toNumber(o.tax_total);
      gross_sales += toNumber(o.total_amount);
    });

    (items || []).forEach((item: any) => {
      units_sold += toNumber(item.qty);
      cogs += toNumber(item.cogs_unit) * toNumber(item.qty);
    });

    const gross_profit = net_sales - cogs;
    const margin_percent = net_sales > 0 ? (gross_profit / net_sales) * 100 : 0;
    const orders_count = validOrders.length;
    const aov = orders_count > 0 ? gross_sales / orders_count : 0;

    return {
      net_sales,
      tax_collected,
      gross_sales,
      cogs,
      gross_profit,
      margin_percent,
      orders_count,
      units_sold,
      aov,
      bad_debt: 0,
      adjusted_profit: gross_profit,
      inventory_turnover: units_sold > 0 ? units_sold / 50 : 0,
      avg_days_to_sell: 22,
      mom_comparison: { sales: 0, profit: 0, units: 0, margin: 0 },
    };
  },

  async getSalesSeries(start: string, end: string): Promise<SalesSeriesData[]> {
    const { data: orders, error } = await supabase
      .from('store_orders')
      .select('order_id, subtotal, total_amount, order_status, created_at')
      .gte('created_at', `${start}T00:00:00`)
      .lte('created_at', `${end}T23:59:59`);

    if (error) {
      console.error('Sales series error', error);
    }

    const validOrders = (orders || []).filter((o: any) => ['DELIVERED', 'APPROVED'].includes(o.order_status));
    const orderIds = validOrders.map((o: any) => o.order_id);
    const { data: items } = orderIds.length
      ? await supabase.from('store_order_items').select('*').in('order_id', orderIds)
      : { data: [] };

    const grouped: Record<string, any> = {};
    const s = new Date(start);
    const e = new Date(end);
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      grouped[key] = { date: key, net_sales: 0, gross_profit: 0, units: 0, orders: 0 };
    }

    validOrders.forEach((o: any) => {
      const key = o.created_at.split('T')[0];
      if (grouped[key]) {
        grouped[key].net_sales += toNumber(o.subtotal);
        grouped[key].orders += 1;
      }
    });

    (items || []).forEach((item: any) => {
      const order = validOrders.find((o: any) => o.order_id === item.order_id);
      if (!order) return;
      const key = order.created_at.split('T')[0];
      if (!grouped[key]) return;
      const itemCogs = toNumber(item.cogs_unit) * toNumber(item.qty);
      grouped[key].gross_profit += toNumber(item.unit_price) * toNumber(item.qty) - itemCogs;
      grouped[key].units += toNumber(item.qty);
    });

    return Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date));
  },

  async getTopSellingProducts(start: string, end: string, limit = 5): Promise<ProductPerformance[]> {
    const [products, categories] = await Promise.all([this.getProducts(), this.getCategories()]);
    const productList = products || [];
    const categoryList = categories || [];

    const { data: orders, error } = await supabase
      .from('store_orders')
      .select('order_id, order_status, created_at')
      .gte('created_at', `${start}T00:00:00`)
      .lte('created_at', `${end}T23:59:59`);

    if (error) {
      console.error('Top selling error', error);
    }

    const validOrders = (orders || []).filter((o: any) => ['DELIVERED', 'APPROVED'].includes(o.order_status));
    const orderIds = validOrders.map((o: any) => o.order_id);
    const { data: items } = orderIds.length
      ? await supabase.from('store_order_items').select('*').in('order_id', orderIds)
      : { data: [] };

    const productMap: Record<string, any> = {};

    (items || []).forEach((item: any) => {
      const product = productList.find((p) => p.id === String(item.prod_id)) || productList.find((p) => p.id === String(item.product_id));
      const categoryName = categoryList.find((c) => c.id === product?.category_id)?.name || 'General';
      const key = String(item.prod_id || item.product_id || product?.id);

      if (!productMap[key]) {
        productMap[key] = {
          id: key,
          name: product?.name || item.product_name || 'Producto',
          sku: product?.variants?.[0]?.sku || 'UNK',
          category: categoryName,
          units_sold: 0,
          net_sales: 0,
          cogs: 0,
          gross_profit: 0,
          margin_percent: 0,
          turnover_rate: 0,
          avg_days_to_sell: 0,
          stock_current: product?.total_stock || 0,
          reorder_suggested: false,
          is_dead_stock: false,
        };
      }

      const entry = productMap[key];
      entry.units_sold += toNumber(item.qty);
      entry.net_sales += toNumber(item.unit_price) * toNumber(item.qty);
      const itemCogs = toNumber(item.cogs_unit) * toNumber(item.qty);
      entry.cogs += itemCogs;
      entry.gross_profit += toNumber(item.unit_price) * toNumber(item.qty) - itemCogs;
    });

    return Object.values(productMap)
      .map((p: any) => ({
        ...p,
        margin_percent: p.net_sales > 0 ? (p.gross_profit / p.net_sales) * 100 : 0,
      }))
      .sort((a: any, b: any) => b.units_sold - a.units_sold)
      .slice(0, limit) as ProductPerformance[];
  },

  async getTopProfitableProducts(start: string, end: string, limit = 5): Promise<ProductPerformance[]> {
    const all = await this.getTopSellingProducts(start, end, 1000);
    return (all || []).sort((a, b) => b.gross_profit - a.gross_profit).slice(0, limit);
  },

  async getCategorySplit(start: string, end: string): Promise<CategoryPerformance[]> {
    const [categories, products] = await Promise.all([this.getCategories(), this.getProducts()]);
    const categoryList = categories || [];
    const productList = products || [];

    const { data: orders, error } = await supabase
      .from('store_orders')
      .select('order_id, order_status, created_at')
      .gte('created_at', `${start}T00:00:00`)
      .lte('created_at', `${end}T23:59:59`);

    if (error) {
      console.error('Category split error', error);
    }

    const validOrders = (orders || []).filter((o: any) => ['DELIVERED', 'APPROVED'].includes(o.order_status));
    const orderIds = validOrders.map((o: any) => o.order_id);
    const { data: items } = orderIds.length
      ? await supabase.from('store_order_items').select('*').in('order_id', orderIds)
      : { data: [] };

    const catMap: Record<string, number> = {};
    let totalSales = 0;

    (items || []).forEach((item: any) => {
      const product = productList.find((p) => p.id === String(item.prod_id));
      const categoryName = categoryList.find((c) => c.id === product?.category_id)?.name || 'Otros';
      const amount = toNumber(item.unit_price) * toNumber(item.qty);
      catMap[categoryName] = (catMap[categoryName] || 0) + amount;
      totalSales += amount;
    });

    return Object.entries(catMap)
      .map(([name, net_sales]) => ({
        id: name,
        name,
        net_sales,
        percentage: totalSales > 0 ? (net_sales / totalSales) * 100 : 0,
      }))
      .sort((a, b) => b.net_sales - a.net_sales);
  },

  async getInventoryAging(): Promise<InventoryAging> {
    const { data: lots, error } = await supabase.from('inventory_lots').select('*');

    if (error) {
      console.error('Inventory aging error', error);
    }

    const now = Date.now();
    const ranges = { range_0_30: 0, range_31_60: 0, range_61_90: 0, range_90_plus: 0 };

    (lots || []).forEach((lot: any) => {
      const received = new Date(lot.received_at).getTime();
      const days = Math.floor((now - received) / 86400000);
      const value = toNumber(lot.current_qty) * toNumber(lot.unit_cost);
      if (days <= 30) ranges.range_0_30 += value;
      else if (days <= 60) ranges.range_31_60 += value;
      else if (days <= 90) ranges.range_61_90 += value;
      else ranges.range_90_plus += value;
    });

    const total_valuation =
      ranges.range_0_30 + ranges.range_31_60 + ranges.range_61_90 + ranges.range_90_plus;

    return { ...ranges, total_valuation };
  },

  async getProductAnalytics(productId: string) {
    const { data: items, error } = await supabase
      .from('store_order_items')
      .select('*')
      .eq('prod_id', productId);

    if (error) {
      console.error('Product analytics error', error);
    }

    const total_sold_units = (items || []).reduce((acc: number, item: any) => acc + toNumber(item.qty), 0);
    const total_revenue = (items || []).reduce(
      (acc: number, item: any) => acc + toNumber(item.unit_price) * toNumber(item.qty),
      0
    );

    return {
      id: productId,
      name: items?.[0]?.product_name || 'Producto',
      total_sold_units,
      total_revenue,
      avg_margin: 0,
      turnover_days: 0,
      sales_trend: [],
      variant_breakdown: [],
      fifo_lots: [],
    };
  },
};

export default StoreService;
