/**
 * Admin-only translations — the `admin.admins.*` namespace.
 *
 * Part of the admin dictionary, which is deliberately kept out of the public
 * barrel so it never reaches a public page's client chunk. The rationale lives
 * in `lib/i18n/admin-translations.ts`; add admin-only keys here, not there.
 */
export const adminsEn = {
  "admin.admins.col.user": "User",
  "admin.admins.col.role": "Role",
  "admin.admins.col.phone": "Phone",
  "admin.admins.col.status": "Status",
  "admin.admins.col.joined": "Joined",
  "admin.admins.col.actions": "Actions",
  "admin.admins.search.label": "Find a user by email or phone",
  "admin.admins.search.placeholder": "Search email or phone",
  "admin.admins.status.banned": "Banned",
  "admin.admins.status.active": "Active",
  "admin.admins.status.unverified": "Unverified",
  "admin.admins.role.user": "User",
  "admin.admins.role.admin": "Admin",
  "admin.admins.role.owner": "Owner",
  "admin.admins.action.promote": "Promote to admin",
  "admin.admins.action.demote": "Demote to user",
  "admin.admins.action.ban": "Ban",
  "admin.admins.action.unban": "Unban",
  "admin.admins.action.changeRole": "Change role",
  "admin.admins.action.setBanned": "Ban",
  "admin.admins.action.setActive": "Unban",
  "admin.admins.self.hint": "You cannot change your own role or status.",
  "admin.admins.role.updated": "Role updated",
  "admin.admins.confirm.title": "Confirm role change",
  "admin.admins.confirm.description":
    "This will immediately change this account's access to the admin dashboard.",
  "admin.admins.confirm.submit": "Confirm change",
  "admin.admins.status.updated": "Status updated",
  "admin.admins.empty": "No users yet.",
  "admin.admins.ban.warning":
    "A banned user cannot sign in until they are unbanned.",
} as const;

export const adminsFa = {
  "admin.admins.col.user": "کاربر",
  "admin.admins.col.role": "نقش",
  "admin.admins.col.phone": "تلفن",
  "admin.admins.col.status": "وضعیت",
  "admin.admins.col.joined": "تاریخ عضویت",
  "admin.admins.col.actions": "عملیات",
  "admin.admins.search.label": "یافتن کاربر با ایمیل یا تلفن",
  "admin.admins.search.placeholder": "جستجوی ایمیل یا تلفن",
  "admin.admins.status.banned": "مسدود",
  "admin.admins.status.active": "فعال",
  "admin.admins.status.unverified": "تأییدنشده",
  "admin.admins.role.user": "کاربر",
  "admin.admins.role.admin": "مدیر",
  "admin.admins.role.owner": "مالک",
  "admin.admins.action.promote": "ارتقا به مدیر",
  "admin.admins.action.demote": "تنزل به کاربر",
  "admin.admins.action.ban": "مسدود کردن",
  "admin.admins.action.unban": "رفع مسدودی",
  "admin.admins.action.changeRole": "تغییر نقش",
  "admin.admins.action.setBanned": "مسدود کردن",
  "admin.admins.action.setActive": "رفع مسدودی",
  "admin.admins.self.hint": "شما نمی‌توانید نقش یا وضعیت خودتان را تغییر دهید.",
  "admin.admins.role.updated": "نقش به‌روزرسانی شد",
  "admin.admins.confirm.title": "تأیید تغییر نقش",
  "admin.admins.confirm.description":
    "دسترسی این حساب به داشبورد مدیریت بلافاصله تغییر می‌کند.",
  "admin.admins.confirm.submit": "تأیید تغییر",
  "admin.admins.status.updated": "وضعیت به‌روزرسانی شد",
  "admin.admins.empty": "هنوز کاربری وجود ندارد.",
  "admin.admins.ban.warning":
    "کاربر مسدودشده تا زمان رفع مسدودی نمی‌تواند وارد شود.",
} as const;
