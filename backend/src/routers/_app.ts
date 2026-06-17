import { router } from '../trpc';
import { userRouter } from './users';
import { clientRouter } from './clients';
import { sowRouter } from './sows';
import { jobRouter } from './jobs';
import { authRouter } from './auth';

export const appRouter = router({
    auth: authRouter,
    users: userRouter,
    clients: clientRouter,
    sows: sowRouter,
    jobs: jobRouter,
});

export type AppRouter = typeof appRouter;
