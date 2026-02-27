import { router } from "../trpc";
import { jobsRouter } from "./jobs";
import { chatRouter } from "./chat";
import { memoryRouter } from "./memory";
import { councilRouter } from "./council";
import { confirmationsRouter } from "./confirmations";
import { decisionsRouter } from "./decisions";

export const appRouter = router({
  jobs: jobsRouter,
  chat: chatRouter,
  memory: memoryRouter,
  council: councilRouter,
  confirmations: confirmationsRouter,
  decisions: decisionsRouter,
});

export type AppRouter = typeof appRouter;
