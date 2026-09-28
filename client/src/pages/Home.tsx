import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpLeft,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Copy,
  CreditCard,
  Database,
  ExternalLink,
  FileCheck2,
  FileClock,
  FilePlus2,
  Filter,
  LayoutDashboard,
  Menu,
  MessageCircle,
  MoreHorizontal,
  PackageCheck,
  PanelRightClose,
  Pencil,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Smartphone,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Trash2,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type View = "overview" | "orders" | "customers" | "finance" | "notifications" | "settings";
type OrderStatus = "جديد" | "جاهز للرفع" | "تم الرفع" | "قيد المعالجة" | "تمت محاولة" | "مرفوض" | "مكتمل" | "ملغي";
type PaymentStatus = "مدفوع" | "آجل" | "مدفوع جزئيًا";

type Order = {
  id: string;
  customer: string;
  phone: string;
  model: string;
  serial: string;
  imei: string;
  username: string;
  email: string;
  received: string;
  purchased: string;
  uploaded: string;
  created: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  price: number;
  paid: number;
  dueDate?: string;
  history: { label: string; date: string; tone: "teal" | "blue" | "orange" | "red" | "green" }[];
};

type Customer = { id: number; name: string; phone: string; orders: number; paid: number; due: number; created: string };

const initialOrders: Order[] = [];

const initialCustomers: Customer[] = [];

const iphoneModels = [
  "iPhone 17 Pro Max", "iPhone 17 Pro", "iPhone 17 Air", "iPhone 17",
  "iPhone 16e", "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus", "iPhone 16",
  "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
  "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14",
  "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13", "iPhone 13 mini",
  "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12", "iPhone 12 mini",
  "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11", "iPhone XS Max",
  "iPhone XS", "iPhone XR", "iPhone X", "iPhone 8 Plus", "iPhone 8",
  "iPhone 7 Plus", "iPhone 7", "iPhone SE (الجيل الثالث)", "iPhone SE (الجيل الثاني)",
];

const navSections: { title: string; items: { id: View; label: string; icon: LucideIcon; count?: number }[] }[] = [
  { title: "الرئيسية", items: [{ id: "overview", label: "لوحة التحكم", icon: LayoutDashboard }] },
  { title: "إدارة الطلبات", items: [{ id: "orders", label: "كل الطلبات", icon: ClipboardList }, { id: "customers", label: "العملاء", icon: Users }] },
  { title: "الماليات والتواصل", items: [{ id: "finance", label: "المالية والديون", icon: WalletCards }, { id: "notifications", label: "سجل WhatsApp", icon: MessageCircle }, { id: "settings", label: "الإعدادات", icon: Settings2 }] },
];

const statusMeta: Record<OrderStatus, { className: string; dot: string }> = {
  "جديد": { className: "bg-[#f0f3f4] text-[#617177]", dot: "bg-[#9ba9ad]" },
  "جاهز للرفع": { className: "bg-[#edf0ff] text-[#6072c7]", dot: "bg-[#7d8cda]" },
  "تم الرفع": { className: "bg-[#e9f1ff] text-[#4d79bb]", dot: "bg-[#6d98d2]" },
  "قيد المعالجة": { className: "bg-[#fff2dd] text-[#ad712d]", dot: "bg-[#dfa052]" },
  "تمت محاولة": { className: "bg-[#f4e9ff] text-[#8d62b3]", dot: "bg-[#ad7bd2]" },
  "مرفوض": { className: "bg-[#ffebeb] text-[#bf5252]", dot: "bg-[#d76d6d]" },
  "مكتمل": { className: "bg-[#e6f6ef] text-[#2c8a61]", dot: "bg-[#43aa7a]" },
  "ملغي": { className: "bg-[#f2eded] text-[#806d6d]", dot: "bg-[#9b8989]" },
};

const paymentMeta: Record<PaymentStatus, string> = {
  "مدفوع": "bg-[#e6f6ef] text-[#2c8a61]",
  "آجل": "bg-[#fff0dc] text-[#ad712d]",
  "مدفوع جزئيًا": "bg-[#e9f1ff] text-[#4d79bb]",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value) + " ر.س";
}

const notificationTemplateOptions = [
  { key: "received", label: "عند إنشاء الطلب" },
  ...(["جديد", "جاهز للرفع", "تم الرفع", "تمت محاولة", "قيد المعالجة", "مكتمل", "مرفوض", "ملغي"] as OrderStatus[]).map(status => ({ key: status, label: `عند حالة: ${status}` })),
];
const defaultNotificationTemplates: Record<string, string> = {
  received: `مرحبًا {اسم_العميل} 👋\n\nتم استلام طلبك بنجاح ✅\n\n━━━━━━━━━━━━━━\n📋 تفاصيل الطلب\n\n🔹 رقم الطلب: {رقم_الطلب}\n🔹 اسم العميل: {اسم_العميل}\n🔹 موديل الجهاز: {موديل_الجهاز}\n🔹 IMEI: {IMEI}\n🔹 Serial: {Serial}\n🔹 حالة الجهاز: {الحالة} {رمز_الحالة}\n🔹 المبلغ المتبقي: {المبلغ_المتبقي}\n━━━━━━━━━━━━━━\n\n📲 سنوافيك بأي تحديث جديد بخصوص طلبك عبر WhatsApp.\n\nشكرًا لاختيارك iCloud Desk 🌟\nنتمنى لك تجربة مميزة 🤍`,
  status: `مرحبًا {اسم_العميل} 👋\n\nتم تحديث حالة طلبك 🔔\n\n━━━━━━━━━━━━━━\n📋 تفاصيل الطلب\n\n🔹 رقم الطلب: {رقم_الطلب}\n🔹 اسم العميل: {اسم_العميل}\n🔹 موديل الجهاز: {موديل_الجهاز}\n🔹 IMEI: {IMEI}\n🔹 Serial: {Serial}\n🔹 حالة الجهاز: {الحالة} {رمز_الحالة}\n🔹 المبلغ المتبقي: {المبلغ_المتبقي}\n━━━━━━━━━━━━━━\n\n{رسالة_الحالة}\n\nشكرًا لاختيارك iCloud Desk 🌟\nنتمنى لك تجربة مميزة 🤍`,
};
const statusMessage: Record<string, string> = {
  "مكتمل": "✅ تم الانتهاء من طلبك بنجاح، شكرًا لثقتك بنا.",
  "مرفوض": "❌ نعتذر، تعذر إكمال الطلب. يرجى التواصل معنا للمزيد من التفاصيل.",
};
function getNotificationTemplates(): Record<string, string> {
  const defaults: Record<string, string> = { ...defaultNotificationTemplates };
  notificationTemplateOptions.slice(1).forEach(option => { defaults[option.key] = defaultNotificationTemplates.status; });
  try {
    const stored = JSON.parse(localStorage.getItem("icloud-desk-notification-templates") || "{}");
    return { ...defaults, ...(stored && typeof stored === "object" ? stored : {}) };
  } catch { return defaults; }
}
function renderNotificationTemplate(template: string, order: Order, statusEmoji: string) {
  const remaining = Math.max(order.price - order.paid, 0);
  const values: Record<string, string> = {
    "اسم_العميل": order.customer,
    "رقم_الطلب": order.id,
    "موديل_الجهاز": order.model,
    "IMEI": order.imei,
    "Serial": order.serial,
    "الحالة": order.status,
    "رمز_الحالة": statusEmoji,
    "المبلغ_المتبقي": formatCurrency(remaining),
    "رسالة_الحالة": statusMessage[order.status] || "📲 سنوافيك بأي تحديث جديد بخصوص طلبك عبر WhatsApp.",
  };
  return template.replace(/\{([^}]+)\}/g, (_, key: string) => values[key] ?? `{${key}}`);
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = statusMeta[status];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${meta.className}`}><span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{status}</span>;
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${paymentMeta[status]}`}>{status}</span>;
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div>{eyebrow && <p className="mb-1 text-[11px] font-bold tracking-[.18em] text-[#79a6a4]">{eyebrow}</p>}<h2 className="text-xl font-bold text-[#20343a] sm:text-[22px]">{title}</h2>{description && <p className="mt-1 text-sm text-[#7a898f]">{description}</p>}</div>{action}</div>;
}

function IconButton({ icon: Icon, label, onClick, className = "" }: { icon: LucideIcon; label: string; onClick?: () => void; className?: string }) {
  return <button aria-label={label} title={label} onClick={onClick} className={`tap inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#73848a] hover:bg-[#edf3f3] hover:text-[#2c5960] ${className}`}><Icon className="h-4 w-4" /></button>;
}

export default function Home() {
  const [location, setLocation] = useLocation();
  const routeView: View = (["orders", "customers", "finance", "notifications", "settings"] as string[]).includes(location.replace("/", "")) ? location.replace("/", "") as View : "overview";
  const [view, setView] = useState<View>(routeView);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [savedModels, setSavedModels] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("icloud-desk-models") || "[]"); } catch { return []; }
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const workspaceQuery = trpc.workspace.get.useQuery(undefined, { retry: false });
  const saveWorkspace = trpc.workspace.save.useMutation();
  const cloudSettings = trpc.settings.getWhatsApp.useQuery(undefined, { retry: false });
  useEffect(() => {
    if (!cloudSettings.data) return;
    if (cloudSettings.data.apiToken) localStorage.setItem("icloud-desk-whatsapp-key", cloudSettings.data.apiToken);
    if (Object.keys(cloudSettings.data.templates || {}).length) localStorage.setItem("icloud-desk-notification-templates", JSON.stringify(cloudSettings.data.templates));
  }, [cloudSettings.data]);
  useEffect(() => {
    if (workspaceQuery.isError) {
      setWorkspaceLoaded(true);
      toast.error("تعذر تحميل البيانات السحابية؛ تحقق من الاتصال قبل المتابعة");
    }
  }, [workspaceQuery.isError]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);

  const searchResults = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return [];
    return orders.filter(order => [order.id, order.customer, order.phone, order.serial, order.imei, order.email, order.model].some(value => value.toLowerCase().includes(needle)));
  }, [orders, searchTerm]);

  useEffect(() => {
    if (!workspaceQuery.data || workspaceLoaded) return;
    const loadedCustomers = workspaceQuery.data.customers as Customer[];
    const loadedOrders = (workspaceQuery.data.orders as Order[]).map(order => ({ ...order, phone: loadedCustomers.find(customer => customer.name === order.customer)?.phone || order.phone || "—" }));
    setOrders(loadedOrders);
    setCustomers(loadedCustomers);
    if (workspaceQuery.data.savedModels.length) {
      setSavedModels(current => Array.from(new Set([...workspaceQuery.data!.savedModels, ...current])));
      localStorage.setItem("icloud-desk-models", JSON.stringify(workspaceQuery.data.savedModels));
    }
    setWorkspaceLoaded(true);
  }, [workspaceQuery.data, workspaceLoaded]);

  const persistWorkspace = (nextOrders: Order[], nextCustomers: Customer[], nextModels = savedModels) => {
    if (!workspaceLoaded) return;
    saveWorkspace.mutate({ orders: nextOrders, customers: nextCustomers, savedModels: nextModels }, { onError: () => toast.error("تعذر حفظ البيانات سحابيًا؛ أعد المحاولة") });
  };

  const dueTotal = orders.reduce((sum, order) => sum + Math.max(order.price - order.paid, 0), 0);
  const paidTotal = orders.reduce((sum, order) => sum + order.paid, 0);
  const revenueTotal = orders.reduce((sum, order) => sum + order.price, 0);
  const debtOrders = orders.filter(order => order.price > order.paid);

  const navigate = (next: View) => { setView(next); setLocation(next === "overview" ? "/" : `/${next}`); setMobileNav(false); setSearchTerm(""); };

  const statusEmoji: Record<OrderStatus, string> = { "جديد": "📥", "تم الرفع": "📤", "جاهز للرفع": "📦", "تمت محاولة": "🔁", "قيد المعالجة": "⚙️", "مكتمل": "✅", "مرفوض": "❌", "ملغي": "🚫" };
  const buildOrderMessage = (order: Order, kind: "received" | "status") => {
    const templates = getNotificationTemplates();
    const key = kind === "received" ? "received" : order.status;
    const template = templates[key] || templates.status || defaultNotificationTemplates.status;
    return renderNotificationTemplate(template, order, statusEmoji[order.status]);
  };
  const sendWhatsAppMessage = async (order: Order, kind: "received" | "status") => {
    const apiToken = localStorage.getItem("icloud-desk-whatsapp-key") || sessionStorage.getItem("icloud-desk-whatsapp-key") || "";
    const linkedCustomer = customers.find(customer => customer.name === order.customer);
    const phone = (linkedCustomer?.phone || order.phone || "").replace(/\D/g, "");
    if (!apiToken) { toast.warning("تم الحفظ، لكن لم يُرسل الإشعار: احفظ API Key من الإعدادات أولًا"); return false; }
    if (!phone || phone === "—") { toast.warning("تم الحفظ، لكن لا يوجد رقم WhatsApp للعميل"); return false; }
    try {
      const response = await fetch("/api/whatsapp/send-test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiUrl: "https://plutowa.online/api", apiToken, to: phone, text: buildOrderMessage(order, kind) }) });
      const result = await response.json().catch(() => ({ ok: false, message: "استجابة غير مفهومة" }));
      if (result.ok) { toast.success("تم حفظ الطلب وإرسال إشعار WhatsApp بنجاح"); return true; }
      toast.error(`تم الحفظ، لكن تعذر إرسال WhatsApp: ${result.message || "خطأ غير معروف"}`);
    } catch { toast.error("تم الحفظ، لكن تعذر الاتصال بـ WhatsApp لإرسال الإشعار"); }
    return false;
  };

  const createOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workspaceLoaded) { toast.warning("جارٍ تحميل البيانات السحابية، حاول بعد لحظات"); return; }
    const form = new FormData(event.currentTarget);
    const serial = String(form.get("serial") || "").trim().toUpperCase();
    if (!serial) { toast.error("أدخل Serial Number أولًا"); return; }
    const duplicate = orders.find(order => order.serial.toLowerCase() === serial.toLowerCase());
    if (duplicate) { toast.error(`هذا الجهاز مسجل مسبقًا في النظام — ${duplicate.id}`); setShowOrderModal(false); setSelectedOrder(duplicate); return; }
    const model = String(form.get("model") || "").trim() || "iPhone";
    let nextModels = savedModels;
    if (!iphoneModels.includes(model) && !savedModels.includes(model)) {
      nextModels = [model, ...savedModels];
      setSavedModels(nextModels);
      localStorage.setItem("icloud-desk-models", JSON.stringify(nextModels));
      toast.success(`تم حفظ موديل ${model} للاستخدام لاحقًا`);
    }
    const price = Number(form.get("price") || 0);
    const paid = Number(form.get("paid") || 0);
    const id = `REQ-2026-${String(orders.length + 1).padStart(5, "0")}`;
    const customer = String(form.get("customer") || "عميل جديد");
    const linkedCustomer = customers.find(item => item.name === customer);
    if (!linkedCustomer) { toast.error("اختر عميلًا من قائمة العملاء أولًا؛ رقم WhatsApp يؤخذ تلقائيًا من ملفه"); return; }
    const phone = linkedCustomer.phone?.trim() || "—";
    const now = "23 سبتمبر 2026 · الآن";
    const newOrder: Order = { id, customer, phone, model, serial, imei: String(form.get("imei") || "—"), username: String(form.get("username") || "new_request"), email: String(form.get("email") || "—"), received: String(form.get("received") || "23 سبتمبر 2026"), purchased: String(form.get("purchased") || "23 سبتمبر 2026"), uploaded: "—", created: now, status: "جديد", paymentStatus: paid === 0 ? "آجل" : paid >= price ? "مدفوع" : "مدفوع جزئيًا", price, paid, history: [{ label: "تم إنشاء الطلب", date: now, tone: "teal" }] };
    const nextOrders = [newOrder, ...orders];
    setOrders(nextOrders);
    persistWorkspace(nextOrders, customers, nextModels);
    setShowOrderModal(false);
    toast.success(`تم إنشاء الطلب ${id}`);
    setSelectedOrder(newOrder);
    void sendWhatsAppMessage(newOrder, "received");
  };

  const createCustomer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workspaceLoaded) { toast.warning("جارٍ تحميل البيانات السحابية، حاول بعد لحظات"); return; }
    const form = new FormData(event.currentTarget);
    const customer: Customer = { id: Date.now(), name: String(form.get("name") || "عميل جديد"), phone: String(form.get("phone") || "—"), orders: 0, paid: 0, due: 0, created: "23 سبتمبر 2026" };
    const nextCustomers = [customer, ...customers];
    setCustomers(nextCustomers);
    persistWorkspace(orders, nextCustomers);
    setShowCustomerModal(false);
    toast.success("تمت إضافة العميل بنجاح");
  };

  const addPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!showPaymentModal) return;
    const amount = Number(new FormData(event.currentTarget).get("amount") || 0);
    if (!amount || amount <= 0) { toast.error("أدخل مبلغًا صحيحًا"); return; }
    const updated = { ...showPaymentModal, paid: Math.min(showPaymentModal.price, showPaymentModal.paid + amount) };
    updated.paymentStatus = updated.paid >= updated.price ? "مدفوع" : "مدفوع جزئيًا";
    const nextOrders = orders.map(order => order.id === updated.id ? updated : order);
    setOrders(nextOrders);
    persistWorkspace(nextOrders, customers);
    setSelectedOrder(selectedOrder?.id === updated.id ? updated : selectedOrder);
    setShowPaymentModal(null);
    toast.success(`تم تسجيل دفعة ${formatCurrency(amount)}`);
  };

  const updateOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingOrder) return;
    const form = new FormData(event.currentTarget);
    const customer = String(form.get("customer") || editingOrder.customer).trim();
    const linkedCustomer = customers.find(item => item.name === customer);
    if (!linkedCustomer) { toast.error("اختر عميلًا صحيحًا من قائمة العملاء"); return; }
    const price = Number(form.get("price") || 0);
    const paid = Math.min(Math.max(Number(form.get("paid") || 0), 0), Math.max(price, 0));
    const nextStatus = String(form.get("status") || editingOrder.status) as OrderStatus;
    const now = new Date().toLocaleDateString("ar-SA");
    const history = nextStatus !== editingOrder.status ? [...editingOrder.history, { label: `تم تغيير الحالة إلى ${nextStatus}`, date: `${now} · الآن`, tone: nextStatus === "مرفوض" ? "red" : nextStatus === "مكتمل" ? "green" : "blue" } as const] : editingOrder.history;
    const updated: Order = {
      ...editingOrder,
      customer,
      phone: linkedCustomer.phone?.trim() || "—",
      model: String(form.get("model") || "iPhone").trim(),
      serial: String(form.get("serial") || "—").trim().toUpperCase(),
      imei: String(form.get("imei") || "—").trim(),
      username: String(form.get("username") || "new_request").trim(),
      email: String(form.get("email") || "—").trim(),
      purchased: String(form.get("purchased") || editingOrder.purchased).trim(),
      received: String(form.get("received") || editingOrder.received).trim(),
      status: nextStatus,
      paymentStatus: paid >= price ? "مدفوع" : paid === 0 ? "آجل" : "مدفوع جزئيًا",
      price,
      paid,
      history,
    };
    const nextOrders = orders.map(order => order.id === updated.id ? updated : order);
    setOrders(nextOrders); persistWorkspace(nextOrders, customers); setSelectedOrder(updated); setEditingOrder(null); toast.success("تم تعديل جميع بيانات الطلب وحفظها سحابيًا");
  };
  const deleteOrder = (order: Order) => {
    if (!window.confirm(`هل تريد حذف الطلب ${order.id}؟`)) return;
    const nextOrders = orders.filter(item => item.id !== order.id);
    setOrders(nextOrders); persistWorkspace(nextOrders, customers); setSelectedOrder(null); toast.success("تم حذف الطلب وحفظ التغيير سحابيًا");
  };
  const updateCustomer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCustomer) return;
    const form = new FormData(event.currentTarget);
    const oldName = editingCustomer.name;
    const name = String(form.get("name") || oldName).trim();
    const phone = String(form.get("phone") || editingCustomer.phone).trim();
    const nextCustomers = customers.map(customer => customer.id === editingCustomer.id ? { ...customer, name, phone } : customer);
    const nextOrders = orders.map(order => order.customer === oldName ? { ...order, customer: name, phone } : order);
    setCustomers(nextCustomers); setOrders(nextOrders); persistWorkspace(nextOrders, nextCustomers); setEditingCustomer(null); toast.success("تم تعديل العميل وحفظ التغيير سحابيًا");
  };
  const deleteCustomer = (customer: Customer) => {
    if (!window.confirm(`هل تريد حذف العميل ${customer.name}؟ لن يتم حذف طلباته.`)) return;
    const nextCustomers = customers.filter(item => item.id !== customer.id);
    setCustomers(nextCustomers); persistWorkspace(orders, nextCustomers); toast.success("تم حذف العميل وحفظ التغيير سحابيًا");
  };

  return <div className="min-h-screen bg-[#f5f7f8] text-[#18262b]" dir="rtl">
    <div className="flex min-h-screen">
      {mobileNav && <button aria-label="إغلاق القائمة" className="fixed inset-0 z-30 bg-[#102c33]/45 lg:hidden" onClick={() => setMobileNav(false)} />}
      <aside className={`fixed inset-y-0 right-0 z-40 flex w-[272px] shrink-0 flex-col bg-[#102c33] text-[#dae7e7] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileNav ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex h-[82px] items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#75b8b2] text-[#102c33] shadow-lg shadow-[#75b8b2]/10"><ShieldCheck className="h-5 w-5" strokeWidth={2.3} /></div>
          <div><div className="font-display text-[17px] font-extrabold tracking-tight text-white">iCloud <span className="text-[#82c2bc]">Desk</span></div><div className="mt-0.5 text-[10px] tracking-[.16em] text-[#91aaad]">ORDER OPERATIONS</div></div>
          <button onClick={() => setMobileNav(false)} className="mr-auto rounded-lg p-2 text-[#a9c0c1] hover:bg-white/10 lg:hidden"><X className="h-5 w-5" /></button>
        </div>
        <div className="nav-scroll flex-1 overflow-y-auto px-4 py-6">
          {navSections.map(section => <div key={section.title} className="mb-7"><p className="mb-2 px-3 text-[10px] font-bold tracking-[.16em] text-[#708d91]">{section.title}</p><div className="space-y-1">{section.items.map(item => { const active = view === item.id; return <button key={item.id} onClick={() => navigate(item.id)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${active ? "bg-[#75b8b2] font-bold text-[#102c33] shadow-lg shadow-[#0a1c20]/20" : "text-[#b8cbcc] hover:bg-white/8 hover:text-white"}`}><item.icon className={`h-[18px] w-[18px] ${active ? "text-[#102c33]" : "text-[#8eafb0] group-hover:text-[#b9d9d6]"}`} /> <span>{item.label}</span>{item.count && <span className={`mr-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? "bg-[#102c33]/10 text-[#102c33]" : "bg-white/8 text-[#8eaaad]"}`}>{item.count}</span>}</button> })}</div></div>)}
          <div className="rounded-2xl border border-[#70ada8]/20 bg-[#1a454b] p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold text-[#d6e9e8]">حالة النظام</span><span className="flex items-center gap-1.5 text-[10px] text-[#91d0c9]"><span className="h-1.5 w-1.5 rounded-full bg-[#91d0c9]" /> متصل</span></div><p className="text-[11px] leading-5 text-[#98b7b9]">كل عمليات الطلبات والمزامنة تعمل بشكل طبيعي.</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#0f3035]"><div className="h-full w-[92%] rounded-full bg-[#75b8b2]" /></div></div>
        </div>
        <div className="border-t border-white/10 p-4"><div className="flex items-center gap-3 rounded-xl p-2"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d1e6e3] text-xs font-bold text-[#2c5960]">م.ع</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">محمد العتيبي</p><p className="truncate text-[11px] text-[#8eaaad]">مدير النظام</p></div><MoreHorizontal className="mr-auto h-4 w-4 text-[#759397]" /></div></div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-[#e2e9ea] bg-[#f5f7f8]/90 backdrop-blur-xl"><div className="container flex h-[82px] items-center gap-3"><button aria-label="فتح القائمة" onClick={() => setMobileNav(true)} className="tap flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#2c5960] shadow-sm lg:hidden"><Menu className="h-5 w-5" /></button><div className="hidden min-w-[150px] lg:block"><p className="text-[11px] font-bold text-[#8b9a9e]">الأربعاء، 23 سبتمبر 2026</p><h1 className="mt-1 text-[18px] font-bold text-[#20343a]">مساء الخير، محمد <span>👋</span></h1></div><div className={`relative mr-auto w-full max-w-[510px] ${searchFocus ? "z-50" : ""}`}><div className="input-shell h-11 border-white bg-white shadow-sm"><Search className="h-[18px] w-[18px] shrink-0 text-[#8ba0a3]" /><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} onFocus={() => setSearchFocus(true)} onBlur={() => setTimeout(() => setSearchFocus(false), 150)} placeholder="ابحث بالـ Serial، IMEI، اسم العميل أو رقم الطلب..." /><kbd className="hidden rounded-md bg-[#f0f4f4] px-1.5 py-0.5 text-[10px] text-[#95a3a6] sm:block">⌘ K</kbd></div>{searchFocus && searchTerm && <div className="absolute left-0 right-0 top-14 overflow-hidden rounded-2xl border border-[#e0e9e9] bg-white p-2 shadow-2xl shadow-[#20454d]/10">{searchResults.length ? searchResults.slice(0, 4).map(order => <button key={order.id} onMouseDown={() => { setSelectedOrder(order); setSearchTerm(""); }} className="flex w-full items-center gap-3 rounded-xl p-3 text-right hover:bg-[#f2f7f7]"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e9f3f2] text-[#2c7776]"><Smartphone className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#264047]">{order.serial} <span className="mr-1 text-xs font-normal text-[#91a1a4]">· {order.customer}</span></p><p className="mt-0.5 text-[11px] text-[#859499]">{order.id} · {order.model}</p></div><StatusBadge status={order.status} /></button>) : <div className="p-5 text-center text-sm text-[#7e8d91]">لا توجد نتائج مطابقة لـ <span className="font-semibold text-[#2c5960]">{searchTerm}</span></div>}{searchResults.length > 4 && <div className="border-t border-[#edf1f1] px-3 py-2 text-center text-xs text-[#718287]">عرض أول 4 نتائج من {searchResults.length}</div>}</div>}</div><div className="hidden items-center gap-2 sm:flex"><IconButton icon={Bell} label="الإشعارات" className="bg-white shadow-sm" /><div className="mx-1 h-7 w-px bg-[#dfe7e8]" /><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d1e6e3] text-xs font-bold text-[#2c5960]">م.ع</div></div></div></header>
        <div className="container py-7 lg:py-8">
          {view === "overview" && <DashboardView orders={orders} dueTotal={dueTotal} paidTotal={paidTotal} revenueTotal={revenueTotal} onNavigate={navigate} onSelect={setSelectedOrder} onAdd={() => setShowOrderModal(true)} />}
          {view === "orders" && <OrdersView orders={orders} onAdd={() => setShowOrderModal(true)} onSelect={setSelectedOrder} onPay={setShowPaymentModal} onEdit={setEditingOrder} onDelete={deleteOrder} />}
          {view === "customers" && <CustomersView customers={customers} orders={orders} onAdd={() => setShowCustomerModal(true)} onSelect={setSelectedOrder} onEdit={setEditingCustomer} onDelete={deleteCustomer} />}
          {view === "finance" && <FinanceView orders={debtOrders} dueTotal={dueTotal} onPay={setShowPaymentModal} />}
          {view === "notifications" && <NotificationsView />}
          {view === "settings" && <SettingsView />}
        </div>
      </main>
    </div>

    {selectedOrder && <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} onPay={() => setShowPaymentModal(selectedOrder)} onStatusChange={(status, notify) => { const eventTone: "teal" | "blue" | "orange" | "red" | "green" = status === "مرفوض" ? "red" : status === "مكتمل" ? "green" : "orange"; const updated = { ...selectedOrder, status, history: [...selectedOrder.history, { label: `تم تحديث الحالة إلى ${status}`, date: "23/09/2026 · الآن", tone: eventTone }] }; const nextOrders = orders.map(order => order.id === updated.id ? updated : order); setOrders(nextOrders); persistWorkspace(nextOrders, customers); setSelectedOrder(updated); toast.success(notify ? "تم حفظ الحالة وسيتم إرسال إشعار WhatsApp" : "تم حفظ حالة الطلب فقط"); if (notify) void sendWhatsAppMessage(updated, "status"); }} />}
    {showOrderModal && <OrderModal onClose={() => setShowOrderModal(false)} onSubmit={createOrder} customers={customers} savedModels={savedModels} />}
    {showCustomerModal && <CustomerModal onClose={() => setShowCustomerModal(false)} onSubmit={createCustomer} />}
    {showPaymentModal && <PaymentModal order={showPaymentModal} onClose={() => setShowPaymentModal(null)} onSubmit={addPayment} />}
    {editingOrder && <EditOrderModal order={editingOrder} customers={customers} onClose={() => setEditingOrder(null)} onSubmit={updateOrder} />}
    {editingCustomer && <EditCustomerModal customer={editingCustomer} onClose={() => setEditingCustomer(null)} onSubmit={updateCustomer} />}
  </div>;
}

function DashboardView({ orders, dueTotal, paidTotal, revenueTotal, onNavigate, onSelect, onAdd }: { orders: Order[]; dueTotal: number; paidTotal: number; revenueTotal: number; onNavigate: (view: View) => void; onSelect: (order: Order) => void; onAdd: () => void }) {
  const totalOrders = orders.length;
  const processingOrders = orders.filter(order => order.status === "قيد المعالجة").length;
  const completedOrders = orders.filter(order => order.status === "مكتمل").length;
  const statusCounts: { label: string; count: number; color: string; bg: string }[] = [
    { label: "جديد", count: orders.filter(order => order.status === "جديد").length, color: "#8e9da0", bg: "#e4eaeb" }, { label: "تم الرفع", count: orders.filter(order => order.status === "تم الرفع").length, color: "#668cd0", bg: "#e5edfb" }, { label: "قيد المعالجة", count: processingOrders, color: "#dfa052", bg: "#fff0dc" }, { label: "مكتمل", count: completedOrders, color: "#43aa7a", bg: "#e4f5ec" }, { label: "مرفوض", count: orders.filter(order => order.status === "مرفوض").length, color: "#d76d6d", bg: "#ffeaea" },
  ];
  return <div className="rise-in"><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[11px] font-bold tracking-[.18em] text-[#79a6a4]">نظرة عامة · آخر تحديث منذ ٤ دقائق</p><h2 className="text-2xl font-extrabold tracking-tight text-[#20343a] sm:text-[28px]">لوحة التحكم</h2><p className="mt-1.5 text-sm text-[#7a898f]">كل ما تحتاجه لمتابعة طلباتك وأجهزتك في مكان واحد.</p></div><button onClick={onAdd} className="tap inline-flex items-center gap-2 rounded-xl bg-[#2c5960] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#2c5960]/15 hover:bg-[#214a51]"><Plus className="h-4 w-4" /> إضافة طلب جديد</button></div>
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={ClipboardList} label="إجمالي الطلبات" value={String(totalOrders)} delta="0%" note="لا توجد بيانات تجريبية" tone="teal" onClick={() => onNavigate("orders")} /><MetricCard icon={Activity} label="قيد المعالجة" value={String(processingOrders)} delta="0%" note="من إجمالي الطلبات" tone="orange" onClick={() => onNavigate("orders")} /><MetricCard icon={CheckCircle2} label="مكتمل / مفتوح" value={String(completedOrders)} delta="0%" note="هذا الشهر" tone="green" onClick={() => onNavigate("orders")} /><MetricCard icon={CircleDollarSign} label="إجمالي المبالغ المستحقة" value={formatCurrency(dueTotal)} delta="0%" note="لا توجد مديونية حالية" tone="purple" onClick={() => onNavigate("finance")} /></div>
    <div className="mb-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]"><div className="panel-shadow rounded-2xl border border-[#e4ebeb] bg-white p-5 sm:p-6"><div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-semibold text-[#7f8f93]">أداء الطلبات</p><h3 className="mt-1 text-lg font-bold text-[#243d43]">نشاط الطلبات خلال الشهر</h3></div><button className="flex items-center gap-2 rounded-lg border border-[#e5ecec] px-3 py-2 text-xs font-semibold text-[#687c82] hover:bg-[#f4f8f8]">هذا الشهر <ChevronDown className="h-3.5 w-3.5" /></button></div><div className="flex h-[205px] items-end gap-2 border-b border-[#edf1f1] px-1 pb-0 sm:gap-4"><div className="flex h-full w-7 flex-col justify-between pb-3 pt-2 text-[10px] text-[#a2afb1]"><span>60</span><span>40</span><span>20</span><span>0</span></div><div className="relative flex h-full flex-1 items-end justify-around gap-2 pb-0 before:absolute before:inset-x-0 before:top-1/4 before:border-t before:border-dashed before:border-[#eef2f2] before:content-[''] before:shadow-[0_51px_0_#eef2f2,0_102px_0_#eef2f2]"><Bar label="01" height="43%" /><Bar label="05" height="60%" /><Bar label="09" height="50%" active /><Bar label="13" height="75%" /><Bar label="17" height="58%" /><Bar label="21" height="88%" /><Bar label="25" height="71%" /></div></div><div className="mt-3 flex justify-between pl-8 text-[10px] text-[#a2afb1]"><span>01 سبتمبر</span><span>05</span><span>09</span><span>13</span><span>17</span><span>21</span><span>25</span></div><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#78898e]"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#75b8b2]" /> طلبات جديدة</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#dceceb]" /> الطلبات المكتملة</span><span className="mr-auto font-semibold text-[#2c5960]">{totalOrders} طلبًا إجماليًا</span></div></div><div className="panel-shadow rounded-2xl border border-[#e4ebeb] bg-white p-5 sm:p-6"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-semibold text-[#7f8f93]">التوزيع الحالي</p><h3 className="mt-1 text-lg font-bold text-[#243d43]">حالات الطلبات</h3></div><button onClick={() => onNavigate("orders")} className="text-xs font-bold text-[#5d8f8e] hover:text-[#2c5960]">عرض الكل</button></div><div className="flex items-center gap-6"><div className="relative flex h-[140px] w-[140px] shrink-0 items-center justify-center rounded-full" style={{ background: totalOrders ? "conic-gradient(#f0bf7c 0deg 118deg, #7799d9 118deg 205deg, #53ae83 205deg 267deg, #d47575 267deg 292deg, #dfe6e7 292deg 360deg)" : "conic-gradient(#dfe6e7 0deg 360deg)" }}><div className="flex h-[94px] w-[94px] flex-col items-center justify-center rounded-full bg-white"><span className="font-display text-2xl font-extrabold text-[#243d43]">{totalOrders}</span><span className="text-[10px] text-[#8b9b9e]">طلبًا</span></div></div><div className="min-w-0 flex-1 space-y-3">{statusCounts.map(item => <div key={item.label} className="flex items-center justify-between gap-2 text-xs"><span className="flex items-center gap-2 text-[#6f8185]"><i className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.label}</span><span className="font-bold text-[#354d53]">{item.count}</span></div>)}</div></div><div className="mt-5 rounded-xl bg-[#f3f8f7] p-3 text-xs leading-5 text-[#638080]"><TrendingUp className="ml-1 inline h-3.5 w-3.5 text-[#4da18e]" /> ارتفع معدل إنجاز الطلبات <strong className="text-[#2c7e6d]">15.8%</strong> عن الشهر الماضي</div></div></div>
    <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]"><div className="panel-shadow overflow-hidden rounded-2xl border border-[#e4ebeb] bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1f1] px-5 py-5 sm:px-6"><div><p className="text-xs font-semibold text-[#7f8f93]">تحتاج انتباهك</p><h3 className="mt-1 text-lg font-bold text-[#243d43]">آخر الطلبات</h3></div><button onClick={() => onNavigate("orders")} className="flex items-center gap-1 text-xs font-bold text-[#5d8f8e]">عرض كل الطلبات <ChevronLeft className="h-3.5 w-3.5" /></button></div><div className="divide-y divide-[#edf1f1]">{orders.length === 0 ? <div className="p-10 text-center text-sm text-[#849397]">لا توجد طلبات حاليًا. ابدأ بإضافة أول طلب.</div> : orders.slice(0, 5).map(order => <button key={order.id} onClick={() => onSelect(order)} className="flex w-full items-center gap-3 px-5 py-4 text-right transition-colors hover:bg-[#f8fbfb] sm:px-6"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf5f4] text-[#43827f]"><Smartphone className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-display text-xs font-bold text-[#2f535b]">{order.id}</span><StatusBadge status={order.status} /></div><p className="mt-1 truncate text-xs text-[#809094]">{order.customer} <span className="mx-1 text-[#c0cccc]">·</span> {order.model}</p></div><div className="hidden text-left sm:block"><p className="text-sm font-bold text-[#2e474d]">{formatCurrency(order.price)}</p><p className="mt-1 text-[10px] text-[#9aa8aa]">{order.created.split(" · ")[0]}</p></div><ChevronLeft className="h-4 w-4 text-[#bcc8c9]" /></button>)}</div></div><div className="panel-shadow rounded-2xl border border-[#e4ebeb] bg-white p-5 sm:p-6"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-semibold text-[#7f8f93]">ملخص مالي</p><h3 className="mt-1 text-lg font-bold text-[#243d43]">التدفقات المالية</h3></div><button onClick={() => onNavigate("finance")} className="text-xs font-bold text-[#5d8f8e]">التفاصيل</button></div><div className="mb-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#f3f8f7] p-3"><p className="text-[11px] text-[#7c9291]">المبالغ المدفوعة</p><p className="mt-1 font-display text-lg font-extrabold text-[#307f6b]">{formatCurrency(paidTotal)}</p><span className="mt-2 inline-flex items-center gap-1 text-[10px] text-[#45a283]"><ArrowUpLeft className="h-3 w-3" /> 12.4%</span></div><div className="rounded-xl bg-[#fff7eb] p-3"><p className="text-[11px] text-[#9d8a6e]">المتبقي للتحصيل</p><p className="mt-1 font-display text-lg font-extrabold text-[#ae7832]">{formatCurrency(dueTotal)}</p><span className="mt-2 inline-flex items-center gap-1 text-[10px] text-[#d39248]"><ArrowDownLeft className="h-3 w-3" /> 4.8%</span></div></div><div className="space-y-3"><ProgressRow label="معدل التحصيل" value="86%" width="86%" color="#65aaa0" /><ProgressRow label="طلبات بلا مديونية" value="73%" width="73%" color="#7c91d0" /></div><div className="mt-5 flex items-center justify-between border-t border-[#edf1f1] pt-4 text-xs"><span className="text-[#7a8b8f]">إجمالي قيمة الطلبات</span><strong className="text-[#334e54]">{formatCurrency(revenueTotal)}</strong></div></div></div>
  </div>;
}

function MetricCard({ icon: Icon, label, value, delta, note, tone, onClick }: { icon: LucideIcon; label: string; value: string; delta: string; note: string; tone: "teal" | "orange" | "green" | "purple"; onClick: () => void }) {
  const tones = { teal: { icon: "bg-[#e6f3f1] text-[#4d958d]", delta: "bg-[#e8f7f0] text-[#3b9671]" }, orange: { icon: "bg-[#fff1df] text-[#cf8e42]", delta: "bg-[#fff4e5] text-[#c58239]" }, green: { icon: "bg-[#e5f6ed] text-[#43a474]", delta: "bg-[#e8f7f0] text-[#3b9671]" }, purple: { icon: "bg-[#f0ebfc] text-[#9174bd]", delta: "bg-[#f0ebfc] text-[#9174bd]" } }[tone];
  return <button onClick={onClick} className="panel-shadow tap group rounded-2xl border border-[#e4ebeb] bg-white p-5 text-right hover:-translate-y-0.5 hover:shadow-xl"><div className="flex items-start justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones.icon}`}><Icon className="h-5 w-5" /></span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${tones.delta}`}>↑ {delta}</span></div><p className="mt-4 text-xs font-semibold text-[#869599]">{label}</p><p className="mt-1 font-display text-[24px] font-extrabold tracking-tight text-[#273f45]">{value}</p><p className="mt-1 text-[10px] text-[#a1adaf]">{note}</p></button>;
}

function Bar({ label, height, active = false }: { label: string; height: string; active?: boolean }) { return <div className="relative z-10 flex h-full flex-1 flex-col items-center justify-end gap-2"><div className={`w-full max-w-[28px] rounded-t-lg transition-all ${active ? "bg-[#55a59d] shadow-lg shadow-[#55a59d]/20" : "bg-[#dceceb]"}`} style={{ height }} /><span className="text-[10px] text-[#9ba8aa] sm:hidden">{label}</span></div>; }
function ProgressRow({ label, value, width, color }: { label: string; value: string; width: string; color: string }) { return <div><div className="mb-1.5 flex justify-between text-[11px]"><span className="text-[#7c8d91]">{label}</span><strong className="text-[#4e656a]">{value}</strong></div><div className="h-2 rounded-full bg-[#edf2f2]"><div className="h-full rounded-full" style={{ width, background: color }} /></div></div>; }

function OrdersView({ orders, onAdd, onSelect, onPay, onEdit, onDelete }: { orders: Order[]; onAdd: () => void; onSelect: (order: Order) => void; onPay: (order: Order) => void; onEdit: (order: Order) => void; onDelete: (order: Order) => void }) {
  const [status, setStatus] = useState<"الكل" | OrderStatus>("الكل");
  const [payment, setPayment] = useState<"الكل" | PaymentStatus>("الكل");
  const [query, setQuery] = useState("");
  const filtered = orders.filter(order => (status === "الكل" || order.status === status) && (payment === "الكل" || order.paymentStatus === payment) && (!query || [order.id, order.customer, order.serial, order.imei, order.model].some(value => value.toLowerCase().includes(query.toLowerCase()))));
  return <div className="rise-in"><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[11px] font-bold tracking-[.18em] text-[#79a6a4]">إدارة الطلبات</p><h2 className="text-2xl font-extrabold tracking-tight text-[#20343a]">كل الطلبات</h2><p className="mt-1.5 text-sm text-[#7a898f]">تابع دورة الطلب كاملة من الاستلام إلى إتمام فتح الجهاز.</p></div><button onClick={onAdd} className="tap inline-flex items-center gap-2 rounded-xl bg-[#2c5960] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#2c5960]/15"><Plus className="h-4 w-4" /> إضافة طلب</button></div><div className="panel-shadow overflow-hidden rounded-2xl border border-[#e4ebeb] bg-white"><div className="flex flex-wrap items-center gap-3 border-b border-[#edf1f1] p-4"><div className="input-shell min-w-[220px] flex-1"><Search className="h-4 w-4 text-[#93a1a4]" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="بحث في الطلبات..." /></div><div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-[#92a2a5]" /><select value={status} onChange={event => setStatus(event.target.value as typeof status)} className="rounded-lg border border-[#e3ebeb] bg-white px-3 py-2.5 text-xs text-[#607378] outline-none"><option>الكل</option>{Object.keys(statusMeta).map(item => <option key={item}>{item}</option>)}</select><select value={payment} onChange={event => setPayment(event.target.value as typeof payment)} className="hidden rounded-lg border border-[#e3ebeb] bg-white px-3 py-2.5 text-xs text-[#607378] outline-none sm:block"><option>الكل</option><option>مدفوع</option><option>آجل</option><option>مدفوع جزئيًا</option></select></div><button className="rounded-lg border border-[#e3ebeb] p-2.5 text-[#73878b] hover:bg-[#f3f7f7]"><Filter className="h-4 w-4" /></button></div><div className="thin-scroll overflow-x-auto"><table className="w-full min-w-[980px] text-right"><thead><tr className="border-b border-[#edf1f1] bg-[#fbfcfc] text-[11px] text-[#92a0a3]"><th className="px-5 py-4 font-semibold">رقم الطلب</th><th className="px-3 py-4 font-semibold">العميل</th><th className="px-3 py-4 font-semibold">الجهاز / Serial</th><th className="px-3 py-4 font-semibold">تاريخ الاستلام</th><th className="px-3 py-4 font-semibold">الحالة</th><th className="px-3 py-4 font-semibold">الحساب</th><th className="px-5 py-4 font-semibold">إجراء</th></tr></thead><tbody className="divide-y divide-[#edf1f1]">{filtered.map(order => <tr key={order.id} className="group transition-colors hover:bg-[#fbfdfd]"><td className="px-5 py-4"><button onClick={() => onSelect(order)} className="font-display text-xs font-bold text-[#2d686b] hover:underline">{order.id}</button><p className="mt-1 text-[10px] text-[#a0acae]">{order.created.split(" · ")[0]}</p></td><td className="px-3 py-4"><p className="max-w-[180px] truncate text-xs font-bold text-[#3c545a]">{order.customer}</p><p className="mt-1 text-[10px] text-[#98a6a8]">{order.phone}</p></td><td className="px-3 py-4"><p className="text-xs font-semibold text-[#556a6f]">{order.model}</p><p className="mt-1 font-display text-[10px] text-[#8e9da0]">{order.serial}</p></td><td className="px-3 py-4 text-xs text-[#718287]">{order.received}</td><td className="px-3 py-4"><StatusBadge status={order.status} /></td><td className="px-3 py-4"><p className="text-xs font-bold text-[#41585e]">{formatCurrency(order.price)}</p><p className={`mt-1 text-[10px] font-semibold ${order.paid < order.price ? "text-[#cf8e42]" : "text-[#4a9a7c]"}`}>{order.paid < order.price ? `متبقي ${formatCurrency(order.price - order.paid)}` : "مكتمل السداد"}</p></td><td className="px-5 py-4"><div className="flex items-center gap-1"><IconButton icon={ExternalLink} label="عرض التفاصيل" onClick={() => onSelect(order)} />{order.paid < order.price && <IconButton icon={CreditCard} label="تسجيل دفعة" onClick={() => onPay(order)} />}<IconButton icon={Pencil} label="تعديل الطلب" onClick={() => onEdit(order)} /><IconButton icon={Trash2} label="حذف الطلب" onClick={() => onDelete(order)} className="text-[#c56a6a] hover:bg-[#fff0f0]" /></div></td></tr>)}{!filtered.length && <tr><td colSpan={7} className="px-6 py-16 text-center text-sm text-[#829296]">لا توجد طلبات مطابقة للفلاتر الحالية.</td></tr>}</tbody></table></div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f1] px-5 py-4 text-xs text-[#849397]"><span>عرض {filtered.length} من {orders.length} طلبًا</span><div className="flex items-center gap-1"><button className="rounded-lg border border-[#e1e9e9] p-1.5 text-[#a0adaf]"><ChevronRight className="h-3.5 w-3.5" /></button><button className="rounded-lg bg-[#2c5960] px-2.5 py-1.5 font-bold text-white">1</button><button className="rounded-lg border border-[#e1e9e9] px-2.5 py-1.5">2</button><button className="rounded-lg border border-[#e1e9e9] px-2.5 py-1.5">3</button><button className="rounded-lg border border-[#e1e9e9] p-1.5"><ChevronLeft className="h-3.5 w-3.5" /></button></div></div></div></div>;
}

function CustomersView({ customers, orders, onAdd, onSelect, onEdit, onDelete }: { customers: Customer[]; orders: Order[]; onAdd: () => void; onSelect: (order: Order) => void; onEdit: (customer: Customer) => void; onDelete: (customer: Customer) => void }) {
  const [query, setQuery] = useState("");
  const filtered = customers.filter(customer => !query || `${customer.name} ${customer.phone}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="rise-in"><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[11px] font-bold tracking-[.18em] text-[#79a6a4]">إدارة العلاقات</p><h2 className="text-2xl font-extrabold tracking-tight text-[#20343a]">العملاء</h2><p className="mt-1.5 text-sm text-[#7a898f]">ملف موحد لكل عميل وطلباته ومدفوعاته.</p></div><button onClick={onAdd} className="tap inline-flex items-center gap-2 rounded-xl bg-[#2c5960] px-4 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" /> إضافة عميل</button></div><div className="mb-5 grid gap-4 sm:grid-cols-3"><MiniStat label="إجمالي العملاء" value={String(customers.length)} icon={Users} /><MiniStat label="عملاء نشطون" value="0" icon={Activity} /><MiniStat label="عليهم مديونية" value="0" icon={WalletCards} /></div><div className="panel-shadow overflow-hidden rounded-2xl border border-[#e4ebeb] bg-white"><div className="flex items-center justify-between border-b border-[#edf1f1] p-4"><div className="input-shell max-w-sm flex-1"><Search className="h-4 w-4 text-[#93a1a4]" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث عن اسم العميل أو رقمه..." /></div><button className="hidden items-center gap-2 rounded-lg border border-[#e3ebeb] px-3 py-2 text-xs font-semibold text-[#728286] sm:flex"><Filter className="h-3.5 w-3.5" /> تصفية</button></div><div className="thin-scroll overflow-x-auto"><table className="w-full min-w-[760px] text-right"><thead><tr className="border-b border-[#edf1f1] bg-[#fbfcfc] text-[11px] text-[#92a0a3]"><th className="px-5 py-4 font-semibold">العميل</th><th className="px-3 py-4 font-semibold">الطلبات</th><th className="px-3 py-4 font-semibold">إجمالي المدفوع</th><th className="px-3 py-4 font-semibold">المتبقي</th><th className="px-3 py-4 font-semibold">تاريخ الإنشاء</th><th className="px-5 py-4 font-semibold">إجراء</th></tr></thead><tbody className="divide-y divide-[#edf1f1]">{filtered.map(customer => <tr key={customer.id} className="hover:bg-[#fbfdfd]"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e6f3f1] text-xs font-bold text-[#43827f]">{customer.name.slice(0, 1)}</div><div><p className="text-xs font-bold text-[#3c545a]">{customer.name}</p><p className="mt-1 text-[10px] text-[#98a6a8]">{customer.phone}</p></div></div></td><td className="px-3 py-4 text-sm font-bold text-[#4c6469]">{customer.orders}</td><td className="px-3 py-4 text-xs font-bold text-[#3f8271]">{formatCurrency(customer.paid)}</td><td className="px-3 py-4">{customer.due ? <span className="text-xs font-bold text-[#c48138]">{formatCurrency(customer.due)}</span> : <span className="text-xs text-[#8e9da0]">لا يوجد</span>}</td><td className="px-3 py-4 text-xs text-[#829195]">{customer.created}</td><td className="px-5 py-4"><button onClick={() => { const order = orders.find(item => item.customer === customer.name); if (order) onSelect(order); else toast.info("سيظهر سجل طلبات هذا العميل عند إضافة أول طلب"); }} className="rounded-lg p-2 text-[#789095] hover:bg-[#eaf3f2] hover:text-[#2c5960]" title="عرض الطلبات"><ExternalLink className="h-4 w-4" /></button><button onClick={() => onEdit(customer)} className="rounded-lg p-2 text-[#789095] hover:bg-[#eaf3f2] hover:text-[#2c5960]" title="تعديل العميل"><Pencil className="h-4 w-4" /></button><button onClick={() => onDelete(customer)} className="rounded-lg p-2 text-[#c56a6a] hover:bg-[#fff0f0]" title="حذف العميل"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div></div></div>;
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) { return <div className="panel-shadow flex items-center gap-3 rounded-2xl border border-[#e4ebeb] bg-white p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf5f4] text-[#4b8f89]"><Icon className="h-4 w-4" /></div><div><p className="text-[11px] text-[#87969a]">{label}</p><p className="mt-0.5 font-display text-lg font-extrabold text-[#314a50]">{value}</p></div></div>; }

function FinanceView({ orders, dueTotal, onPay }: { orders: Order[]; dueTotal: number; onPay: (order: Order) => void }) {
  return <div className="rise-in"><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[11px] font-bold tracking-[.18em] text-[#79a6a4]">التحصيل والمتابعة</p><h2 className="text-2xl font-extrabold tracking-tight text-[#20343a]">المالية والديون</h2><p className="mt-1.5 text-sm text-[#7a898f]">تابع المبالغ المستحقة وسجّل الدفعات بدون فقدان أي حركة مالية.</p></div><button className="tap inline-flex items-center gap-2 rounded-xl border border-[#dce7e7] bg-white px-4 py-3 text-sm font-bold text-[#48666b]"><ArrowDownLeft className="h-4 w-4" /> تصدير التقرير</button></div><div className="mb-6 grid gap-4 sm:grid-cols-3"><MetricCard icon={CircleDollarSign} label="إجمالي المبيعات" value={formatCurrency(0)} delta="0%" note="لا توجد طلبات" tone="teal" onClick={() => undefined} /><MetricCard icon={WalletCards} label="تم تحصيله" value={formatCurrency(0)} delta="0%" note="لا توجد دفعات" tone="green" onClick={() => undefined} /><MetricCard icon={Clock3} label="قيد التحصيل" value={formatCurrency(dueTotal)} delta="0%" note="لا توجد مديونية" tone="orange" onClick={() => undefined} /></div><div className="panel-shadow overflow-hidden rounded-2xl border border-[#e4ebeb] bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1f1] p-5"><div><h3 className="font-bold text-[#29434a]">الطلبات التي عليها مبالغ</h3><p className="mt-1 text-xs text-[#8b999c]">يتم تحديث المتبقي تلقائيًا بعد تسجيل كل دفعة.</p></div><span className="rounded-full bg-[#fff1df] px-3 py-1.5 text-xs font-bold text-[#b47839]">{orders.length} طلبات مستحقة</span></div><div className="thin-scroll overflow-x-auto"><table className="w-full min-w-[850px] text-right"><thead><tr className="border-b border-[#edf1f1] bg-[#fbfcfc] text-[11px] text-[#92a0a3]"><th className="px-5 py-4 font-semibold">العميل / الطلب</th><th className="px-3 py-4 font-semibold">الجهاز</th><th className="px-3 py-4 font-semibold">السعر</th><th className="px-3 py-4 font-semibold">المدفوع</th><th className="px-3 py-4 font-semibold">المتبقي</th><th className="px-3 py-4 font-semibold">حالة الدفع</th><th className="px-5 py-4 font-semibold">إجراء</th></tr></thead><tbody className="divide-y divide-[#edf1f1]">{orders.map(order => <tr key={order.id} className="hover:bg-[#fbfdfd]"><td className="px-5 py-4"><p className="text-xs font-bold text-[#3c545a]">{order.customer}</p><p className="mt-1 font-display text-[10px] text-[#2d7474]">{order.id}</p></td><td className="px-3 py-4 text-xs text-[#718287]">{order.model}</td><td className="px-3 py-4 text-xs font-bold text-[#4b6267]">{formatCurrency(order.price)}</td><td className="px-3 py-4 text-xs text-[#5c7479]">{formatCurrency(order.paid)}</td><td className="px-3 py-4 text-sm font-extrabold text-[#c27e36]">{formatCurrency(order.price - order.paid)}</td><td className="px-3 py-4"><PaymentBadge status={order.paymentStatus} /></td><td className="px-5 py-4"><button onClick={() => onPay(order)} className="tap inline-flex items-center gap-1.5 rounded-lg bg-[#edf6f4] px-3 py-2 text-xs font-bold text-[#3a8178] hover:bg-[#dceeea]"><CreditCard className="h-3.5 w-3.5" /> تسجيل دفعة</button></td></tr>)}</tbody></table></div></div></div>;
}

function NotificationsView() {
  const logs = [{ customer: "شركة المدار الذكي", phone: "056 912 3488", type: "تحديث حالة", text: "تم اكتمال طلب جهازك رقم REQ-2026-00124.", date: "اليوم · 09:14", status: "Sent" }, { customer: "مؤسسة النخبة للاتصالات", phone: "050 482 0913", type: "إنشاء طلب", text: "تم استلام طلب جهازك رقم REQ-2026-00127.", date: "أمس · 11:31", status: "Sent" }, { customer: "ورشة تك بلس", phone: "054 228 9011", type: "تذكير مديونية", text: "تبقى على طلبك REQ-2026-00123 مبلغ 300 ر.س.", date: "22 سبتمبر · 09:00", status: "Failed" }, { customer: "متجر فون زون", phone: "055 773 4102", type: "تحديث حالة", text: "تم تحديث حالة طلبك REQ-2026-00126 إلى: تم الرفع.", date: "22 سبتمبر · 15:42", status: "Sent" }];
  return <div className="rise-in"><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[11px] font-bold tracking-[.18em] text-[#79a6a4]">التواصل الآلي</p><h2 className="text-2xl font-extrabold tracking-tight text-[#20343a]">سجل WhatsApp</h2><p className="mt-1.5 text-sm text-[#7a898f]">كل الإشعارات المرسلة وحالتها في مكان واحد.</p></div><button onClick={() => toast.info("ربط WhatsApp API متاح من صفحة الإعدادات") } className="tap inline-flex items-center gap-2 rounded-xl bg-[#2c5960] px-4 py-3 text-sm font-bold text-white"><Send className="h-4 w-4" /> إعداد الربط</button></div><div className="mb-6 grid gap-4 sm:grid-cols-3"><MiniStat label="إجمالي الرسائل" value="284" icon={MessageCircle} /><MiniStat label="تم الإرسال بنجاح" value="276" icon={CheckCircle2} /><MiniStat label="تحتاج مراجعة" value="8" icon={AlertCircle} /></div><div className="panel-shadow overflow-hidden rounded-2xl border border-[#e4ebeb] bg-white"><div className="flex items-center justify-between border-b border-[#edf1f1] p-5"><div><h3 className="font-bold text-[#29434a]">آخر الإشعارات</h3><p className="mt-1 text-xs text-[#8b999c]">مزود الخدمة غير متصل حاليًا — السجل جاهز للربط.</p></div><span className="flex items-center gap-1.5 rounded-full bg-[#fff5e8] px-3 py-1.5 text-[11px] font-bold text-[#b2783d]"><AlertCircle className="h-3.5 w-3.5" /> API غير مفعّل</span></div><div className="thin-scroll overflow-x-auto"><table className="w-full min-w-[850px] text-right"><thead><tr className="border-b border-[#edf1f1] bg-[#fbfcfc] text-[11px] text-[#92a0a3]"><th className="px-5 py-4 font-semibold">العميل / الرقم</th><th className="px-3 py-4 font-semibold">نوع الرسالة</th><th className="px-3 py-4 font-semibold">نص الرسالة</th><th className="px-3 py-4 font-semibold">التاريخ</th><th className="px-5 py-4 font-semibold">الحالة</th></tr></thead><tbody className="divide-y divide-[#edf1f1]">{logs.map((log, index) => <tr key={index} className="hover:bg-[#fbfdfd]"><td className="px-5 py-4"><p className="text-xs font-bold text-[#3c545a]">{log.customer}</p><p className="mt-1 text-[10px] text-[#98a6a8]">{log.phone}</p></td><td className="px-3 py-4"><span className="rounded-full bg-[#edf5f4] px-2.5 py-1 text-[10px] font-semibold text-[#4f8380]">{log.type}</span></td><td className="max-w-[310px] truncate px-3 py-4 text-xs text-[#718287]">{log.text}</td><td className="px-3 py-4 text-xs text-[#849397]">{log.date}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 text-xs font-bold ${log.status === "Sent" ? "text-[#3b9671]" : "text-[#ca6565]"}`}><span className={`h-1.5 w-1.5 rounded-full ${log.status === "Sent" ? "bg-[#4aaa7c]" : "bg-[#d76d6d]"}`} /> {log.status === "Sent" ? "تم الإرسال" : "فشل الإرسال"}</span></td></tr>)}</tbody></table></div></div></div>;
}

function SettingsView() {
  const [reminders, setReminders] = useState(true);
  const [autoStatus, setAutoStatus] = useState(true);
  const [saved, setSaved] = useState(false);
  const apiUrl = "https://plutowa.online/api";
  const [apiToken, setApiToken] = useState(() => localStorage.getItem("icloud-desk-whatsapp-key") || sessionStorage.getItem("icloud-desk-whatsapp-key") || "");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testMessage, setTestMessage] = useState("رسالة تجريبية من iCloud Desk");
  const [connection, setConnection] = useState<"idle" | "success" | "error">("idle");
  const [templateKey, setTemplateKey] = useState("received");
  const [templates, setTemplates] = useState<Record<string, string>>(() => getNotificationTemplates());
  const cloudSettings = trpc.settings.getWhatsApp.useQuery(undefined, { retry: false });
  const saveCloudSettings = trpc.settings.saveWhatsApp.useMutation();
  const [templatesSaved, setTemplatesSaved] = useState(false);
  const [cloudLoaded, setCloudLoaded] = useState(false);

  useEffect(() => {
    if (!cloudSettings.data || cloudLoaded) return;
    if (cloudSettings.data.apiToken) { setApiToken(cloudSettings.data.apiToken); localStorage.setItem("icloud-desk-whatsapp-key", cloudSettings.data.apiToken); }
    if (Object.keys(cloudSettings.data.templates || {}).length) { setTemplates(current => ({ ...current, ...cloudSettings.data!.templates })); localStorage.setItem("icloud-desk-notification-templates", JSON.stringify(cloudSettings.data.templates)); }
    setCloudLoaded(true);
  }, [cloudSettings.data, cloudLoaded]);

  useEffect(() => {
    if (cloudLoaded && apiToken && connection === "idle") void testConnection();
  }, [cloudLoaded, apiToken, connection]);

  const persistCloudSettings = (nextTemplates = templates, nextToken = apiToken) => {
    saveCloudSettings.mutate({ apiToken: nextToken.trim(), templates: nextTemplates }, { onSuccess: () => { localStorage.setItem("icloud-desk-whatsapp-key", nextToken.trim()); toast.success("تم حفظ إعدادات WhatsApp والقوالب سحابيًا"); }, onError: () => toast.error("تعذر الحفظ السحابي؛ تحقق من تسجيل الدخول والاتصال") });
  };
  const normalizeUrl = (value: string) => value.trim();
  const validateApiFields = () => {
    if (!apiUrl.trim() || !apiToken.trim()) {
      toast.error("أدخل API Key أولًا؛ سيتم اختيار جلسة READY تلقائيًا");
      return false;
    }
    try { new URL(normalizeUrl(apiUrl)); } catch { toast.error("رابط WhatsApp API غير صحيح"); return false; }
    return true;
  };
  const saveApiConfig = () => {
    if (!validateApiFields()) return;
    localStorage.setItem("icloud-desk-whatsapp-key", apiToken.trim());
    persistCloudSettings(templates, apiToken);
    setSaved(true);
    setConnection("idle");
    toast.success("تم حفظ بيانات WhatsApp والقوالب سحابيًا");
    setTimeout(() => setSaved(false), 2200);
  };
  const testConnection = async () => {
    if (!validateApiFields()) return;
    setTesting(true);
    setConnection("idle");
    try {
      const response = await fetch("/api/whatsapp/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiUrl: normalizeUrl(apiUrl), apiToken: apiToken.trim() }) });
      const result = await response.json().catch(() => ({ ok: false, message: "استجابة غير مفهومة من الخادم" }));
      if (result.ok) {
        setConnection("success");
        toast.success("تم الاتصال بمزود WhatsApp بنجاح");
      } else {
        setConnection("error");
        toast.error(result.message || "فشل الاتصال بمزود WhatsApp");
      }
    } catch {
      setConnection("error");
      toast.error("تعذر الوصول إلى Pluto WA من الخادم. راجع API Key واتصال جلسة WhatsApp في Pluto WA.");
    } finally {
      setTesting(false);
    }
  };
  const sendTestMessage = async () => {
    if (!validateApiFields()) return;
    if (!testTo.trim() || !testMessage.trim()) { toast.error("أدخل رقم المستلم ونص الرسالة أولًا"); return; }
    setSending(true);
    try {
      const response = await fetch("/api/whatsapp/send-test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiUrl: normalizeUrl(apiUrl), apiToken: apiToken.trim(), to: testTo.trim().replace(/@s\.whatsapp\.net$/, "").replace(/@c\.us$/, ""), text: testMessage.trim() }) });
      const result = await response.json().catch(() => ({ ok: false, message: "استجابة غير مفهومة من الخادم" }));
      if (result.ok) toast.success("تم إرسال الرسالة التجريبية بنجاح");
      else toast.error(result.message || "فشل إرسال الرسالة التجريبية");
    } catch { toast.error("تعذر الوصول إلى Pluto WA لإرسال الرسالة"); }
    finally { setSending(false); }
  };
  return <div className="rise-in"><div className="mb-7"><p className="mb-2 text-[11px] font-bold tracking-[.18em] text-[#79a6a4]">تهيئة النظام</p><h2 className="text-2xl font-extrabold tracking-tight text-[#20343a]">الإعدادات</h2><p className="mt-1.5 text-sm text-[#7a898f]">تحكم في التنبيهات والربط المستقبلي دون تعقيد.</p></div><div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]"><div className="panel-shadow rounded-2xl border border-[#e4ebeb] bg-white p-5 sm:p-6"><div className="mb-6 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f3f1] text-[#4b8f89]"><Bell className="h-5 w-5" /></div><div><h3 className="font-bold text-[#29434a]">الإشعارات والتذكيرات</h3><p className="mt-1 text-xs text-[#8b999c]">حدد متى يتواصل النظام مع العملاء تلقائيًا.</p></div></div><SettingRow title="تذكيرات المديونية" description="إرسال تذكير بعد اكتمال الطلب إذا بقي مبلغ مستحق." enabled={reminders} onChange={setReminders} /><SettingRow title="إشعار تغيير الحالة" description="إرسال رسالة عند انتقال الطلب إلى حالة جديدة." enabled={autoStatus} onChange={setAutoStatus} /><div className="mt-5 rounded-xl bg-[#f8faf9] p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold text-[#526b70]">تكرار التذكير</span><span className="text-xs text-[#799095]">كل 3 أيام</span></div><input type="range" min="1" max="7" defaultValue="3" className="w-full accent-[#4d9993]" /><div className="mt-2 flex justify-between text-[10px] text-[#a0abad]"><span>يوميًا</span><span>أسبوعيًا</span></div></div><div className="mt-5 rounded-xl border border-[#dcebea] bg-[#f8fbfa] p-4"><div className="mb-3"><p className="text-xs font-bold text-[#3f6265]">قوالب إشعارات WhatsApp</p><p className="mt-1 text-[10px] leading-5 text-[#8a9a9d]">اضبط رسالة مستقلة لكل حالة. المتغيرات المتاحة: {"{اسم_العميل}"}، {"{رقم_الطلب}"}، {"{موديل_الجهاز}"}، {"{IMEI}"}، {"{Serial}"}، {"{الحالة}"}، {"{المبلغ_المتبقي}"}.</p></div><select value={templateKey} onChange={event => setTemplateKey(event.target.value)} className="mb-2 w-full rounded-xl border border-[#d7e3e2] bg-white px-3 py-2.5 text-xs font-semibold text-[#526b70]">{notificationTemplateOptions.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}</select><textarea value={templates[templateKey] || ""} onChange={event => setTemplates(current => ({ ...current, [templateKey]: event.target.value }))} rows={11} dir="rtl" className="w-full resize-y rounded-xl border border-[#d7e3e2] bg-white px-3 py-3 text-xs leading-6 text-[#405b60] outline-none focus:border-[#74aaa7]" /><div className="mt-2 flex flex-wrap gap-2"><button onClick={() => { localStorage.setItem("icloud-desk-notification-templates", JSON.stringify(templates)); persistCloudSettings(templates, apiToken); setTemplatesSaved(true); toast.success("تم حفظ قوالب الإشعارات"); setTimeout(() => setTemplatesSaved(false), 1800); }} className="rounded-xl bg-[#4b9990] px-3 py-2 text-[11px] font-bold text-white">{templatesSaved ? "تم حفظ القوالب" : "حفظ القالب"}</button><button onClick={() => setTemplates(current => ({ ...current, [templateKey]: defaultNotificationTemplates[templateKey] || defaultNotificationTemplates.status }))} className="rounded-xl border border-[#cbdcdc] bg-white px-3 py-2 text-[11px] font-bold text-[#60777b]">استعادة الافتراضي</button></div></div><button onClick={() => { setSaved(true); toast.success("تم حفظ الإعدادات والقوالب سحابيًا"); setTimeout(() => setSaved(false), 2000); }} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#2c5960] px-4 py-2.5 text-xs font-bold text-white">{saved ? <Check className="h-4 w-4" /> : <Database className="h-4 w-4" />} {saved ? "تم الحفظ" : "حفظ الإعدادات"}</button></div><div className="panel-shadow rounded-2xl border border-[#e4ebeb] bg-white p-5 sm:p-6"><div className="mb-6 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9eefc] text-[#687ec8]"><MessageCircle className="h-5 w-5" /></div><div><h3 className="font-bold text-[#29434a]">ربط Pluto WA</h3><p className="mt-1 text-xs text-[#8b999c]">استخدم API Key من صفحة مفاتيح Pluto WA؛ يتم اختيار الجلسة تلقائيًا.</p></div></div><div className={`mb-5 rounded-xl border p-4 ${connection === "success" ? "border-[#bfe3d3] bg-[#f0faf5]" : connection === "error" ? "border-[#f0caca] bg-[#fff5f5]" : "border-dashed border-[#d5e1e1] bg-[#fbfcfc]"}`}><div className={`flex items-center gap-2 text-xs font-bold ${connection === "success" ? "text-[#318760]" : connection === "error" ? "text-[#c45d5d]" : "text-[#8b784e]"}`}><div className={`h-2 w-2 rounded-full ${connection === "success" ? "bg-[#4eab7b]" : connection === "error" ? "bg-[#d76d6d]" : "bg-[#e5ae5f]"}`} />{connection === "success" ? "متصل بنجاح" : connection === "error" ? "فشل الاتصال" : "غير مختبر"}</div><p className="mt-2 text-[11px] leading-5 text-[#94a1a4]">{connection === "success" ? "تم الوصول إلى Pluto WA واختيار جلسة READY تلقائيًا." : connection === "error" ? "راجع API Key وتأكد من وجود جلسة WhatsApp متصلة ثم أعد المحاولة." : "لن يتم إرسال أي رسالة قبل اختبار الاتصال وتفعيل المزود."}</p></div><div className="space-y-4"><div className="rounded-xl border border-[#dcebea] bg-[#f5faf9] px-3 py-2.5 text-xs text-[#547570]"><span className="font-bold">Base URL:</span> <span dir="ltr" className="font-mono">https://plutowa.online/api</span><p className="mt-1 text-[10px] text-[#8a9b9d]">يتم استخدامه تلقائيًا ولا يحتاج إلى تعديل.</p></div><label className="block"><span className="mb-1.5 block text-xs font-bold text-[#687d82]">API Key <span className="font-normal text-[#a1adaf]">(X-API-Key)</span></span><div className="input-shell"><input type="password" value={apiToken} onChange={event => setApiToken(event.target.value)} placeholder="أدخل API Key من Pluto WA" /></div></label><div className="rounded-xl border border-[#dcebea] bg-[#f5faf9] p-3 text-[11px] leading-5 text-[#62807d]"><span className="font-bold text-[#397d76]">اختيار تلقائي للجلسة</span><br />سيقرأ النظام قائمة الجلسات باستخدام API Key ويختار أول جلسة حالتها READY، دون إدخال Session ID يدويًا.</div></div><div className="mt-4 rounded-xl bg-[#f1f7f6] p-3 text-[11px] leading-5 text-[#66807e]">سيتم اكتشاف رابط الجلسة تلقائيًا من <span dir="ltr" className="font-mono">GET /api/sessions</span> باستخدام API Key.</div><div className="mt-4 rounded-xl border border-[#e6eded] bg-[#fbfcfc] p-4"><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold text-[#526b70]">إرسال رسالة تجريبية</p><p className="mt-1 text-[10px] text-[#8b999c]">يختار جلسة READY تلقائيًا ثم يستخدم POST /messages/send-text.</p></div><Send className="h-4 w-4 text-[#5a9993]" /></div><div className="grid gap-3 sm:grid-cols-2"><input value={testTo} onChange={event => setTestTo(event.target.value)} placeholder="رقم المستلم: 966501234567 أو @c.us" className="rounded-xl border border-[#d7e1e1] bg-white px-3 py-2.5 text-xs outline-none focus:border-[#74aaa7]" /><input value={testMessage} onChange={event => setTestMessage(event.target.value)} placeholder="نص الرسالة" className="rounded-xl border border-[#d7e1e1] bg-white px-3 py-2.5 text-xs outline-none focus:border-[#74aaa7]" /></div><button onClick={sendTestMessage} disabled={sending} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#4b9990] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{sending ? <Activity className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />} {sending ? "جارٍ الإرسال..." : "إرسال تجريبي"}</button></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><button onClick={saveApiConfig} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2c5960] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#214a51]">{saved ? <Check className="h-4 w-4" /> : <Database className="h-4 w-4" />} {saved ? "تم الحفظ" : "حفظ بيانات المزود"}</button><button onClick={testConnection} disabled={testing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#cbdcdc] bg-white px-4 py-2.5 text-xs font-bold text-[#49666b] hover:bg-[#f3f8f7] disabled:cursor-wait disabled:opacity-60">{testing ? <Activity className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />} {testing ? "جارٍ الاختبار..." : "اختبار الاتصال"}</button></div></div></div></div>;
}
function SettingRow({ title, description, enabled, onChange }: { title: string; description: string; enabled: boolean; onChange: (value: boolean) => void }) { return <div className="flex items-center justify-between gap-3 border-b border-[#edf1f1] py-4"><div><p className="text-sm font-bold text-[#3e585e]">{title}</p><p className="mt-1 text-[11px] leading-5 text-[#8a999c]">{description}</p></div><button role="switch" aria-checked={enabled} onClick={() => onChange(!enabled)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? "bg-[#5ca69e]" : "bg-[#ced9da]"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${enabled ? "right-1" : "right-6"}`} /></button></div>; }
function LabeledField({ label, placeholder, type = "text", name, defaultValue }: { label: string; placeholder: string; type?: string; name?: string; defaultValue?: string }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-[#687d82]">{label}</span><div className="input-shell"><input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} /></div></label>; }

function OrderDetail({ order, onClose, onPay, onStatusChange }: { order: Order; onClose: () => void; onPay: () => void; onStatusChange: (status: OrderStatus, notify: boolean) => void }) { const [nextStatus, setNextStatus] = useState(order.status);
  return <div className="fixed inset-0 z-50 flex justify-start"><button className="absolute inset-0 bg-[#102c33]/40 backdrop-blur-[2px]" aria-label="إغلاق التفاصيل" onClick={onClose} /><section className="relative mr-auto flex h-full w-full max-w-[620px] flex-col overflow-y-auto bg-[#f7f9f9] shadow-2xl fade-in"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e0e9e9] bg-[#f7f9f9]/95 px-5 py-4 backdrop-blur-xl"><div className="flex items-center gap-3"><button onClick={onClose} className="rounded-lg p-2 text-[#7e9094] hover:bg-[#e5eeee]"><PanelRightClose className="h-5 w-5" /></button><div><p className="font-display text-sm font-bold text-[#2c676b]">{order.id}</p><p className="mt-0.5 text-[11px] text-[#86969a]">تفاصيل الطلب وسجل الأحداث</p></div></div><StatusBadge status={order.status} /></div><div className="space-y-5 p-5"><div className="rounded-2xl bg-[#102c33] p-5 text-white shadow-lg shadow-[#102c33]/10"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-[#93b5b5]">الجهاز</p><h2 className="mt-1 text-xl font-bold">{order.model}</h2><p className="mt-2 font-display text-sm tracking-wide text-[#a9d3d0]">{order.serial}</p></div><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10"><Smartphone className="h-6 w-6 text-[#8bc8c2]" /></div></div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4"><div><p className="text-[10px] text-[#87a6a9]">العميل</p><p className="mt-1 text-sm font-semibold">{order.customer}</p></div><div><p className="text-[10px] text-[#87a6a9]">WhatsApp</p><p className="mt-1 text-sm font-semibold">{order.phone}</p></div></div></div><div className="grid gap-4 sm:grid-cols-2"><DetailCard title="بيانات الجهاز" icon={Smartphone}><DetailItem label="Serial Number" value={order.serial} copy /><DetailItem label="IMEI" value={order.imei} copy /><DetailItem label="تاريخ الشراء" value={order.purchased} /></DetailCard><DetailCard title="بيانات الرفع" icon={FileCheck2}><DetailItem label="اسم المستخدم" value={order.username} /><DetailItem label="Email الرفع" value={order.email} /><DetailItem label="تاريخ الرفع" value={order.uploaded} /></DetailCard></div><div className="rounded-2xl border border-[#e4ebeb] bg-white p-5"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold text-[#849498]">ملخص مالي</p><h3 className="mt-1 font-bold text-[#29434a]">الحساب والدفع</h3></div><PaymentBadge status={order.paymentStatus} /></div><div className="grid grid-cols-3 gap-2"><AmountItem label="سعر الخدمة" value={formatCurrency(order.price)} /><AmountItem label="المدفوع" value={formatCurrency(order.paid)} tone="green" /><AmountItem label="المتبقي" value={formatCurrency(order.price - order.paid)} tone="orange" /></div>{order.price > order.paid && <button onClick={onPay} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#fff3df] py-2.5 text-xs font-bold text-[#b67835] hover:bg-[#ffebc9]"><CreditCard className="h-4 w-4" /> تسجيل دفعة جديدة</button>}</div><div className="rounded-2xl border border-[#e4ebeb] bg-white p-5"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold text-[#849498]">التتبع الزمني</p><h3 className="mt-1 font-bold text-[#29434a]">سجل الطلب</h3></div><FileClock className="h-5 w-5 text-[#8aa1a3]" /></div><div className="relative space-y-5 before:absolute before:right-[7px] before:top-2 before:h-[calc(100%-10px)] before:w-px before:bg-[#dfeaea]">{order.history.map((event, index) => <div key={`${event.label}-${index}`} className="relative flex gap-4"><span className={`z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-4 border-white ${event.tone === "green" ? "bg-[#4eab7b]" : event.tone === "red" ? "bg-[#d76d6d]" : event.tone === "orange" ? "bg-[#dfa052]" : event.tone === "blue" ? "bg-[#6f90d0]" : "bg-[#65aaa0]"}`} /><div><p className="text-sm font-semibold text-[#4a6369]">{event.label}</p><p className="mt-1 font-display text-[10px] text-[#93a1a4]">{event.date}</p></div></div>)}</div></div><div className="rounded-2xl border border-[#e4ebeb] bg-white p-5"><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-semibold text-[#849498]">تحديث سريع</p><h3 className="mt-1 font-bold text-[#29434a]">تغيير حالة الطلب</h3></div><SlidersHorizontal className="h-4 w-4 text-[#8ba0a3]" /></div><select value={nextStatus} onChange={event => setNextStatus(event.target.value as OrderStatus)} className="w-full rounded-xl border border-[#dce6e6] bg-[#fbfcfc] px-3 py-3 text-sm font-semibold text-[#516970] outline-none focus:border-[#75aaa7]">{Object.keys(statusMeta).map(status => <option key={status}>{status}</option>)}</select><div className="mt-3 grid gap-2 sm:grid-cols-2"><button onClick={() => onStatusChange(nextStatus, false)} className="rounded-xl border border-[#dce6e6] bg-white px-3 py-2.5 text-xs font-bold text-[#60777b] hover:bg-[#f4f8f8]">حفظ فقط</button><button onClick={() => onStatusChange(nextStatus, true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4b9990] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#397f79]"><Send className="h-3.5 w-3.5" /> حفظ + WhatsApp</button></div></div></div></section></div>;
}

function DetailCard({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) { return <div className="rounded-2xl border border-[#e4ebeb] bg-white p-4"><div className="mb-4 flex items-center gap-2"><Icon className="h-4 w-4 text-[#5a9993]" /><h3 className="text-sm font-bold text-[#3b555b]">{title}</h3></div><div className="space-y-3">{children}</div></div>; }
function DetailItem({ label, value, copy }: { label: string; value: string; copy?: boolean }) { return <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] text-[#9aa8aa]">{label}</p><p className="mt-1 truncate text-xs font-semibold text-[#526a70]">{value}</p></div>{copy && value !== "—" && <button onClick={() => { navigator.clipboard?.writeText(value); toast.success("تم نسخ القيمة"); }} className="shrink-0 text-[#9bb0b0] hover:text-[#2c7776]"><Copy className="h-3.5 w-3.5" /></button>}</div>; }
function AmountItem({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "green" | "orange" }) { return <div className="rounded-xl bg-[#f7f9f9] p-3"><p className="text-[10px] text-[#8c9b9e]">{label}</p><p className={`mt-1 text-sm font-extrabold ${tone === "green" ? "text-[#3f9977]" : tone === "orange" ? "text-[#c78339]" : "text-[#3d565c]"}`}>{value}</p></div>; }

function ModalShell({ title, description, onClose, children, width = "max-w-[650px]" }: { title: string; description: string; onClose: () => void; children: React.ReactNode; width?: string }) { return <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"><button aria-label="إغلاق" className="absolute inset-0 bg-[#102c33]/45 backdrop-blur-sm" onClick={onClose} /><div className={`relative max-h-[calc(100vh-32px)] w-full ${width} overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6 fade-in`}><div className="mb-5 flex items-start justify-between gap-4 border-b border-[#edf1f1] pb-4"><div><h2 className="text-lg font-extrabold text-[#29434a]">{title}</h2><p className="mt-1 text-xs text-[#86969a]">{description}</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#899a9d] hover:bg-[#f0f5f5]"><X className="h-5 w-5" /></button></div>{children}</div></div>; }
function EditOrderModal({ order, customers, onClose, onSubmit }: { order: Order; customers: Customer[]; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <ModalShell title="تعديل الطلب بالكامل" description={`تعديل جميع بيانات ${order.id} وحفظها سحابيًا.`} onClose={onClose} width="max-w-[650px]"><form onSubmit={onSubmit} className="space-y-5"><FormSection title="بيانات العميل" icon={UserRound}><label className="block"><span className="mb-1.5 block text-xs font-bold text-[#687d82]">اختيار العميل</span><div className="input-shell"><select name="customer" defaultValue={order.customer} className="bg-transparent"><option value="">اختر العميل</option>{customers.map(customer => <option key={customer.id} value={customer.name}>{customer.name}</option>)}</select></div></label><p className="-mt-1 rounded-xl bg-[#f1f7f6] px-3 py-2 text-[11px] leading-5 text-[#66807e]">رقم WhatsApp يُؤخذ تلقائيًا من بطاقة العميل ولا يتم تعديله داخل الطلب.</p></FormSection><FormSection title="بيانات الجهاز" icon={Smartphone}><div className="grid gap-4 sm:grid-cols-2"><LabeledField name="model" label="اسم الجهاز / الموديل" placeholder="iPhone" defaultValue={order.model} /><LabeledField name="serial" label="Serial Number" placeholder="Serial" defaultValue={order.serial} /><LabeledField name="imei" label="IMEI" placeholder="IMEI" defaultValue={order.imei} /></div></FormSection><FormSection title="بيانات الرفع والتواريخ" icon={FileCheck2}><div className="grid gap-4 sm:grid-cols-2"><LabeledField name="username" label="اسم المستخدم" placeholder="اسم المستخدم" defaultValue={order.username} /><LabeledField name="email" label="Email الرفع" placeholder="email@example.com" type="email" defaultValue={order.email} /><LabeledField name="purchased" label="تاريخ شراء الجهاز" placeholder="تاريخ الشراء" defaultValue={order.purchased} /><LabeledField name="received" label="تاريخ استلام الجهاز" placeholder="تاريخ الاستلام" defaultValue={order.received} /></div></FormSection><FormSection title="الحالة والحساب" icon={CircleDollarSign}><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-xs font-bold text-[#687d82]">حالة الطلب</span><div className="input-shell"><select name="status" defaultValue={order.status} className="bg-transparent">{Object.keys(statusMeta).map(status => <option key={status}>{status}</option>)}</select></div></label><LabeledField name="price" label="سعر الخدمة" placeholder="500" defaultValue={String(order.price)} /><LabeledField name="paid" label="المبلغ المدفوع" placeholder="200" defaultValue={String(order.paid)} /></div><p className="mt-3 rounded-xl bg-[#f1f7f6] p-3 text-xs text-[#66807e]">سيُعاد حساب حالة الدفع والمبلغ المتبقي تلقائيًا بعد الحفظ.</p></FormSection><div className="flex justify-end gap-2 pt-1"><button type="button" onClick={onClose} className="rounded-xl border border-[#dce6e6] px-5 py-3 text-sm font-bold text-[#6d8085]">إلغاء</button><button type="submit" className="rounded-xl bg-[#2c5960] px-5 py-3 text-sm font-bold text-white">حفظ جميع التعديلات</button></div></form></ModalShell>;
}
function EditCustomerModal({ customer, onClose, onSubmit }: { customer: Customer; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) { return <ModalShell title="تعديل العميل" description="حدّث اسم العميل ورقم WhatsApp وسيتم تحديث طلباته المرتبطة." onClose={onClose} width="max-w-[480px]"><form onSubmit={onSubmit} className="space-y-4"><LabeledField name="name" label="اسم العميل" placeholder="اسم العميل" defaultValue={customer.name} /><LabeledField name="phone" label="رقم WhatsApp" placeholder="966..." defaultValue={customer.phone} /><div className="flex justify-end gap-2 pt-3"><button type="button" onClick={onClose} className="rounded-xl border border-[#dce6e6] px-5 py-3 text-sm font-bold text-[#6d8085]">إلغاء</button><button type="submit" className="rounded-xl bg-[#2c5960] px-5 py-3 text-sm font-bold text-white">حفظ التعديل</button></div></form></ModalShell>; }

function OrderModal({ onClose, onSubmit, customers, savedModels }: { onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; customers: Customer[]; savedModels: string[] }) { const [serial, setSerial] = useState(""); const [model, setModel] = useState(""); const today = new Date().toISOString().slice(0, 10); const duplicate = initialOrders.find(order => order.serial.toLowerCase() === serial.trim().toLowerCase()); return <ModalShell title="إضافة طلب جديد" description="أدخل بيانات الجهاز الأساسية ليتم إنشاء رقم الطلب تلقائيًا." onClose={onClose}><form onSubmit={onSubmit} className="space-y-5"><FormSection title="بيانات العميل" icon={UserRound}><label className="block"><span className="mb-1.5 block text-xs font-bold text-[#687d82]">اختيار العميل</span><div className="input-shell"><Search className="h-4 w-4 text-[#93a1a4]" /><select name="customer" defaultValue={customers[0]?.name} className="bg-transparent"><option value="">اختر العميل</option>{customers.map(customer => <option key={customer.id}>{customer.name}</option>)}</select><Plus className="h-4 w-4 text-[#5e9892]" /></div></label></FormSection><p className="-mt-2 rounded-xl bg-[#f1f7f6] px-3 py-2 text-[11px] leading-5 text-[#66807e]">سيتم استخدام رقم WhatsApp المحفوظ في بطاقة العميل تلقائيًا لإرسال الإشعارات.</p><FormSection title="بيانات الجهاز" icon={Smartphone}><div className="grid gap-4 sm:grid-cols-2"><label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-[#687d82]">اسم الجهاز / الموديل</span><div className="input-shell"><Smartphone className="h-4 w-4 text-[#93a1a4]" /><input name="model" list="iphone-models" value={model} onChange={event => setModel(event.target.value)} placeholder="اكتب أو اختر موديل iPhone" required /></div><datalist id="iphone-models">{[...iphoneModels, ...savedModels].map(item => <option key={item} value={item} />)}</datalist><div className="mt-2 flex flex-wrap gap-1.5">{[...iphoneModels.slice(0, 8), ...savedModels.slice(0, 4)].map(item => <button type="button" key={item} onClick={() => setModel(item)} className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors ${model === item ? "border-[#5ca69e] bg-[#e5f3f1] text-[#2d7c76]" : "border-[#e1eaea] text-[#7b8d91] hover:bg-[#f1f7f6]"}`}>{item}</button>)}</div></label><label className="block"><span className="mb-1.5 block text-xs font-bold text-[#687d82]">Serial Number <em className="text-[#d76d6d]">*</em></span><div className={`input-shell ${duplicate ? "border-[#d76d6d]" : ""}`}><input name="serial" value={serial} onChange={event => setSerial(event.target.value)} placeholder="أدخل Serial Number" required /></div>{duplicate && <span className="mt-1.5 block text-[11px] font-semibold text-[#c85d5d]">هذا الجهاز مسجل مسبقًا في النظام · {duplicate.id}</span>}</label><LabeledField name="imei" label="IMEI" placeholder="أدخل رقم IMEI" /></div></FormSection><FormSection title="بيانات الرفع والتواريخ" icon={FileCheck2}><div className="grid gap-4 sm:grid-cols-2"><LabeledField name="username" label="اسم المستخدم" placeholder="الاسم المستخدم في الطلب" /><LabeledField name="email" label="Email الرفع" placeholder="email@example.com" type="email" /><LabeledField name="purchased" label="تاريخ شراء الجهاز" placeholder="23/09/2026" type="date" defaultValue={today} /><LabeledField name="received" label="تاريخ استلام الجهاز" placeholder="23/09/2026" type="date" defaultValue={today} /></div></FormSection><FormSection title="الحساب" icon={CircleDollarSign}><div className="grid gap-4 sm:grid-cols-3"><LabeledField name="price" label="سعر الخدمة" placeholder="500" /><LabeledField name="paid" label="المبلغ المدفوع" placeholder="200" /><label className="block"><span className="mb-1.5 block text-xs font-bold text-[#687d82]">حالة الدفع</span><div className="input-shell"><select name="payment" defaultValue="مدفوع جزئيًا" className="bg-transparent"><option>مدفوع</option><option>آجل</option><option>مدفوع جزئيًا</option></select></div></label></div><div className="mt-3 rounded-xl bg-[#f1f7f6] p-3 text-xs text-[#66807e]">سيتم حساب المبلغ المتبقي تلقائيًا وتسجيله في الملف المالي.</div></FormSection><div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-xl border border-[#dce6e6] px-5 py-3 text-sm font-bold text-[#6d8085] hover:bg-[#f6f9f9]">إلغاء</button><button type="reset" onClick={() => setSerial("")} className="rounded-xl border border-[#dce6e6] px-5 py-3 text-sm font-bold text-[#6d8085] hover:bg-[#f6f9f9]">تفريغ الحقول</button><button type="submit" className="rounded-xl bg-[#2c5960] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#2c5960]/15 hover:bg-[#214a51]">حفظ الطلب</button></div></form></ModalShell>; }
function FormSection({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) { return <div><div className="mb-3 flex items-center gap-2"><Icon className="h-4 w-4 text-[#5a9993]" /><h3 className="text-sm font-bold text-[#3f5b61]">{title}</h3></div>{children}</div>; }
function CustomerModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) { return <ModalShell title="إضافة عميل" description="أنشئ ملف عميل جديد لاستخدامه عند إضافة الطلبات." onClose={onClose} width="max-w-[480px]"><form onSubmit={onSubmit} className="space-y-4"><LabeledField name="name" label="اسم العميل" placeholder="مثال: مؤسسة النخبة للاتصالات" /><LabeledField name="phone" label="رقم WhatsApp" placeholder="050 000 0000" /><label className="block"><span className="mb-1.5 block text-xs font-bold text-[#687d82]">ملاحظات</span><textarea name="notes" rows={3} placeholder="ملاحظات اختيارية" className="w-full resize-none rounded-xl border border-[#d7e1e1] px-3 py-2.5 text-sm outline-none placeholder:text-[#b1bdbf] focus:border-[#74aaa7]" /></label><div className="flex justify-end gap-2 pt-3"><button type="button" onClick={onClose} className="rounded-xl border border-[#dce6e6] px-5 py-3 text-sm font-bold text-[#6d8085]">إلغاء</button><button type="submit" className="rounded-xl bg-[#2c5960] px-5 py-3 text-sm font-bold text-white">حفظ العميل</button></div></form></ModalShell>; }
function PaymentModal({ order, onClose, onSubmit }: { order: Order; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) { const remaining = order.price - order.paid; return <ModalShell title="تسجيل دفعة" description={`تحديث الرصيد المستحق للطلب ${order.id}`} onClose={onClose} width="max-w-[480px]"><div className="mb-5 rounded-xl bg-[#fff7eb] p-4"><div className="flex items-center justify-between text-xs"><span className="text-[#927b5f]">المتبقي الحالي</span><strong className="text-lg text-[#b97832]">{formatCurrency(remaining)}</strong></div><p className="mt-2 text-[11px] text-[#aa9476]">{order.customer} · {order.model}</p></div><form onSubmit={onSubmit} className="space-y-4"><LabeledField name="amount" label="مبلغ الدفعة" placeholder={`حد أقصى ${remaining} ر.س`} /><label className="block"><span className="mb-1.5 block text-xs font-bold text-[#687d82]">طريقة الدفع</span><div className="input-shell"><select className="bg-transparent"><option>تحويل بنكي</option><option>نقدي</option><option>شبكة</option></select></div></label><label className="block"><span className="mb-1.5 block text-xs font-bold text-[#687d82]">ملاحظة</span><input placeholder="اختياري" className="w-full rounded-xl border border-[#d7e1e1] px-3 py-2.5 text-sm outline-none focus:border-[#74aaa7]" /></label><div className="flex justify-end gap-2 pt-3"><button type="button" onClick={onClose} className="rounded-xl border border-[#dce6e6] px-5 py-3 text-sm font-bold text-[#6d8085]">إلغاء</button><button type="submit" className="rounded-xl bg-[#2c5960] px-5 py-3 text-sm font-bold text-white">حفظ الدفعة</button></div></form></ModalShell>; }
