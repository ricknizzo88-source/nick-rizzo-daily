import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/review",
  "/admin/places",
  "/admin/collaborations",
  "/admin/hidden",
  "/admin/about",
  "/admin/analytics",
  "/admin/applications",
  "/places/edit"
];

function adminAuthConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_TOKEN);
}

export function middleware(request) {
  if (!adminAuthConfigured()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get("nrd_admin")?.value;

  if (token === process.env.ADMIN_SESSION_TOKEN) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/review/:path*",
    "/admin/places/:path*",
    "/admin/collaborations/:path*",
    "/admin/hidden/:path*",
    "/admin/about/:path*",
    "/admin/analytics/:path*",
    "/admin/applications/:path*",
    "/places/edit/:path*"
  ]
};
