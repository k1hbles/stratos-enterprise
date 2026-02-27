interface SandboxInfo {
  exists: boolean;
  id?: string;
}

class DesktopManager {
  getSandboxInfo(sandboxId: string): SandboxInfo {
    // TODO: implement sandbox management
    void sandboxId;
    return { exists: false };
  }

  async screenshot(_sandboxId: string): Promise<Uint8Array> {
    throw new Error("Sandbox not available");
  }
}

export const desktopManager = new DesktopManager();
