let installed = false;

function isNotFoundError(error: unknown) {
  return error instanceof DOMException && error.name === "NotFoundError";
}

export function installDomSafetyPatch() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalRemoveChild = Node.prototype.removeChild;
  const originalInsertBefore = Node.prototype.insertBefore;

  Node.prototype.removeChild = function patchedRemoveChild<T extends Node>(child: T): T {
    try {
      return originalRemoveChild.call(this, child) as T;
    } catch (error) {
      if (isNotFoundError(error) && child.parentNode) {
        return originalRemoveChild.call(child.parentNode, child) as T;
      }
      if (isNotFoundError(error)) return child;
      throw error;
    }
  };

  Node.prototype.insertBefore = function patchedInsertBefore<T extends Node>(newNode: T, referenceNode: Node | null): T {
    try {
      return originalInsertBefore.call(this, newNode, referenceNode) as T;
    } catch (error) {
      if (isNotFoundError(error)) {
        return originalInsertBefore.call(this, newNode, null) as T;
      }
      throw error;
    }
  };
}
