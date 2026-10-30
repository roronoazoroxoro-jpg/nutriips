import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (!request.cookies.get("nutriips_session")?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*", "/imprimir/:path*"],
};
