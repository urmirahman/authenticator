export * from './site';
export * from './faq';
export * from './about';
export { privacyPolicy } from './legal/privacy';
export { cookiePolicy } from './legal/cookies';
export { termsOfService } from './legal/terms';
export { securityPage, securityTxt } from './legal/security';

/** Public pages, in footer order. Mobile opens them on the web (EXPO_PUBLIC_WEB_URL). */
export const legalLinks = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/terms', label: 'Terms' },
  { href: '/security', label: 'Security' },
  { href: '/help', label: 'Help' },
  { href: '/about', label: 'About' },
] as const;
