import { onRequestGet as __auth_ts_onRequestGet } from "E:\\desktop\\syncthings\\Personal_AI_software_test\\mcblog_git\\mcblog_git_public\\functions\\auth.ts"
import { onRequestGet as __callback_ts_onRequestGet } from "E:\\desktop\\syncthings\\Personal_AI_software_test\\mcblog_git\\mcblog_git_public\\functions\\callback.ts"

export const routes = [
    {
      routePath: "/auth",
      mountPath: "/",
      method: "GET",
      middlewares: [],
      modules: [__auth_ts_onRequestGet],
    },
  {
      routePath: "/callback",
      mountPath: "/",
      method: "GET",
      middlewares: [],
      modules: [__callback_ts_onRequestGet],
    },
  ]