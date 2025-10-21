'use client';

import { useState } from 'react';
import { useNotificationStore, Notification } from '@/lib/stores/notificationStore';

interface NotificationItemProps {
  notification: Notification;
  onClick?: (notification: Notification) => void;
  onDelete?: (notificationId: string) => void;
}

// Notification type configuration
const notificationConfig = {
  types: {
    permission_request: {
      emoji: '🔐',
      label: 'Permission Request',
      color: 'yellow',
    },
    tool_use: {
      emoji: '🔧',
      label: 'Tool Use',
      color: 'blue',
    },
    notification: {
      emoji: '💬',
      label: 'Notification',
      color: 'green',
    },
  },
  colors: {
    yellow: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      icon: 'text-yellow-600',
    },
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      icon: 'text-blue-600',
    },
    green: {
      bg: 'bg-green-50',
      text: 'text-green-800',
      icon: 'text-green-600',
    },
  },
};

export default function NotificationItem({ notification, onClick, onDelete }: NotificationItemProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { markAsRead, projects } = useNotificationStore();

  // Get type configuration
  const typeConfig = notificationConfig.types[notification.type] || {
    emoji: '📢',
    label: 'Unknown',
    color: 'green' as const,
  };
  const colorConfig = notificationConfig.colors[typeConfig.color as keyof typeof notificationConfig.colors];

  // Get project display name
  const getProjectDisplayName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project ? project.display_name : projectId;
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    }
  };

  // Parse details
  const hasDetails = notification.details && Object.keys(notification.details).length > 0;

  const detailOptions = (() => {
    if (!notification.details) return [];
    const details = notification.details;

    if (Array.isArray(details.options)) return details.options;
    if (Array.isArray(details.choices)) return details.choices;
    if (typeof details.options === 'string') {
      return details.options.split('\n').filter((opt: string) => opt.trim());
    }
    return [];
  })();

  const otherDetails = (() => {
    if (!notification.details) return null;
    const detailsCopy = { ...notification.details };
    delete (detailsCopy as any).options;
    delete (detailsCopy as any).choices;
    delete (detailsCopy as any).hook_event_name;
    return Object.keys(detailsCopy).length > 0 ? detailsCopy : null;
  })();

  // Toggle read status
  const handleToggleRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.read) {
      try {
        await markAsRead(notification.id);
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    }
  };

  return (
    <div
      className={`notification-item relative border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-150 ${
        !notification.read ? 'bg-blue-50 border-blue-100' : 'bg-white'
      }`}
      data-notification-id={notification.id}
      onClick={() => onClick?.(notification)}
    >
      {/* Unread indicator (left border) */}
      {!notification.read && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-blue-700" />
      )}

      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* Type Icon */}
          <div className="flex-shrink-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${colorConfig.bg} ${colorConfig.icon}`}
            >
              {typeConfig.emoji}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                {/* Project Name */}
                <span className="text-sm font-medium text-purple-600 truncate">
                  {getProjectDisplayName(notification.project_id)}
                </span>

                {/* Type Badge */}
                <span className={`text-xs px-2 py-1 rounded-full ${colorConfig.bg} ${colorConfig.text}`}>
                  {typeConfig.label}
                </span>

                {/* Unread Dot */}
                {!notification.read && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full unread-indicator" title="Unread" />
                )}
              </div>

              {/* Timestamp */}
              <span className="text-xs text-gray-500 flex-shrink-0">
                {formatTime(notification.timestamp)}
              </span>
            </div>

            {/* Message */}
            <div className="mb-2">
              {/* Notification or Permission Request */}
              {notification.notification && (
                <p className="text-sm text-gray-700 line-clamp-2">{notification.notification}</p>
              )}

              {/* Tool Use */}
              {notification.type === 'tool_use' && !notification.notification && (
                <div className="text-sm text-gray-700">
                  <p className="font-medium">{notification.tool_name}</p>
                  {notification.tool_input && (
                    <p className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded mt-1 line-clamp-1">
                      {notification.tool_input}
                    </p>
                  )}
                </div>
              )}

              {/* Details Section */}
              {hasDetails && (
                <div className="mt-3">
                  {/* Toggle Details Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDetails(!showDetails);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${
                        showDetails ? 'rotate-90' : ''
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{showDetails ? 'Hide Details' : 'Show Details'}</span>
                  </button>

                  {/* Details Content */}
                  {showDetails && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      {/* Options/Choices */}
                      {detailOptions.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-600 mb-2">Available Options:</p>
                          {detailOptions.map((option: any, index: number) => (
                            <div key={index} className="flex items-start space-x-2">
                              <span className="text-xs font-mono text-blue-600">{index + 1}.</span>
                              <span className="text-xs text-gray-700 flex-1">{option}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Other Details */}
                      {otherDetails && (
                        <div className={detailOptions.length > 0 ? 'mt-3 space-y-1' : 'space-y-1'}>
                          <p className="text-xs font-medium text-gray-600 mb-1">Additional Information:</p>
                          <pre className="text-xs text-gray-600 font-mono bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                            {JSON.stringify(otherDetails, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Session ID */}
                      {notification.details?.session_id && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Session:</span> {notification.details.session_id}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {/* Mark as Read/Unread */}
                <button
                  onClick={handleToggleRead}
                  className="p-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded flex items-center space-x-1"
                  title={notification.read ? 'Mark as unread' : 'Mark as read'}
                >
                  <svg
                    className={`w-4 h-4 ${!notification.read ? 'text-blue-500' : ''}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    {notification.read ? (
                      <>
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path
                          fillRule="evenodd"
                          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                          clipRule="evenodd"
                        />
                      </>
                    ) : (
                      <>
                        <path d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </>
                    )}
                  </svg>
                  <span className={!notification.read ? 'mark-read-text' : ''}>
                    {notification.read ? 'Unread' : 'Mark read'}
                  </span>
                </button>
              </div>

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(notification.id);
                }}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete notification"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
