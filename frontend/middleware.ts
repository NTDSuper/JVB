import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

  // Redirect / for authenticated users
  if (pathname === "/" && isAuthenticated) {
    if (isManagerOrAdmin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/products", request.url));
  }

  // Routes that require authentication (no specific role restriction)
  const protectedRoutes = ["/profile", "/orders", "/cart", "/checkout"];
  
  // Check if this is an order detail page (e.g., /orders/123)
  const isOrderDetailPage = /^\/orders\/\d+$/.test(pathname);
  
  // Routes requiring specific roles
  const adminOnlyRoutes = ["/admin"];
  const managerRoutes = ["/dashboard", "/ai-dashboard", "/products/manager"];
  const manageRoutes = ["/orders/manage"];
  const userOnlyRoutes = ["/cart", "/checkout"];

  // Check if route requires admin role
  const isAdminRoute = adminOnlyRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));
  
  // Check if route requires manager role
  const isManagerRoute = managerRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));
  
  // Check if route requires manage access (admin or manager)
  const isManageRoute = manageRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));

  // Check if route requires regular user
  const isUserRoute = userOnlyRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));

  // Authentication checks
  if (!isAuthenticated && (protectedRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`)) || isOrderDetailPage || pathname === "/profile")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated) {
    // Check admin routes
    if (isAdminRoute && !userRoles.includes("admin")) {
      return NextResponse.redirect(new URL("/403", request.url));
    }

    // Check manager routes
    if (isManagerRoute && !userRoles.includes("admin") && !userRoles.includes("manager")) {
      return NextResponse.redirect(new URL("/403", request.url));
    }

    // Check manage routes
    if (isManageRoute && !userRoles.includes("admin") && !userRoles.includes("manager")) {
      return NextResponse.redirect(new URL("/403", request.url));
    }

    // Check user-only routes (block admin/manager)
    if (isUserRoute && isManagerOrAdmin) {
      if (pathname === "/cart") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } else if (pathname === "/checkout") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  // Block Manager/Admin from customer-facing routes while allowing /orders/[id]
  if (isManagerOrAdmin && isAuthenticated) {
    // Allow /orders/[id] for viewing order details
    if (isOrderDetailPage) {
      return NextResponse.next();
    }
    
    // Redirect /orders and /orders/* (except /orders/manage) to /orders/manage
    if (pathname === "/orders" || (pathname.startsWith("/orders/") && !pathname.startsWith("/orders/manage"))) {
      return NextResponse.redirect(new URL("/orders/manage", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};