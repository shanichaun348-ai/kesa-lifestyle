export type AdminRole = "owner" | "catalogue_manager" | "support" | "content_editor";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
};

export type AdminSession = {
  userId: string;
  email: string;
  name: string;
  role: AdminRole;
  /** Unix seconds — session creation time */
  iat: number;
  /** Unix seconds — session expiry */
  exp: number;
};
