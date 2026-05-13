import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Vérifie le header `Origin` pour les requêtes HTTP mutantes (CSRF renforcé).
 */
@Injectable()
export class OriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== "http") {
      return true;
    }
    const req = context.switchToHttp().getRequest<Request>();
    if (!MUTATING.has(req.method)) {
      return true;
    }
    const path = req.path ?? req.url ?? "";
    if (path.includes("/auth/google")) {
      return true;
    }
    if (path.startsWith("/api/docs") || path.startsWith("/api/docs-json")) {
      return true;
    }
    if (path === "/health" || path === "/metrics") {
      return true;
    }

    const origin = req.headers.origin;
    if (typeof origin !== "string" || origin.length === 0) {
      return true;
    }

    const raw = this.config.get<string>("CORS_ORIGIN") ?? "";
    const allowed = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const ok = allowed.some((a) => origin === a);
    if (!ok) {
      throw new ForbiddenException("origin_interdit");
    }
    return true;
  }
}
