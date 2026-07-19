"use client";

import { Component, type ReactNode } from "react";

/**
 * Some browsers/devices genuinely lack WebGL (old hardware, locked-down
 * corporate policy, disabled GPU). If the R3F Canvas fails to create a
 * context, fall back to the static painting instead of leaving a blank void.
 */
export class CanvasErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
