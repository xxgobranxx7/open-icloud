# iCloud Desk — مخطط التنفيذ الأولي

## 1. Architecture

المشروع مبني على قالب WebDev Full-Stack باستخدام React 19 وTypeScript وTailwind CSS في الواجهة، وExpress مع tRPC في طبقة الخادم، وDrizzle ORM مع MySQL/TiDB في التخزين. الواجهة تعمل باتجاه RTL وتستخدم مكونات SaaS داخلية قابلة لإعادة الاستخدام. النسخة الحالية تعرض نموذج تشغيل تفاعلي ببيانات تجريبية لتثبيت تجربة الاستخدام قبل توصيل الاستعلامات الفعلية.

## 2. Database Schema

| الجدول | الغرض | أهم الحقول |
| --- | --- | --- |
| `users` | هوية المستخدمين والصلاحيات | `id`, `openId`, `role`, `name`, `email` |
| `customers` | ملفات العملاء | `id`, `name`, `whatsapp`, `notes`, `createdAt` |
| `devices` | هوية الجهاز ومنع التكرار | `id`, `customerId`, `model`, `serialNumber`, `imei`, `purchaseDate`, `receivedAt` |
| `orders` | الطلب التجاري وحالته وبيانات الرفع | `id`, `requestNumber`, `customerId`, `deviceId`, `status`, `username`, `uploadEmail`, `uploadedAt`, `servicePrice`, `paidAmount`, `paymentStatus`, `dueDate` |
| `payments` | سجل الدفعات المستقل | `id`, `orderId`, `amount`, `method`, `note`, `paidAt`, `createdBy` |
| `order_status_history` | سجل غير قابل للحذف لتغيرات الحالة | `id`, `orderId`, `fromStatus`, `toStatus`, `label`, `createdAt`, `createdBy` |
| `notifications` | قوالب الإشعارات وإعداداتها | `id`, `eventType`, `channel`, `template`, `enabled` |
| `notification_logs` | سجل رسائل WhatsApp | `id`, `orderId`, `customerId`, `phone`, `type`, `message`, `status`, `errorMessage`, `sentAt` |
| `settings` | الإعدادات العامة | `id`, `key`, `value`, `updatedAt` |

يكون `serialNumber` فريدًا في `devices` مع فحص تكرار صريح قبل الحفظ، ويُحفظ كل من حالة الطلب وحالة الدفع في حقليّن مستقلين حتى يمكن أن يكون الطلب مكتملًا والدفع آجلًا.

## 3. ERD

```mermaid
erDiagram
  USERS ||--o{ ORDERS : creates
  USERS ||--o{ PAYMENTS : records
  USERS ||--o{ ORDER_STATUS_HISTORY : updates
  CUSTOMERS ||--o{ DEVICES : owns
  CUSTOMERS ||--o{ ORDERS : places
  CUSTOMERS ||--o{ NOTIFICATION_LOGS : receives
  DEVICES ||--o{ ORDERS : referenced_by
  ORDERS ||--o{ PAYMENTS : has
  ORDERS ||--o{ ORDER_STATUS_HISTORY : tracks
  ORDERS ||--o{ NOTIFICATION_LOGS : triggers

  CUSTOMERS { int id PK; varchar name; varchar whatsapp; text notes; timestamp createdAt }
  DEVICES { int id PK; int customerId FK; varchar model; varchar serialNumber UK; varchar imei; date purchaseDate; timestamp receivedAt }
  ORDERS { int id PK; varchar requestNumber UK; int customerId FK; int deviceId FK; varchar status; varchar paymentStatus; decimal servicePrice; decimal paidAmount; timestamp uploadedAt; timestamp createdAt }
  PAYMENTS { int id PK; int orderId FK; decimal amount; varchar method; text note; timestamp paidAt }
  ORDER_STATUS_HISTORY { int id PK; int orderId FK; varchar fromStatus; varchar toStatus; varchar label; timestamp createdAt }
  NOTIFICATION_LOGS { int id PK; int orderId FK; int customerId FK; varchar phone; varchar type; text message; varchar status; text errorMessage; timestamp sentAt }
  USERS { int id PK; varchar openId UK; varchar role; varchar name; varchar email }
}
```

## 4. Routes / Pages

| المسار | الصفحة |
| --- | --- |
| `/` | لوحة التحكم، البحث العام، آخر الطلبات، الملخص المالي |
| `/orders` | جدول الطلبات، التصفية، pagination، إضافة طلب |
| `/customers` | قائمة العملاء، إجماليات الدفع، طلبات العميل |
| `/finance` | الديون، الدفعات، المتبقي، تسجيل دفعة |
| `/notifications` | سجل WhatsApp، حالات Sent/Failed |
| `/settings` | التذكيرات، مفاتيح WhatsApp، إعدادات الإشعار |
| `/orders/:requestNumber` | تفاصيل الطلب، حالة الجهاز، السجل الزمني |

في النموذج الحالي تتم المحافظة على تجربة التنقل ضمن لوحة واحدة سريعة، مع drawer لتفاصيل الطلب وmodals للإضافة والدفعات.

## 5. API Structure

تُبنى الإجراءات تحت tRPC مع `protectedProcedure`:

- `orders.list`, `orders.search`, `orders.getById`, `orders.create`, `orders.updateStatus`
- `customers.list`, `customers.get`, `customers.create`, `customers.update`
- `payments.listByOrder`, `payments.create`, `finance.summary`
- `notifications.listLogs`, `notifications.send`, `notifications.settings`
- `settings.get`, `settings.update`

تتولى طبقة server/db.ts الاستعلامات فقط، بينما تتولى routers التحقق من المدخلات وتنسيق الصلاحيات. تستخدم المدخلات Zod للتحقق من البريد والـ IMEI وSerial والأرقام المالية.

## 6. Components Structure

- `Home.tsx`: shell والتنقل وحالة النموذج الأولي.
- `DashboardView`: مؤشرات الأداء، الرسم، الطلبات الأخيرة، الملخص المالي.
- `OrdersView`: الجدول والتصفية.
- `CustomersView`: قائمة العملاء.
- `FinanceView`: مبالغ الديون وتسجيل الدفعات.
- `NotificationsView`: سجل الإشعارات.
- `SettingsView`: إعدادات الإشعارات وWhatsApp.
- `OrderDetail`: التفاصيل، المعلومات المالية، سجل الأحداث، تغيير الحالة.
- `OrderModal`, `CustomerModal`, `PaymentModal`: إدخال سريع مع التحقق والتنبيهات.

## 7. Authentication Plan

يُستخدم Manus OAuth المدمج في القالب. كل إجراءات البيانات تكون محمية، وتكون صلاحية `admin` مطلوبة لتغيير إعدادات WhatsApp وإدارة المستخدمين. يتم الاحتفاظ بالجلسة عبر القالب الجاهز دون التعامل مع الكوكيز من الواجهة.

## 8. WhatsApp Integration Plan

طبقة `Notifications Service` تعزل مزود WhatsApp عن الطلبات. تحفظ الإعدادات URL وToken وPhone Number ID في متغيرات/إعدادات خادم آمنة، وتنفذ إرسالًا idempotent مع logging لحالات `Sent` و`Failed`. النسخة الحالية تعرض حالة API غير مفعّل وتُبقي الربط جاهزًا من صفحة الإعدادات.

## 9. Payment / Debt Logic

`remaining = max(servicePrice - paidAmount, 0)`. لا يُسمح بدفعة أكبر من السعر إلا بإجراء تصحيح مالي صريح. حالة الدفع تُحسب مستقلًا: `مدفوع` إذا أصبح المتبقي صفرًا، `آجل` إذا لم تُدفع أي دفعة، و`مدفوع جزئيًا` فيما عدا ذلك. كل دفعة تُحفظ كسجل مستقل ولا تُعدّل السجل السابق.

## 10. Notification Logic

عند إنشاء الطلب يرسل النظام قالب الاستلام، وعند تغيير الحالة يرسل قالب التحديث، وعند اكتمال الطلب مع متبقٍ أكبر من صفر يظهر تنبيه مديونية ويبدأ جدول التذكير. يتوقف التذكير فورًا عندما يصبح المتبقي صفرًا أو يتم إيقاف الإعداد من صفحة الإعدادات.
