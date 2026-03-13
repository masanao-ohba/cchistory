/** Pre-render margin for IntersectionObserver viewport detection (px) */
export const VIEWPORT_PRERENDER_MARGIN_PX = 200;

/** Root margin for floating user message IntersectionObserver */
export const FLOATING_MSG_ROOTMARGIN = '-300px 0px 0px 0px';

/** Default header height used for scroll calculations (px) */
export const HEADER_HEIGHT_DEFAULT_PX = 220;

/** Scroll distance threshold to collapse the header (px) */
export const SCROLL_COLLAPSE_THRESHOLD_PX = 100;

/** Scroll distance threshold to expand the header (px) */
export const SCROLL_EXPAND_THRESHOLD_PX = 20;

/** Minimum notification count before triggering auto-load */
export const MIN_NOTIFICATIONS_BEFORE_AUTOLOAD = 10;

/** Delay before marking a notification as auto-read (ms) */
export const NOTIFICATION_AUTOREAD_DELAY_MS = 5000;

/** Fade-out animation duration for auto-read notifications (ms) */
export const NOTIFICATION_AUTOREAD_FADE_MS = 750;

/** Maximum number of workers in the markdown worker pool */
export const WORKER_POOL_MAX_SIZE = 4;

/** Starting index for new message insertion */
export const NEW_MESSAGE_START_INDEX = 2;

/** Duration to show copy confirmation feedback (ms) */
export const COPY_CONFIRM_DURATION_MS = 2000;

/** Delay before hiding message hover UI (ms) */
export const MESSAGE_HOVER_HIDE_DELAY_MS = 150;

/** Number of assistant messages that qualifies a group as "tall" */
export const TALL_GROUP_ASSISTANT_COUNT = 4;

/** IntersectionObserver threshold for group visibility detection */
export const GROUP_VISIBILITY_THRESHOLD = 0.1;

/** Delay before showing "load more" notification (ms) */
export const LOAD_MORE_NOTIFICATION_DELAY_MS = 500;

/** Duration to display "load more" notification (ms) */
export const LOAD_MORE_NOTIFICATION_DURATION_MS = 3000;
