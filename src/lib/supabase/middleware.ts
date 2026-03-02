import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
    || request.nextUrl.pathname.startsWith('/forgot-password')
    || request.nextUrl.pathname.startsWith('/reset-password');
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

    const isResetPassword = request.nextUrl.pathname.startsWith('/reset-password');
    if (user && (isAuthPage || isSetupPage) && !isResetPassword) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = profile?.role?.toString().trim().toLowerCase();
      if (role === 'admin' || role === 'secretaire') {
        return NextResponse.redirect(new URL(role === 'secretaire' ? '/admin/documents-recus' : '/admin', request.url));
      }
      return NextResponse.redirect(new URL('/telepro', request.url));
    }

    if (user && (isTeleproApp || isAdminApp)) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = profile?.role?.toString().trim().toLowerCase();
      if ((role === 'admin' || role === 'secretaire') && isTeleproApp) {
        return NextResponse.redirect(new URL(role === 'secretaire' ? '/admin/documents-recus' : '/admin', request.url));
      }
      if (role === 'telepro' && isAdminApp) {
        return NextResponse.redirect(new URL('/telepro', request.url));
      }
      if (role === 'secretaire' && isAdminApp) {
        const path = request.nextUrl.pathname;
        if (path === '/admin/users' || path.startsWith('/admin/users/') || path === '/admin/stats' || path.startsWith('/admin/stats/')) {
          return NextResponse.redirect(new URL('/admin/documents-recus', request.url));
        }
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
