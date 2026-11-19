import type * as THREE from 'three';

export function detectSoftwareGl(renderer: THREE.WebGLRenderer): boolean {
  const gl = renderer.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const raw = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '') : '';
  return /SwiftShader|llvmpipe|Software|Mesa/i.test(raw);
}

/**
 * Software-GL frame pacer using fenceSync + setTimeout fallback so headless
 * SwiftShader never saturates the Chromium main thread or drops screenshots.
 */
export function afterDraw(renderer: THREE.WebGLRenderer, cb: () => void): number {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  if (typeof gl.fenceSync === 'function') {
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (sync) {
      gl.flush();
      const poll = (): number => {
        const res = gl.clientWaitSync(sync, 0, 0);
        if (res === gl.ALREADY_SIGNALED || res === gl.CONDITION_SATISFIED) {
          gl.deleteSync(sync);
          return window.setTimeout(cb, 24);
        }
        if (res === gl.WAIT_FAILED) {
          gl.deleteSync(sync);
          return window.setTimeout(cb, 24);
        }
        return window.setTimeout(poll, 16);
      };
      return poll();
    }
  }
  return window.setTimeout(cb, 24);
}
