export const LOCAL_ADMIN = {
  login: "Gabriel Martins",
  password: "195430",
  email: "gabriel.martins@cs-inteligente.local",
  cookieName: "cs_local_admin",
  userCookieName: "cs_local_user"
};

export function isLocalAdmin(login: string, password: string) {
  return login.trim().toLowerCase() === LOCAL_ADMIN.login.toLowerCase() && password === LOCAL_ADMIN.password;
}
