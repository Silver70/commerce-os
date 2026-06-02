import { createStart } from '@tanstack/react-start';
import { createCsrfMiddleware } from '@tanstack/start-client-core';
import { authkitMiddleware } from '@workos/authkit-tanstack-react-start';

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
});

export const startInstance = createStart(() => ({
  requestMiddleware: [authkitMiddleware(), csrfMiddleware],
}));
