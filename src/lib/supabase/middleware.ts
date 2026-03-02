import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isSetupPage = request.nextUrl.pathname.startsWith('/setup');

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const isSetupApi = request.nextUrl.pathname.startsWith('/api/setup');
    if (!url || !key) {
      // Env vars manquantes : laisser passer /setup, /login et les API setup
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

    // Ne pas rediriger les requêtes API setup (appelées depuis la page /setup)
    if (!user && !isAuthPage && !isSetupPage && !isSetupApi) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (user && (isAuthPage || isSetupPage)) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const { data: profile } = serviceKey
        ? await createClient(url, serviceKey)
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        : await supabase.from('profiles').select('role').eq('id', user.id).single();

      const role = profile?.role?.toString().trim().toLowerCase();
      if (role === 'admin' || role === 'secretaire') {
        return NextResponse.redirect(new URL(role === 'secretaire' ? '/admin/documents-recus' : '/admin', request.url));
      }
      return NextResponse.redirect(new URL('/telepro', request.url));
    }

    if (user && (isTeleproApp || isAdminApp)) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const { data: profile } = serviceKey
        ? await createClient(url, serviceKey)
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        : await supabase.from('profiles').select('role').eq('id', user.id).single();

      const role = profile?.role?.toString().trim().toLowerCase();
      if ((role === 'admin' || role === 'secretaire') && isTeleproApp) {
        return NextResponse.redirect(new URL(role === 'secretaire' ? '/admin/documents-recus' : '/admin', request.url));
      }
      if (role === 'telepro' && isAdminApp) {
        return NextResponse.redirect(new URL('/telepro', request.url));
      }
      // Secrétaire n'a pas accès à /admin/users ni /admin/stats
      if (role === 'secretaire' && isAdminApp) {
        const path = request.nextUrl.pathname;
        if (path === '/admin/users' || path.startsWith('/admin/users/') || path === '/admin/stats' || path.startsWith('/admin/stats/')) {
          return NextResponse.redirect(new URL('/admin/documents-recus', request.url));
        }
      }
    }

    return supabaseResponse;
  } catch {
    // En cas d'erreur Supabase, laisser passer /setup, /login et API setup
    if (isAuthPage || isSetupPage || request.nextUrl.pathname.startsWith('/api/setup')) {
      return NextResponse.next({ request });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
