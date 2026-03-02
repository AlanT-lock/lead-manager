import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware désactivé temporairement : @supabase/ssr provoque un crash
 * sur Netlify Edge. L'auth est gérée par les layouts (app) et admin.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
