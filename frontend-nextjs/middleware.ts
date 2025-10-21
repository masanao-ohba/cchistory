import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/request';

export default createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale,

  // Disable automatic locale detection to simplify routing
  localeDetection: false,

  // Don't use locale prefix for default locale
  localePrefix: 'as-needed',
});

export const config = {
  // Match all paths except static files and API routes
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
