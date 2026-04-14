export type ToastKind = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  /** Auto-dismiss after this many ms. Use 0 or omit with persistent: true for no auto-dismiss. */
  timeoutMs?: number;
  /** When true, the toast stays until explicitly dismissed. */
  persistent?: boolean;
  /** Optional action button shown on the right side of the toast. */
  action?: ToastAction;
}

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  timeoutMs: number;
  persistent: boolean;
  action: ToastAction | null;
  createdAt: number;
}
