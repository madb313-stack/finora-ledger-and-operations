// Complete realistic demo data for Finora - Sudanese Trading Company
// شركة النيل للتجارة والاستثمار المحدودة

export interface DemoBranch {
  id: string;
  code: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  is_main: boolean;
}

export interface DemoWarehouse {
  id: string;
  code: string;
  name: string;
  branch_id: string;
  branch_name: string;
}

export interface DemoParty {
  id: string;
  kind: "customer" | "supplier";
  code: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  credit_limit: number;
  payment_terms_days: number;
  tax_number: string;
  contact_person?: string | null;
  email?: string | null;
}

export interface DemoProduct {
  id: string;
  code: string;
  name: string;
  sku: string;
  barcode: string;
  type: "stock" | "service";
  unit: string;
  sale_price: number;
  purchase_price: number;
  avg_cost: number;
  stock_quantity: number;
  min_stock_alert: number;
  reorder_level?: number;
  description?: string | null;
  is_active?: boolean;
}

export interface DemoFinancialAccount {
  id: string;
  kind: "cash" | "bank";
  name: string;
  account_number: string;
  currency_code: string;
  balance: number;
  branch_name: string;
}

export interface DemoInvoiceItem {
  id: string;
  product_id: string;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  line_total: number;
}

export interface DemoSalesInvoice {
  id: string;
  number: string;
  party_id: string;
  customer_name: string;
  customer_code: string;
  branch_id: string;
  branch_name: string;
  warehouse_id: string;
  warehouse_name: string;
  invoice_date: string;
  due_date: string;
  currency_code: string;
  status: "draft" | "posted" | "partially_paid" | "paid" | "void";
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total: number;
  amount_paid: number;
  amount_credited: number;
  notes: string;
  items: DemoInvoiceItem[];
}

export interface DemoPurchaseInvoice {
  id: string;
  number: string;
  supplier_reference: string;
  party_id: string;
  supplier_name: string;
  supplier_code: string;
  branch_id: string;
  branch_name: string;
  warehouse_id: string;
  warehouse_name: string;
  invoice_date: string;
  due_date: string;
  currency_code: string;
  status: "draft" | "posted" | "partially_paid" | "paid" | "void";
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total: number;
  amount_paid: number;
  notes: string;
  items: DemoInvoiceItem[];
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: string;
  role_title_ar: string;
  branch_name: string;
  avatar_initial: string;
}

// 1. Company Profile
export const DEMO_COMPANY = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "شركة النيل للتجارة والاستثمار المحدودة",
  legal_name: "Blue Nile Trading & Investment Co. Ltd",
  business_type: "تجارة عامة واستيراد وتوزيع",
  tax_number: "SD-10928374-TX",
  commercial_register: "CR-89234-KRT",
  phone: "+249 183 772901",
  email: "info@niletrading-sd.com",
  address: "شارع البلدية، تقاطع القصر، برج الفيحاء، الطابق 4",
  city: "الخرطوم",
  country_code: "SD",
  base_currency: "SDG",
  timezone: "Africa/Khartoum",
  default_locale: "ar",
  fiscal_year_start_month: 1,
  status: "active",
  inventory_enabled: true,
  allow_negative_stock: true,
  require_sales_approval: false,
  require_purchase_approval: false,
  require_expense_approval: false,
  onboarding_completed: true,
};

// 2. Branches (الفروع الأربعة)
export const DEMO_BRANCHES: DemoBranch[] = [
  {
    id: "b0000000-0000-0000-0000-000000000001",
    code: "HQ",
    name: "الخرطوم - المركز الرئيسي",
    city: "الخرطوم",
    address: "شارع البلدية، تقاطع القصر، الخرطوم",
    phone: "+249 183 772901",
    is_main: true,
  },
  {
    id: "b0000000-0000-0000-0000-000000000002",
    code: "OMD",
    name: "فرع أم درمان - سوق ليبيا",
    city: "أم درمان",
    address: "المنطقة التجارية، مجمع أسواق ليبيا، محل رقم 42",
    phone: "+249 187 554321",
    is_main: false,
  },
  {
    id: "b0000000-0000-0000-0000-000000000003",
    code: "BHR",
    name: "فرع بحري - المنطقة الصناعية",
    city: "بحري",
    address: "شارع الإنقاذ، جوار مصانع النسيج، بحري",
    phone: "+249 185 331199",
    is_main: false,
  },
  {
    id: "b0000000-0000-0000-0000-000000000004",
    code: "PTS",
    name: "فرع بورتسودان - الميناء الشمالي",
    city: "بورتسودان",
    address: "منطقة الميناء الشمالي، شارع الجمارك، بورتسودان",
    phone: "+249 311 823456",
    is_main: false,
  },
];

// 3. Warehouses (المستودعات)
export const DEMO_WAREHOUSES: DemoWarehouse[] = [
  {
    id: "w0000000-0000-0000-0000-000000000001",
    code: "WH-SOBA",
    name: "المستودع المركزي - سوبا",
    branch_id: "b0000000-0000-0000-0000-000000000001",
    branch_name: "الخرطوم - المركز الرئيسي",
  },
  {
    id: "w0000000-0000-0000-0000-000000000002",
    code: "WH-OMD",
    name: "مستودع أم درمان التوزيعي",
    branch_id: "b0000000-0000-0000-0000-000000000002",
    branch_name: "فرع أم درمان - سوق ليبيا",
  },
  {
    id: "w0000000-0000-0000-0000-000000000003",
    code: "WH-BHR",
    name: "مستودع بحري للمواد الخام",
    branch_id: "b0000000-0000-0000-0000-000000000003",
    branch_name: "فرع بحري - المنطقة الصناعية",
  },
  {
    id: "w0000000-0000-0000-0000-000000000004",
    code: "WH-PTS",
    name: "مستودع التخليص الجمركي - بورتسودان",
    branch_id: "b0000000-0000-0000-0000-000000000004",
    branch_name: "فرع بورتسودان - الميناء الشمالي",
  },
];

// 4. Users & Staff (المستخدمون وفريق العمل)
export const DEMO_USERS: DemoUser[] = [
  {
    id: "u0000000-0000-0000-0000-000000000001",
    name: "خضر مأمون",
    email: "khdrmamon@gmail.com",
    role: "owner",
    role_title_ar: "المدير العام والمالك (Owner)",
    branch_name: "الخرطوم - المركز الرئيسي",
    avatar_initial: "خ",
  },
  {
    id: "u0000000-0000-0000-0000-000000000002",
    name: "محمد عثمان الفكي",
    email: "m.osman@niletrading-sd.com",
    role: "finance_manager",
    role_title_ar: "المدير المالي (Finance Manager)",
    branch_name: "الخرطوم - المركز الرئيسي",
    avatar_initial: "م",
  },
  {
    id: "u0000000-0000-0000-0000-000000000003",
    name: "سارة أحمد إدريس",
    email: "sara.idris@niletrading-sd.com",
    role: "accountant",
    role_title_ar: "رئيس الحسابات (Chief Accountant)",
    branch_name: "الخرطوم - المركز الرئيسي",
    avatar_initial: "س",
  },
  {
    id: "u0000000-0000-0000-0000-000000000004",
    name: "عمر الفاتح حسن",
    email: "omar.fateh@niletrading-sd.com",
    role: "sales_manager",
    role_title_ar: "مدير مبيعات أم درمان (Sales Manager)",
    branch_name: "فرع أم درمان - سوق ليبيا",
    avatar_initial: "ع",
  },
  {
    id: "u0000000-0000-0000-0000-000000000005",
    name: "إبراهيم خليل نور",
    email: "ibrahim.khalil@niletrading-sd.com",
    role: "inventory_manager",
    role_title_ar: "مسؤول المستودعات (Inventory Manager)",
    branch_name: "المستودع المركزي - سوبا",
    avatar_initial: "إ",
  },
];

// 5. Financial Accounts (الخزائن والبنوك)
export const DEMO_FINANCIAL_ACCOUNTS: DemoFinancialAccount[] = [
  {
    id: "fa00000-0000-0000-0000-000000000001",
    kind: "cash",
    name: "الخزينة الرئيسية - الخرطوم",
    account_number: "CASH-HQ-01",
    currency_code: "SDG",
    balance: 8450000,
    branch_name: "الخرطوم - المركز الرئيسي",
  },
  {
    id: "fa00000-0000-0000-0000-000000000002",
    kind: "bank",
    name: "بنكك - بنك الخرطوم (BOK)",
    account_number: "2849102-BOK-SDG",
    currency_code: "SDG",
    balance: 42350000,
    branch_name: "الخرطوم - المركز الرئيسي",
  },
  {
    id: "fa00000-0000-0000-0000-000000000003",
    kind: "bank",
    name: "فوري - بنك فيصل الإسلامي (FIB)",
    account_number: "1098234-FIB-SDG",
    currency_code: "SDG",
    balance: 19800000,
    branch_name: "الخرطوم - المركز الرئيسي",
  },
  {
    id: "fa00000-0000-0000-0000-000000000004",
    kind: "cash",
    name: "خزينة فرع أم درمان",
    account_number: "CASH-OMD-01",
    currency_code: "SDG",
    balance: 3200000,
    branch_name: "فرع أم درمان - سوق ليبيا",
  },
];

// 6. Customers (العملاء)
export const DEMO_CUSTOMERS: DemoParty[] = [
  {
    id: "c0000000-0000-0000-0000-000000000001",
    kind: "customer",
    code: "C-001",
    name: "شركة البركة للحلويات والمخبوزات",
    phone: "+249 912 345678",
    city: "الخرطوم",
    address: "السوق العربي، شارع الحرية",
    credit_limit: 10000000,
    payment_terms_days: 15,
    tax_number: "SD-TX-203948",
  },
  {
    id: "c0000000-0000-0000-0000-000000000002",
    kind: "customer",
    code: "C-002",
    name: "محلات الأمل للمواد التموينية - أم درمان",
    phone: "+249 923 456789",
    city: "أم درمان",
    address: "سوق أم درمان الكبير، زقاق الهنود",
    credit_limit: 5000000,
    payment_terms_days: 30,
    tax_number: "SD-TX-394857",
  },
  {
    id: "c0000000-0000-0000-0000-000000000003",
    kind: "customer",
    code: "C-003",
    name: "مؤسسة النور للتجارة والتوزيع",
    phone: "+249 934 567890",
    city: "بحري",
    address: "سوق بحري المركزي، شارع المعونة",
    credit_limit: 7500000,
    payment_terms_days: 20,
    tax_number: "SD-TX-584736",
  },
  {
    id: "c0000000-0000-0000-0000-000000000004",
    kind: "customer",
    code: "C-004",
    name: "شركة الفجر للاستيراد والتصدير - بورتسودان",
    phone: "+249 945 678901",
    city: "بورتسودان",
    address: "سوق ديم العرب، عمارة الأوقاف",
    credit_limit: 15000000,
    payment_terms_days: 45,
    tax_number: "SD-TX-847362",
  },
];

// 7. Suppliers (الموردون)
export const DEMO_SUPPLIERS: DemoParty[] = [
  {
    id: "s0000000-0000-0000-0000-000000000001",
    kind: "supplier",
    code: "S-001",
    name: "شركة سكر كنانة المحدودة",
    phone: "+249 183 472091",
    city: "الخرطوم",
    address: "تقاطع الطائف، شارع الستين",
    credit_limit: 50000000,
    payment_terms_days: 30,
    tax_number: "SD-TX-100293",
  },
  {
    id: "s0000000-0000-0000-0000-000000000002",
    kind: "supplier",
    code: "S-002",
    name: "شركة سيقا للأغذية (مجموعة دال)",
    phone: "+249 183 234100",
    city: "بحري",
    address: "المنطقة الصناعية، كافوري",
    credit_limit: 40000000,
    payment_terms_days: 25,
    tax_number: "SD-TX-293847",
  },
  {
    id: "s0000000-0000-0000-0000-000000000003",
    kind: "supplier",
    code: "S-003",
    name: "مصانع صافولا للزيوت النباتية",
    phone: "+249 185 889900",
    city: "بورتسودان",
    address: "المنطقة الحرة، بورتسودان",
    credit_limit: 30000000,
    payment_terms_days: 30,
    tax_number: "SD-TX-485729",
  },
  {
    id: "s0000000-0000-0000-0000-000000000004",
    kind: "supplier",
    code: "S-004",
    name: "شركة مطاحن روتانا للدقيق الفاخر",
    phone: "+249 187 662244",
    city: "أم درمان",
    address: "المنطقة الصناعية أم درمان",
    credit_limit: 25000000,
    payment_terms_days: 20,
    tax_number: "SD-TX-758493",
  },
];

// 8. Products (الأصناف التجارية والمخزنية)
export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    id: "p0000000-0000-0000-0000-000000000001",
    code: "PRD-001",
    name: "سكر كنانة أبيض - شوال 50 كجم",
    sku: "KN-SUG-50KG",
    barcode: "6251002001011",
    type: "stock",
    unit: "شوال",
    sale_price: 88000,
    purchase_price: 76000,
    avg_cost: 76000,
    stock_quantity: 450,
    min_stock_alert: 50,
  },
  {
    id: "p0000000-0000-0000-0000-000000000002",
    code: "PRD-002",
    name: "دقيق سيقا ممتاز - كيس 25 كجم",
    sku: "SQ-FLR-25KG",
    barcode: "6251002002028",
    type: "stock",
    unit: "كيس",
    sale_price: 44000,
    purchase_price: 37500,
    avg_cost: 37500,
    stock_quantity: 680,
    min_stock_alert: 80,
  },
  {
    id: "p0000000-0000-0000-0000-000000000003",
    code: "PRD-003",
    name: "زيت طعام صباح نقي - كرتونة (4 جركانات × 4 لتر)",
    sku: "SBH-OIL-4X4L",
    barcode: "6251002003035",
    type: "stock",
    unit: "كرتونة",
    sale_price: 32000,
    purchase_price: 26500,
    avg_cost: 26500,
    stock_quantity: 340,
    min_stock_alert: 40,
  },
  {
    id: "p0000000-0000-0000-0000-000000000004",
    code: "PRD-004",
    name: "شاي الغزالتين الأصلي - كرتونة 10 كجم",
    sku: "GZL-TEA-10KG",
    barcode: "6251002004042",
    type: "stock",
    unit: "كرتونة",
    sale_price: 68000,
    purchase_price: 57000,
    avg_cost: 57000,
    stock_quantity: 190,
    min_stock_alert: 25,
  },
  {
    id: "p0000000-0000-0000-0000-000000000005",
    code: "PRD-005",
    name: "صابون غسيل أبيض لؤلؤة - كرتونة 36 قطعة",
    sku: "LUL-SOP-36PC",
    barcode: "6251002005059",
    type: "stock",
    unit: "كرتونة",
    sale_price: 19500,
    purchase_price: 15200,
    avg_cost: 15200,
    stock_quantity: 520,
    min_stock_alert: 60,
  },
  {
    id: "p0000000-0000-0000-0000-000000000006",
    code: "SRV-001",
    name: "خدمة الشحن والتسليم المبرد إلى باب العميل",
    sku: "SRV-DELIV-KRT",
    barcode: "SRV-DELIV",
    type: "service",
    unit: "رحلة",
    sale_price: 35000,
    purchase_price: 0,
    avg_cost: 0,
    stock_quantity: 9999,
    min_stock_alert: 0,
  },
];

// 9. Sample Sales Invoices (فواتير المبيعات النموذجية)
export const DEMO_SALES_INVOICES: DemoSalesInvoice[] = [
  {
    id: "inv00000-0000-0000-0000-000000000001",
    number: "INV-00001",
    party_id: "c0000000-0000-0000-0000-000000000001",
    customer_name: "شركة البركة للحلويات والمخبوزات",
    customer_code: "C-001",
    branch_id: "b0000000-0000-0000-0000-000000000001",
    branch_name: "الخرطوم - المركز الرئيسي",
    warehouse_id: "w0000000-0000-0000-0000-000000000001",
    warehouse_name: "المستودع المركزي - سوبا",
    invoice_date: new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0],
    due_date: new Date(Date.now() + 12 * 86400000).toISOString().split("T")[0],
    currency_code: "SDG",
    status: "partially_paid",
    subtotal: 5120000,
    discount_total: 120000,
    tax_total: 0,
    total: 5000000,
    amount_paid: 2500000,
    amount_credited: 0,
    notes: "توريد طلبية خاصة لمخبز الخرطوم بحري - سداد 50% عبر بنكك",
    items: [
      {
        id: "1",
        product_id: "p0000000-0000-0000-0000-000000000001",
        product_name: "سكر كنانة أبيض - شوال 50 كجم",
        description: "سكر كنانة أبيض ممتاز إنتاج حديث",
        quantity: 50,
        unit_price: 88000,
        discount_pct: 2,
        line_total: 4312000,
      },
      {
        id: "2",
        product_id: "p0000000-0000-0000-0000-000000000003",
        product_name: "زيت طعام صباح نقي - كرتونة",
        description: "زيت صباح 4 لتر صافي",
        quantity: 25,
        unit_price: 32000,
        discount_pct: 0,
        line_total: 800000,
      },
    ],
  },
  {
    id: "inv00000-0000-0000-0000-000000000002",
    number: "INV-00002",
    party_id: "c0000000-0000-0000-0000-000000000002",
    customer_name: "محلات الأمل للمواد التموينية - أم درمان",
    customer_code: "C-002",
    branch_id: "b0000000-0000-0000-0000-000000000002",
    branch_name: "فرع أم درمان - سوق ليبيا",
    warehouse_id: "w0000000-0000-0000-0000-000000000002",
    warehouse_name: "مستودع أم درمان التوزيعي",
    invoice_date: new Date(Date.now() - 1 * 86400000).toISOString().split("T")[0],
    due_date: new Date(Date.now() + 29 * 86400000).toISOString().split("T")[0],
    currency_code: "SDG",
    status: "posted",
    subtotal: 2470000,
    discount_total: 0,
    tax_total: 0,
    total: 2470000,
    amount_paid: 0,
    amount_credited: 0,
    notes: "تسليم فوري من مستودع أم درمان - استحقاق خلال 30 يوم",
    items: [
      {
        id: "1",
        product_id: "p0000000-0000-0000-0000-000000000002",
        product_name: "دقيق سيقا ممتاز - كيس 25 كجم",
        description: "دقيق سيقا ممتاز 25 كجم",
        quantity: 40,
        unit_price: 44000,
        discount_pct: 0,
        line_total: 1760000,
      },
      {
        id: "2",
        product_id: "p0000000-0000-0000-0000-000000000004",
        product_name: "شاي الغزالتين الأصلي - كرتونة 10 كجم",
        description: "شاي أسود حبيبات غزالتين",
        quantity: 10,
        unit_price: 68000,
        discount_pct: 0,
        line_total: 680000,
      },
      {
        id: "3",
        product_id: "p0000000-0000-0000-0000-000000000006",
        product_name: "خدمة الشحن والتسليم المبرد",
        description: "توصيل إلى متجر العميل بسوق أم درمان",
        quantity: 1,
        unit_price: 30000,
        discount_pct: 0,
        line_total: 30000,
      },
    ],
  },
  {
    id: "inv00000-0000-0000-0000-000000000003",
    number: "INV-00003",
    party_id: "c0000000-0000-0000-0000-000000000003",
    customer_name: "مؤسسة النور للتجارة والتوزيع",
    customer_code: "C-003",
    branch_id: "b0000000-0000-0000-0000-000000000003",
    branch_name: "فرع بحري - المنطقة الصناعية",
    warehouse_id: "w0000000-0000-0000-0000-000000000003",
    warehouse_name: "مستودع بحري للمواد الخام",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 20 * 86400000).toISOString().split("T")[0],
    currency_code: "SDG",
    status: "paid",
    subtotal: 1950000,
    discount_total: 50000,
    tax_total: 0,
    total: 1900000,
    amount_paid: 1900000,
    amount_credited: 0,
    notes: "تم السداد كاملاً نقداً في الخزينة الرئيسية",
    items: [
      {
        id: "1",
        product_id: "p0000000-0000-0000-0000-000000000005",
        product_name: "صابون غسيل أبيض لؤلؤة - كرتونة",
        description: "صابون غسيل لؤلؤة عالي الجودة",
        quantity: 100,
        unit_price: 19500,
        discount_pct: 2.56,
        line_total: 1900000,
      },
    ],
  },
  {
    id: "inv00000-0000-0000-0000-000000000004",
    number: "INV-00004",
    party_id: "c0000000-0000-0000-0000-000000000004",
    customer_name: "شركة الفجر للاستيراد والتصدير - بورتسودان",
    customer_code: "C-004",
    branch_id: "b0000000-0000-0000-0000-000000000004",
    branch_name: "فرع بورتسودان - الميناء الشمالي",
    warehouse_id: "w0000000-0000-0000-0000-000000000004",
    warehouse_name: "مستودع التخليص الجمركي - بورتسودان",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0],
    currency_code: "SDG",
    status: "draft",
    subtotal: 7040000,
    discount_total: 240000,
    tax_total: 0,
    total: 6800000,
    amount_paid: 0,
    amount_credited: 0,
    notes: "مسودة فاتورة بانتظار الاعتماد والمراجعة مع إدارة الميناء",
    items: [
      {
        id: "1",
        product_id: "p0000000-0000-0000-0000-000000000001",
        product_name: "سكر كنانة أبيض - شوال 50 كجم",
        description: "شوال سكر كنانة للتصدير",
        quantity: 80,
        unit_price: 88000,
        discount_pct: 3.4,
        line_total: 6800000,
      },
    ],
  },
];

// 10. Sample Purchase Invoices (فواتير المشتريات)
export const DEMO_PURCHASE_INVOICES: DemoPurchaseInvoice[] = [
  {
    id: "bill0000-0000-0000-0000-000000000001",
    number: "BILL-00001",
    supplier_reference: "KN-INV-9921",
    party_id: "s0000000-0000-0000-0000-000000000001",
    supplier_name: "شركة سكر كنانة المحدودة",
    supplier_code: "S-001",
    branch_id: "b0000000-0000-0000-0000-000000000001",
    branch_name: "الخرطوم - المركز الرئيسي",
    warehouse_id: "w0000000-0000-0000-0000-000000000001",
    warehouse_name: "المستودع المركزي - سوبا",
    invoice_date: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
    due_date: new Date(Date.now() + 23 * 86400000).toISOString().split("T")[0],
    currency_code: "SDG",
    status: "paid",
    subtotal: 15200000,
    discount_total: 0,
    tax_total: 0,
    total: 15200000,
    amount_paid: 15200000,
    notes: "شراء وتوريد 200 شوال سكر كنانة مباشرة من المصنع",
    items: [
      {
        id: "1",
        product_id: "p0000000-0000-0000-0000-000000000001",
        product_name: "سكر كنانة أبيض - شوال 50 كجم",
        description: "شوال سكر 50 كجم دفعة نوفمبر 2026",
        quantity: 200,
        unit_price: 76000,
        discount_pct: 0,
        line_total: 15200000,
      },
    ],
  },
  {
    id: "bill0000-0000-0000-0000-000000000002",
    number: "BILL-00002",
    supplier_reference: "SQ-SUP-4810",
    party_id: "s0000000-0000-0000-0000-000000000002",
    supplier_name: "شركة سيقا للأغذية (مجموعة دال)",
    supplier_code: "S-002",
    branch_id: "b0000000-0000-0000-0000-000000000003",
    branch_name: "فرع بحري - المنطقة الصناعية",
    warehouse_id: "w0000000-0000-0000-0000-000000000003",
    warehouse_name: "مستودع بحري للمواد الخام",
    invoice_date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    due_date: new Date(Date.now() + 23 * 86400000).toISOString().split("T")[0],
    currency_code: "SDG",
    status: "posted",
    subtotal: 11250000,
    discount_total: 0,
    tax_total: 0,
    total: 11250000,
    amount_paid: 0,
    notes: "توريد 300 كيس دقيق سيقا فاخر إلى مستودع بحري",
    items: [
      {
        id: "1",
        product_id: "p0000000-0000-0000-0000-000000000002",
        product_name: "دقيق سيقا ممتاز - كيس 25 كجم",
        description: "دقيق سيقا إنتاج الأسبوع الحالي",
        quantity: 300,
        unit_price: 37500,
        discount_pct: 0,
        line_total: 11250000,
      },
    ],
  },
];
