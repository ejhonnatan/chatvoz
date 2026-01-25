import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BlinkUser } from '@blinkdotnew/sdk';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
  user: BlinkUser | null;
}

export function DashboardLayout({ children, currentPage, onPageChange, user }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar currentPage={currentPage} onPageChange={onPageChange} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
