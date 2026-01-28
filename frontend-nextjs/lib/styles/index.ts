/**
 * Centralized Style Utilities
 *
 * Re-exports all style utilities for easy importing:
 * import { cn, copyButtonStyles, messageContainerStyles } from '@/lib/styles';
 */

// Core utility
export { cn } from './cn';

// Button styles
export {
  copyButtonStyles,
  toggleButtonStyles,
  iconButton,
  resetButton,
  primaryButton,
  sortToggleButton,
  resetButtonFull,
  languageSwitcherButton,
  textLinkButtonStyles,
  iconActionButton,
  dangerIconButton,
} from './buttons';

// Card/container styles
export {
  messageContainerStyles,
  indicatorStyles,
  conversationCard,
  popupCard,
  continuationIndicator,
  datePickerContainer,
  datePickerContainerCompact,
  searchInputStyles,
  notificationItemStyles,
  notificationDetailsPanel,
  unreadIndicatorBar,
  checkboxLabelStyles,
} from './cards';

// Tab styles
export {
  tabButtonStyles,
  tabBadgeStyles,
  dropdownItemStyles,
  newMessageIndicator,
  unreadBadge,
  statusBadgeStyles,
  unreadDot,
  liveIndicatorDot,
} from './tabs';

// Prose/content styles
export {
  proseBase,
  contentStyles,
  avatarStyles,
  roleLabelStyles,
  timestampStyles,
} from './prose';
