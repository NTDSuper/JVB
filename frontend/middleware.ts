import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Route authorization configuration by Role
const ROLE_PERMISSIONS: Record<string, string[]> = {
  "/products": ["user", "guest"],
  "/cart": ["user"],
  "/checkout": ["user"],
  "/admin": ["admin"],
  "/ai-dashboard": ["manager"],
  "/orders/manage": ["admin", "manager"],
  "/dashboard": ["admin", "manager"],
};

// Management roles that are BLOCKED from customer-facing routes
const MANAGEMENT_ROLES = ["manager", "admin"];
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignore static assets, api routes, next internal files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;
  const userRolesRaw = request.cookies.get("user_roles")?.value;

  let userRoles: string[] = [];
  if (userRolesRaw) {
    try {
      userRoles = JSON.parse(decodeURIComponent(userRolesRaw));
    } catch {
      try {
        userRoles = JSON.parse(userRolesRaw);
      } catch {
        userRoles = [];
      }
    }
  }

  const isAuthenticated = Boolean(token);
  const isManagerOrAdmin = MANAGEMENT_ROLES.some((role) => userRoles.includes(role));

  // If authenticated user tries to access /login or /register -> redirect
  if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
    if (isManagerOrAdmin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/products", request.url));
  }

  // Block Manager/Admin from customer-facing routes: /products, /products/[id], /cart, /orders
  if (isManagerOrAdmin) {
    // Check if this is a product route (/products, /products/[id])
    if (pathname === "/products" || pathname.startsWith("/products/")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // Check /cart
    if (pathname === "/cart") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // Check /orders (user's own orders) - NOT /orders/manage or /orders/[id] (those are handled by ROLE_PERMISSIONS)
    if (pathname === "/orders") {
      return NextResponse.redirect(new URL("/orders/manage", request.url));
    }
  }

  // Redirect / for authenticated users
  if (pathname === "/" && isAuthenticated) {
    if (isManagerOrAdmin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/products", request.url));
  }

  // Check if route has specific role permission rules
  const matchedRoleRoute = Object.keys(ROLE_PERMISSIONS).find(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (matchedRoleRoute) {
    const requiredRoles = ROLE_PERMISSIONS[matchedRoleRoute];

    // For routes that allow "guest", unauthenticated users are allowed
    if (requiredRoles.includes("guest") && !isAuthenticated) {
      return NextResponse.next();
    }

    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user has required role
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));
    if (!hasRole) {
      // User is logged in but doesn't have required role -> redirect to /403
      return NextResponse.redirect(new URL("/403", request.url));
    }
  }

  // Check general protected user routes (/profile, /orders)
  const isProtectedUserRoute =
    pathname === "/profile" ||
    pathname === "/orders" ||
    pathname.startsWith("/orders/");

  if (isProtectedUserRoute && !matchedRoleRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};