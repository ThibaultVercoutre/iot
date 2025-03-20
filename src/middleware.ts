import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard")
  const token = request.cookies.get("auth-token")?.value

  if (isDashboardRoute) {
    if (!token) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
} 