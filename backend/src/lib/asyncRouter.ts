import type { RequestHandler, Router } from "express";

type ExpressLayer = {
  handle?: RequestHandler & { __asyncWrapped?: boolean };
  route?: { stack?: ExpressLayer[] };
};

function wrapLayer(layer: ExpressLayer) {
  if (layer.route?.stack) {
    layer.route.stack.forEach(wrapLayer);
    return;
  }

  const handle = layer.handle;
  if (!handle || handle.__asyncWrapped || handle.length === 4) return;

  const wrapped: RequestHandler & { __asyncWrapped?: boolean } = (req, res, next) => {
    try {
      Promise.resolve(handle(req, res, next)).catch(next);
    } catch (err) {
      next(err);
    }
  };
  wrapped.__asyncWrapped = true;
  layer.handle = wrapped;
}

export function wrapAsyncRouter<T extends Router>(router: T): T {
  ((router as unknown as { stack?: ExpressLayer[] }).stack ?? []).forEach(wrapLayer);
  return router;
}
