'use client';

import { ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * レイアウトコンテナ - 全ページで幅とパディングを統一管理
 * すべてのコンテンツはこのコンテナ内に配置する
 */
export default function Container({ children, className = '' }: ContainerProps) {
  return (
    <div className={`max-w-7xl mx-auto px-4 ${className}`}>
      {children}
    </div>
  );
}
