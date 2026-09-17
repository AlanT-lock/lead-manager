import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isPublicAuthPath } from '@/lib/auth-paths';
import { canAccessAdminPath, normalizeRole, roleLandingPath, usesAdminSpace } from '@/lib/roles';

export async function updateSession(request: NextRequest) {
  const isAuthPage = isPublicAuthPath(request.nextUrl.pathname);
  const isSetupPage = request.nextUrl.pathname.startsWith('/setup');
  const isSetupApi = request.nextUrl.pathname.startsWith('/api/setup');

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      if (isAuthPage || isSetupPage || isSetupApi) {
        return NextResponse.next({ request });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isTeleproApp = request.nextUrl.pathname.startsWith('/telepro');
    const isAdminApp = request.nextUrl.pathname.startsWith('/admin');

    if (!user && !isAuthPage && !isSetupPage && !isSetupApi) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Un utilisateur déjà connecté qui clique sur un lien de réinitialisation doit
    // pouvoir atteindre /auth/confirm et /reset-password, pas être renvoyé sur son dashboard.
    const isPasswordRecovery = request.nextUrl.pathname.startsWith('/reset-password')
      || request.nextUrl.pathname.startsWith('/auth/');
    if (user && (isAuthPage || isSetupPage) && !isPasswordRecovery) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = normalizeRole(profile?.role);
      return NextResponse.redirect(new URL(roleLandingPath(role), request.url));
    }

    if (user && (isTeleproApp || isAdminApp)) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = normalizeRole(profile?.role);
      if (usesAdminSpace(role) && isTeleproApp) {
        return NextResponse.redirect(new URL(roleLandingPath(role), request.url));
      }
      if (role === 'telepro' && isAdminApp) {
        return NextResponse.redirect(new URL('/telepro', request.url));
      }
      if (isAdminApp && !canAccessAdminPath(role, request.nextUrl.pathname)) {
        return NextResponse.redirect(new URL(roleLandingPath(role), request.url));
      }
    }

    return supabaseResponse;
  } catch (err) {
    if (isAuthPage || isSetupPage || isSetupApi) {
      return NextResponse.next({ request });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
