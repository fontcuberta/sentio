import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  const SUPERADMIN_EMAIL = 'isafontcu@gmail.com';
  const user = event.locals.user ?? null;
  const isSuperadmin = user?.email?.toLowerCase() === SUPERADMIN_EMAIL;
  return {
    user,
    isSuperadmin,
    pathname: event.url.pathname
  };
};
