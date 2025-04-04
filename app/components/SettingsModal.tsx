'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ArrowLeftOnRectangleIcon, PencilSquareIcon, MoonIcon, SunIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { User } from 'firebase/auth'; // Assuming User type is imported

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null | undefined; // From useAuth
  onSignOut: () => void;
  // TODO: Add theme props when implemented (e.g., currentTheme, setTheme)
}

// Basic Segmented Control for Theme (can be replaced with a better one)
function ThemeSwitcher({ currentTheme, setTheme }: { currentTheme: string, setTheme: (theme: 'light' | 'dark') => void }) {
  return (
    <div className="inline-flex rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 p-0.5">
      <button
        onClick={() => setTheme('light')}
        className={`px-3 py-1 rounded-l-md text-sm font-medium flex items-center space-x-1 ${currentTheme === 'light' ? 'bg-white dark:bg-gray-600 text-indigo-700 dark:text-white shadow' : 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600/50'}`}
      >
        <SunIcon className="h-4 w-4" />
        <span>Light</span>
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`px-3 py-1 rounded-r-md text-sm font-medium flex items-center space-x-1 ${currentTheme === 'dark' ? 'bg-white dark:bg-gray-600 text-indigo-700 dark:text-white shadow' : 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600/50'}`}
      >
        <MoonIcon className="h-4 w-4" />
        <span>Dark</span>
      </button>
    </div>
  );
}

export default function SettingsModal({
  isOpen,
  onClose,
  user,
  onSignOut,
}: SettingsModalProps) {

  // Placeholder state for theme - replace with actual context later
  const [currentTheme, setCurrentTheme] = useState('light');
  const handleSetTheme = (theme: 'light' | 'dark') => {
    console.log("Theme changed to:", theme); // Placeholder action
    setCurrentTheme(theme);
    // TODO: Integrate with actual theme provider (e.g., next-themes)
  };

  const handleAccountEdit = () => {
    // TODO: Implement account editing logic (potentially another modal or form)
    alert("Account editing feature not yet implemented.");
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500/75 dark:bg-black/50 transition-opacity" />
        </Transition.Child>

        {/* Modal Content */}
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md">
                 <div className="absolute top-0 right-0 pt-4 pr-4">
                    <button
                      type="button"
                      className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                      onClick={onClose}
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                <div className="px-6 py-5 space-y-6">
                  <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-gray-900 dark:text-white text-center">
                    Settings
                  </Dialog.Title>

                  {/* Account Section */}
                  <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-5">
                     <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">Account</h4>
                     <div className="text-sm text-gray-600 dark:text-gray-400">
                        Logged in as: {user?.email || 'N/A'}
                     </div>
                     <button 
                       onClick={handleAccountEdit}
                       className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                       <PencilSquareIcon className="h-5 w-5 mr-1"/>
                       Edit Account Info (WIP)
                     </button>
                  </div>

                  {/* Theme Section */}
                  <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-5">
                     <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">Appearance</h4>
                     <ThemeSwitcher currentTheme={currentTheme} setTheme={handleSetTheme} />
                     <p className="text-xs text-gray-500 dark:text-gray-400">Theme switching requires setup (e.g., next-themes).</p>
                  </div>

                  {/* Sign Out Section */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                     <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                        onClick={() => {
                          onSignOut();
                          onClose(); // Close modal after initiating sign out
                        }}
                      >
                        <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-2" />
                        Sign Out
                      </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 