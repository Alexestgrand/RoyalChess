import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import {
  BadRequestException,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  StreamableFile,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AvatarUploadService } from "./avatar-upload.service";

/**
 * Sert les fichiers `*.webp` produits par {@link AvatarUploadService}.
 * Le nom de fichier est contraint : pas de chemins arbitraires.
 *
 * - `Cross-Origin-Resource-Policy: cross-origin` est obligatoire : sans lui,
 *   Helmet pose `same-origin` par défaut et le navigateur bloque l'image
 *   chargée depuis `apps/web` (origin différent du port API).
 * - `Cache-Control` est court + `must-revalidate` : l'URL d'avatar contient
 *   un query param `?v=<mtime>` qui invalide le cache à chaque upload, mais
 *   on ne veut pas qu'un client conserve longtemps une réponse 404 / une
 *   version obsolète si quelqu'un partage l'URL sans query.
 */
@Controller("uploads/avatars")
@Throttle({ default: { limit: 200, ttl: 60_000 } })
export class AvatarsPublicController {
  constructor(private readonly avatars: AvatarUploadService) {}

  @Get(":filename")
  @Header("Content-Type", "image/webp")
  @Header("Cache-Control", "public, max-age=60, must-revalidate")
  @Header("Cross-Origin-Resource-Policy", "cross-origin")
  async serve(@Param("filename") raw: string): Promise<StreamableFile> {
    const filename = path.basename(raw);
    if (filename !== raw || !/^[a-z0-9]{10,40}\.webp$/i.test(filename)) {
      throw new BadRequestException({ code: "invalid_avatar_filename" });
    }
    const root = path.resolve(this.avatars.resolvedUploadDir());
    const full = path.resolve(path.join(root, filename));
    const rel = path.relative(root, full);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      throw new BadRequestException({ code: "invalid_avatar_path" });
    }
    try {
      await stat(full);
    } catch {
      throw new NotFoundException();
    }
    return new StreamableFile(createReadStream(full));
  }
}
