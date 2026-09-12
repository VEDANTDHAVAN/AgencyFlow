import type { AuthUser } from "./auth";

declare module "socket.io" {
  interface SocketData {
    user: AuthUser;
  }
}