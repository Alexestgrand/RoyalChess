import { Controller, Get, Query, BadRequestException } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { UsersService } from "./users.service";
import { USERNAME_QUERY_REGEX } from "./constants/username.constants";

@Controller("users")
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class UsersPublicController {
  constructor(private readonly users: UsersService) {}

  @Get("check-username")
  async checkUsername(@Query("username") raw: string | undefined): Promise<{ available: boolean }> {
    const username = typeof raw === "string" ? raw.trim() : "";
    if (!USERNAME_QUERY_REGEX.test(username)) {
      throw new BadRequestException("invalid_username");
    }
    const available = await this.users.isUsernameAvailable(username);
    return { available };
  }
}
