"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

type Props = {
  children: ReactNode;
  label: string;
};

type State = {
  failed: boolean;
};

export class AdminOrderSectionBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("DEBRODER_ADMIN_ORDER_SECTION_ERROR", {
      section: this.props.label,
      message: error.message,
      componentStack: info.componentStack
    });
  }

  render() {
    if (this.state.failed) {
      return (
        <section role="alert" className="border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
          <p className="font-semibold">{this.props.label} belum dapat ditampilkan.</p>
          <p className="mt-2">Rincian utama pesanan tetap tersedia. Muat ulang bagian ini setelah memeriksa data terkait.</p>
          <button
            type="button"
            onClick={() => this.setState({ failed: false })}
            className="mt-4 min-h-10 rounded-full border border-amber-700 px-4 font-semibold"
          >
            Coba Muat Ulang
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}
