// Session Timeout Manager
export class SessionManager {
  private static instance: SessionManager;
  private timeout: NodeJS.Timeout | null = null;
  private warningTimeout: NodeJS.Timeout | null = null;
  private readonly TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly WARNING_DURATION = 28 * 60 * 1000; // 28 minutes (2 min warning)
  private onTimeout?: () => void;
  private onWarning?: () => void;

  private constructor() {
    this.setupListeners();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  setCallbacks(onTimeout: () => void, onWarning?: () => void) {
    this.onTimeout = onTimeout;
    this.onWarning = onWarning;
  }

  private setupListeners() {
    // Reset timer on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => {
      document.addEventListener(event, () => this.resetTimer(), true);
    });
  }

  start() {
    this.resetTimer();
  }

  stop() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
      this.warningTimeout = null;
    }
  }

  private resetTimer() {
    this.stop();

    // Set warning timeout (2 minutes before logout)
    this.warningTimeout = setTimeout(() => {
      if (this.onWarning) {
        this.onWarning();
      }
    }, this.WARNING_DURATION);

    // Set logout timeout
    this.timeout = setTimeout(() => {
      if (this.onTimeout) {
        this.onTimeout();
      }
    }, this.TIMEOUT_DURATION);
  }

  getLastActivity(): Date {
    return new Date();
  }
}

export const sessionManager = SessionManager.getInstance();
