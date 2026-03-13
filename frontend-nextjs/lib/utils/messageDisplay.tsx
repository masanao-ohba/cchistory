import { memo } from 'react';
import { avatarStyles } from '@/lib/styles';

export const Avatar = memo(function Avatar({
  isUser,
  size = 'md'
}: {
  isUser: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={avatarStyles(isUser, size)}>
      {isUser ? 'U' : 'A'}
    </div>
  );
});

export const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).format(date);
};
