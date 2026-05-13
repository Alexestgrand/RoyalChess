import { mkdirSync } from "node:fs";
import { stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { BadRequestException, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { fromBuffer } from "file-type";
import sharp from "sharp";
import type { AppConfig } from "../config/config.schema";

const MAX_BYTES = 2 * 1024 * 1024;
/** MIME détecté sur le buffer (pas l’extension) — complété par `sharp().metadata()`. */
const ALLOWED_FILE_TYPE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_SHARP_FORMAT = new Set(["jpeg", "png", "webp", "gif"]);

@Injectable()
export class AvatarUploadService implements OnModuleInit {
  private readonly logger = new Logger(AvatarUploadService.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  onModuleInit(): void {
    mkdirSync(this.resolvedUploadDir(), { recursive: true });
    this.logger.log(`Répertoire avatars : ${this.resolvedUploadDir()}`);
  }

  resolvedUploadDir(): string {
    const raw = this.config.get("AVATAR_UPLOAD_DIR", { infer: true });
    return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  }

  /**
   * Construit l'URL publique de l'avatar.
   *
   * Le query param `?v=<version>` est crucial : l'URL côté disque reste
   * `{userId}.webp` (un seul fichier par utilisateur, pas de fuite d'historique),
   * mais la clé de cache navigateur change à chaque upload grâce à la version.
   * Sans ça, après ré-upload le navigateur sert l'ancienne image depuis son
   * cache HTTP et l'utilisateur croit que la sauvegarde n'a rien fait.
   */
  buildPublicAvatarUrl(userId: string, version?: number | string): string {
    const base = this.config.get("API_PUBLIC_URL", { infer: true }).replace(/\/$/, "");
    const suffix = version === undefined ? "" : `?v=${encodeURIComponent(String(version))}`;
    return `${base}/uploads/avatars/${userId}.webp${suffix}`;
  }

  async processAndSaveAvatar(userId: string, buffer: Buffer): Promise<string> {
    if (buffer.length === 0 || buffer.length > MAX_BYTES) {
      throw new BadRequestException({ code: "avatar_too_large", maxBytes: MAX_BYTES });
    }
    const detected = await fromBuffer(buffer);
    if (!detected || !ALLOWED_FILE_TYPE_MIME.has(detected.mime)) {
      throw new BadRequestException({ code: "avatar_invalid_magic" });
    }
    let meta: sharp.Metadata;
    try {
      meta = await sharp(buffer).metadata();
    } catch {
      throw new BadRequestException({ code: "avatar_corrupt" });
    }
    if (!meta.format || !ALLOWED_SHARP_FORMAT.has(meta.format)) {
      throw new BadRequestException({ code: "avatar_invalid_format" });
    }
    const webp = await sharp(buffer)
      .rotate()
      .resize(256, 256, { fit: "cover", position: sharp.strategy.attention })
      .webp({ quality: 85 })
      .toBuffer();
    const outPath = path.join(this.resolvedUploadDir(), `${userId}.webp`);
    await writeFile(outPath, webp);
    // mtime ms après écriture : version stable et reproductible (deux instances
    // qui ré-écrivent le même buffer génèrent des versions cohérentes avec le
    // disque, ce qui aide les futures revalidations conditionnelles).
    let version: number = Date.now();
    try {
      const s = await stat(outPath);
      version = Math.floor(s.mtimeMs);
    } catch {
      /* fallback Date.now déjà initialisé */
    }
    return this.buildPublicAvatarUrl(userId, version);
  }
}
