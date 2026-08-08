'use client';

import React, { useState } from 'react';
import TabNavigation, { defaultTabs, TabItem } from '@/components/TabNavigation';

export default function TabNavigationDemo() {
  const [activeTab, setActiveTab] = useState('education');

  const customTabs: TabItem[] = [
    {
      id: 'education',
      label: 'Education',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>,
    },
    {
      id: 'fashion',
      label: 'Fashion',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.4a1.6 1.6 0 0 0-1.2-.4h-14a1.6 1.6 0 0 0-1.2.4 1.6 1.6 0 0 0-.4 1.2v14a1.6 1.6 0 0 0 .4 1.2 1.6 1.6 0 0 0 1.2.4h14a1.6 1.6 0 0 0 1.2-.4 1.6 1.6 0 0 0 .4-1.2v-14a1.6 1.6 0 0 0-.4-1.2z"/></svg>,
    },
    {
      id: 'music',
      label: 'Music',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
    },
    {
      id: 'podcast',
      label: 'Podcast',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>,
    },
    {
      id: 'video',
      label: 'Video',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl space-y-12">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tab Navigation Component</h1>
          <p className="mt-2 text-gray-600">
            A reusable tab navigation with badge, icons, and animated underline.
          </p>
        </div>

        {/* Example 1: Default tabs (lucide-react icons) */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Example 1: Default tabs</h2>
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <TabNavigation
              tabs={defaultTabs}
              activeTab={activeTab}
              onChange={setActiveTab}
              badgeNumber={1}
            />
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Active tab: <span className="font-semibold text-purple-600">{activeTab}</span>
          </p>
        </section>

        {/* Example 2: Custom tabs with SVG icons */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Example 2: Custom tabs (SVG icons)</h2>
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <TabNavigation
              tabs={customTabs}
              activeTab={activeTab}
              onChange={setActiveTab}
              badgeNumber={2}
            />
          </div>
        </section>

        {/* Example 3: Many tabs (scrollable) */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Example 3: Scrollable tabs</h2>
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <TabNavigation
              tabs={[...customTabs, ...customTabs, ...customTabs]}
              activeTab={activeTab}
              onChange={setActiveTab}
              badgeNumber={3}
            />
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Tabs are horizontally scrollable on smaller screens. Scrollbar is hidden for a cleaner look.
          </p>
        </section>
      </div>
    </div>
  );
}