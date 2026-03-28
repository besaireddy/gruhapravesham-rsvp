export const ADMIN_EMAILS = ['bsaireddy05@gmail.com', 'naveenr028@gmail.com', 'kottapriyanka5@gmail.com'];

export function isAuthorizedAdmin(email?: string | null) {
  return Boolean(email && ADMIN_EMAILS.includes(email));
}
