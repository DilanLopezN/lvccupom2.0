import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirecionamentos SEO-friendly
  const seoRedirects = {
    '/presente-dia-namorados': '/',
    '/cupons-romanticos': '/',
    '/ideias-presente-namorado': '/',
    '/presente-personalizado-barato': '/',
    '/presente-criativo-2025': '/',
    '/vale-presente-romantico': '/'
  }

  if (seoRedirects[pathname as keyof typeof seoRedirects]) {
    const url = new URL(
      seoRedirects[pathname as keyof typeof seoRedirects],
      request.url
    )
    url.searchParams.set('utm_source', 'seo')
    url.searchParams.set('utm_campaign', pathname.slice(1))
    return NextResponse.redirect(url, 301)
  }

  // Headers SEO
  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Cache headers para assets estáticos
  if (
    pathname.startsWith('/images/') ||
    pathname.startsWith('/_next/static/')
  ) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
