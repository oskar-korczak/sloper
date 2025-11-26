---
work_package_id: "WP10"
subtasks:
  - "T061"
  - "T062"
  - "T063"
  - "T064"
  - "T065"
  - "T066"
  - "T067"
  - "T068"
title: "Error Handling & Polish - User Story 5"
phase: "Phase 2 - Polish"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-26T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---
*Path: [kitty-specs/001-slop-video-generator/tasks/planned/WP10-error-handling-polish.md](kitty-specs/001-slop-video-generator/tasks/planned/WP10-error-handling-polish.md)*

# Work Package Prompt: WP10 – Error Handling & Polish - User Story 5

## Review Feedback

> **Populated by `/spec-kitty.review`** – Reviewers add detailed feedback here when work needs changes.

*[This section is empty initially.]*

---

## Objectives & Success Criteria

- Comprehensive error handling across all stages
- User-friendly error messages with actionable guidance
- Navigation warning during active generation
- Loading states on all interactive elements
- Accessibility improvements
- Backend error logging to Google Cloud

**Acceptance Criteria (from spec.md)**:
- US5.1: Invalid API key shows clear message
- US5.2: Rate limit shows which asset failed with retry option
- US5.3: Backend unavailable shows temporary unavailable message
- US5.4: All errors logged with context

## Context & Constraints

- **Reference documents**:
  - `kitty-specs/001-slop-video-generator/spec.md` - FR-035 to FR-039, User Story 5
- **Dependencies**: WP03-WP09 (all core features)
- **Priority**: P2 (enhancement, not blocking MVP)
- **Accessibility**: WCAG 2.1 AA compliance recommended

## Subtasks & Detailed Guidance

### Subtask T061 – Create ErrorBoundary component

- **Purpose**: Catch React errors and show fallback UI
- **Steps**:
  1. Create `frontend/src/components/ui/ErrorBoundary.tsx`
  2. Implement as class component (required for error boundaries)
  3. Show fallback with error message and retry button
  ```tsx
  interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }

  interface State {
    hasError: boolean;
    error: Error | null;
  }

  export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error('ErrorBoundary caught:', error, errorInfo);
      // Could send to logging service here
    }

    handleRetry = () => {
      this.setState({ hasError: false, error: null });
    };

    render() {
      if (this.state.hasError) {
        if (this.props.fallback) {
          return this.props.fallback;
        }

        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Try Again
            </button>
          </div>
        );
      }

      return this.props.children;
    }
  }
  ```
- **Files**: `frontend/src/components/ui/ErrorBoundary.tsx`, `frontend/src/components/ui/index.ts`
- **Parallel?**: No (foundational)

### Subtask T062 – Create Toast/Notification component

- **Purpose**: Transient error/success messages (FR-035)
- **Steps**:
  1. Create `frontend/src/components/ui/Toast.tsx`
  2. Support error, warning, success variants
  3. Auto-dismiss after configurable duration
  4. Create ToastProvider and useToast hook
  ```tsx
  type ToastType = 'error' | 'warning' | 'success' | 'info';

  interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
  }

  interface ToastContextType {
    toasts: Toast[];
    addToast: (type: ToastType, message: string, duration?: number) => void;
    removeToast: (id: string) => void;
  }

  const ToastContext = createContext<ToastContextType | null>(null);

  export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((type: ToastType, message: string, duration = 5000) => {
      const id = crypto.randomUUID();
      setToasts(prev => [...prev, { id, type, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
      }
    }, []);

    const removeToast = useCallback((id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
      <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
        {children}
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </ToastContext.Provider>
    );
  }

  function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
    const styles = {
      error: 'bg-red-100 border-red-500 text-red-700',
      warning: 'bg-amber-100 border-amber-500 text-amber-700',
      success: 'bg-green-100 border-green-500 text-green-700',
      info: 'bg-blue-100 border-blue-500 text-blue-700',
    };

    return (
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`p-4 border-l-4 rounded shadow-lg max-w-md ${styles[toast.type]}`}
          >
            <div className="flex justify-between items-start">
              <p>{toast.message}</p>
              <button onClick={() => onDismiss(toast.id)} className="ml-4">×</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
  }
  ```
- **Files**: `frontend/src/components/ui/Toast.tsx`
- **Parallel?**: Yes (after T061)

### Subtask T063 – Implement beforeunload warning

- **Purpose**: Warn user before navigating away during generation (FR-039)
- **Steps**:
  1. Add useEffect in App.tsx or WorkflowContext
  2. Listen to beforeunload when isGenerating is true
  3. Clean up listener when generation completes
  ```tsx
  // In App.tsx or a custom hook
  function useNavigationWarning(shouldWarn: boolean) {
    useEffect(() => {
      if (!shouldWarn) return;

      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }, [shouldWarn]);
  }

  // Usage in App.tsx
  function App() {
    const { isGenerating } = useWorkflow();
    useNavigationWarning(isGenerating);
    // ...
  }
  ```
- **Files**: `frontend/src/App.tsx` or `frontend/src/hooks/useNavigationWarning.ts`
- **Parallel?**: No (requires workflow context)

### Subtask T064 – Add inline error states to form inputs

- **Purpose**: Show validation errors directly on inputs
- **Steps**:
  1. Update ApiKeyInputs with validation feedback
  2. Update VideoSettings with validation
  3. Add error styling (red border, error message below)
  ```tsx
  // Reusable input wrapper
  interface FormFieldProps {
    label: string;
    error?: string;
    children: React.ReactNode;
    required?: boolean;
  }

  function FormField({ label, error, children, required }: FormFieldProps) {
    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {children}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }

  // Input with error state
  interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
  }

  function TextInput({ error, className, ...props }: TextInputProps) {
    return (
      <input
        {...props}
        className={`w-full px-3 py-2 border rounded-md
          ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}
          ${className || ''}`}
      />
    );
  }
  ```
- **Files**: `frontend/src/components/ui/FormField.tsx`, update config components
- **Parallel?**: Yes (after T061)

### Subtask T065 – Add loading states to buttons

- **Purpose**: Visual feedback during async operations
- **Steps**:
  1. Create Button component with loading prop
  2. Show spinner and disable when loading
  3. Update all action buttons to use loading state
  ```tsx
  interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
    children: React.ReactNode;
  }

  export function Button({ loading, variant = 'primary', children, disabled, ...props }: ButtonProps) {
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border',
      danger: 'bg-red-600 text-white hover:bg-red-700',
    };

    return (
      <button
        {...props}
        disabled={disabled || loading}
        className={`px-4 py-2 rounded-lg font-medium
          ${variants[variant]}
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2
          ${props.className || ''}`}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
  ```
- **Files**: `frontend/src/components/ui/Button.tsx`, update action buttons
- **Parallel?**: Yes (after T061)

### Subtask T066 – Add keyboard navigation and accessibility

- **Purpose**: WCAG 2.1 AA compliance
- **Steps**:
  1. Add ARIA labels to interactive elements
  2. Ensure focus management on stage transitions
  3. Add skip links for main content
  4. Verify color contrast meets AA standards
  ```tsx
  // Add to App.tsx
  <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:p-4 focus:bg-white">
    Skip to main content
  </a>

  // Add id to main content area
  <main id="main-content" tabIndex={-1}>
    {/* Stage content */}
  </main>

  // ARIA labels on buttons
  <button aria-label="Generate video scenes from prompt">
    Generate Scenes
  </button>

  // Focus management on stage change
  useEffect(() => {
    const main = document.getElementById('main-content');
    main?.focus();
  }, [stage]);
  ```
- **Files**: `frontend/src/App.tsx`, various components
- **Parallel?**: No (cross-cutting)

### Subtask T067 – Implement backend error logging

- **Purpose**: Log errors to Google Cloud Logging (FR-037, FR-038)
- **Steps**:
  1. Install google-cloud-logging package
  2. Configure structured logging
  3. Include context: timestamp, action, request details, stack trace
  ```python
  # backend/src/main.py
  import logging
  import os
  from google.cloud import logging as cloud_logging

  # Configure logging
  if os.getenv('GOOGLE_CLOUD_PROJECT'):
      client = cloud_logging.Client()
      client.setup_logging()
  else:
      logging.basicConfig(level=logging.INFO)

  logger = logging.getLogger(__name__)

  # Middleware for request logging
  @app.middleware("http")
  async def log_requests(request: Request, call_next):
      import time
      start = time.time()

      try:
          response = await call_next(request)
          duration = time.time() - start

          logger.info({
              "message": "Request completed",
              "path": request.url.path,
              "method": request.method,
              "status": response.status_code,
              "duration_ms": round(duration * 1000),
          })

          return response
      except Exception as e:
          logger.exception({
              "message": "Request failed",
              "path": request.url.path,
              "method": request.method,
              "error": str(e),
          })
          raise
  ```
  4. Update requirements.txt with google-cloud-logging
- **Files**: `backend/src/main.py`, `backend/requirements.txt`
- **Parallel?**: No (backend change)

### Subtask T068 – Final UI polish

- **Purpose**: Consistent styling and responsive layout
- **Steps**:
  1. Review all screens for consistent spacing
  2. Add responsive breakpoints for mobile
  3. Polish transitions between stages
  4. Add subtle animations for better UX
  ```css
  /* Add to index.css or components */

  /* Smooth transitions */
  .stage-enter {
    opacity: 0;
    transform: translateY(10px);
  }
  .stage-enter-active {
    opacity: 1;
    transform: translateY(0);
    transition: opacity 200ms, transform 200ms;
  }

  /* Responsive container */
  @media (max-width: 768px) {
    .max-w-4xl {
      max-width: 100%;
      padding-left: 1rem;
      padding-right: 1rem;
    }
  }
  ```
- **Files**: `frontend/src/index.css`, various components
- **Parallel?**: No (final pass)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Regression from changes | Manual smoke test full workflow |
| Accessibility issues missed | Use axe-core or Lighthouse audit |
| Over-engineering polish | Timebox to essentials |

## Definition of Done Checklist

- [ ] ErrorBoundary catches and displays errors
- [ ] Toast notifications work for all variants
- [ ] Navigation warning appears during generation
- [ ] Form inputs show inline errors
- [ ] Buttons show loading states
- [ ] ARIA labels on interactive elements
- [ ] Focus management on stage transitions
- [ ] Backend logs to Google Cloud
- [ ] Responsive on mobile viewport
- [ ] Full workflow smoke test passes
- [ ] `tasks.md` updated with WP10 completion

## Review Guidance

- Simulate errors at each stage
- Test with keyboard navigation only
- Verify mobile responsiveness
- Check Cloud Logging console for logs

## Activity Log

- 2025-11-26T00:00:00Z – system – lane=planned – Prompt created.
