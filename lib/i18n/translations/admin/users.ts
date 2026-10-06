/**
 * Admin-only translations — the `admin.users.*` namespace.
 *
 * The SHARED user directory (`/admin/users`), open to both `admin` and `owner`.
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`.
 */
export const usersEn = {
  "admin.users.col.user": "Customer",
  "admin.users.col.email": "Email",
  "admin.users.col.phone": "Phone",
  "admin.users.col.role": "Role",
  "admin.users.col.status": "Status",
  "admin.users.col.joined": "Joined",
  "admin.users.col.actions": "Actions",
  "admin.users.search.label": "Find a customer by name or email",
  "admin.users.search.placeholder": "Search name or email",
  "admin.users.status.active": "Active",
  "admin.users.status.banned": "Banned",
  "admin.users.status.unverified": "Unverified",
  "admin.users.role.user": "Customer",
  "admin.users.role.admin": "Admin",
  "admin.users.role.owner": "Owner",
  "admin.users.action.ban": "Ban",
  "admin.users.action.unban": "Unban",
  "admin.users.action.changeRole": "Change role",
  "admin.users.role.updated": "Role updated",
  "admin.users.status.updated": "Status updated",
  "admin.users.self.hint": "You cannot change your own role or status.",
  "admin.users.ban.warning":
    "A banned customer cannot sign in until they are unbanned.",
  "admin.users.confirm.title": "Confirm role change",
  "admin.users.confirm.description":
    "This will immediately change this account's access level.",
  "admin.users.confirm.submit": "Confirm change",
  "admin.users.empty": "No customers yet.",
  "admin.users.pager.page": "Page",
  "admin.users.pager.of": "of",
  "admin.users.pager.total": "customers",
  "admin.users.pager.prev": "Previous",
  "admin.users.pager.next": "Next",
  "admin.users.scope.owner":
    "As owner you may ban accounts and change roles (customer → admin, admin → owner).",
  "admin.users.scope.admin":
    "As an admin you may review and ban customers. Changing roles requires an owner.",
  "admin.users.maxPage": "That page does not exist.",
} as const;

export const usersFa = {
  "admin.users.col.user": "مشتری",
  "admin.users.col.email": "ایمیل",
  "admin.users.col.phone": "تلفن",
  "admin.users.col.role": "نقش",
  "admin.users.col.status": "وضعیت",
  "admin.users.col.joined": "تاریخ عضویت",
  "admin.users.col.actions": "عملیات",
  "admin.users.search.label": "یافتن مشتری با نام یا ایمیل",
  "admin.users.search.placeholder": "جستجوی نام یا ایمیل",
  "admin.users.status.active": "فعال",
  "admin.users.status.banned": "مسدود",
  "admin.users.status.unverified": "تأییدنشده",
  "admin.users.role.user": "مشتری",
  "admin.users.role.admin": "مدیر",
  "admin.users.role.owner": "مالک",
  "admin.users.action.ban": "مسدود کردن",
  "admin.users.action.unban": "رفع مسدودی",
  "admin.users.action.changeRole": "تغییر نقش",
  "admin.users.role.updated": "نقش به‌روزرسانی شد",
  "admin.users.status.updated": "وضعیت به‌روزرسانی شد",
  "admin.users.self.hint": "شما نمی‌توانید نقش یا وضعیت خودتان را تغییر دهید.",
  "admin.users.ban.warning":
    "مشتری مسدودشده تا زمان رفع مسدودی نمی‌تواند وارد شود.",
  "admin.users.confirm.title": "تأیید تغییر نقش",
  "admin.users.confirm.description":
    "سطح دسترسی این حساب بلافاصله تغییر می‌کند.",
  "admin.users.confirm.submit": "تأیید تغییر",
  "admin.users.empty": "هنوز مشتری‌ای وجود ندارد.",
  "admin.users.pager.page": "صفحه",
  "admin.users.pager.of": "از",
  "admin.users.pager.total": "مشتری",
  "admin.users.pager.prev": "قبلی",
  "admin.users.pager.next": "بعدی",
  "admin.users.scope.owner":
    "به‌عنوان مالک می‌توانید حساب‌ها را مسدود کنید و نقش‌ها را تغییر دهید (مشتری → مدیر، مدیر → مالک).",
  "admin.users.scope.admin":
    "به‌عنوان مدیر می‌توانید مشتریان را بررسی و مسدود کنید. تغییر نقش‌ها نیازمند مالک است.",
  "admin.users.maxPage": "این صفحه وجود ندارد.",
} as const;
