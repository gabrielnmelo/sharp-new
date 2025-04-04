'use client';

import { useState, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  addDays, 
  subDays, 
  addWeeks, 
  subWeeks,
  startOfToday,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isSameWeek,
  isSameMonth
} from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, PencilIcon, ArrowLeftOnRectangleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import CalendarGrid from './CalendarGrid';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { calendarService, Calendar as CalendarType, CalendarEvent } from '../lib/calendarService';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import CreateEventModal from './CreateEventModal';
import { PlusIcon as PlusIconSolid } from '@heroicons/react/20/solid';
import SettingsModal from './SettingsModal';

export default function Calendar() {
  const { user, signOut } = useAuth();
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<CalendarType[]>([]);
  const [newCalendarName, setNewCalendarName] = useState('');
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<CalendarType | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [selectedDateForEvent, setSelectedDateForEvent] = useState<Date | null>(null);
  const [selectedEventForModal, setSelectedEventForModal] = useState<CalendarEvent | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [newCalendarColor, setNewCalendarColor] = useState('blue');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      console.log('Calendar useEffect: No user, skipping listeners');
      return;
    }
    // Add a unique ID to track this specific effect run
    const effectId = Math.random().toString(36).substring(2, 8);
    console.log(`Calendar useEffect [${effectId}]: Setting up listeners for user:`, user.uid);

    let isCalendarSubscribed = true;
    const unsubscribeCalendars = calendarService.onCalendarsChange(user.uid, (updatedCalendars) => {
       if (!isCalendarSubscribed) return; // Prevent updates after unsubscribe
      console.log(`Calendar onCalendarsChange [${effectId}]: Received update:`, updatedCalendars);
      setCalendars(updatedCalendars);
    });

    let isEventSubscribed = true;
    const unsubscribeEvents = calendarService.onEventsChange(user.uid, (updatedEvents) => {
       if (!isEventSubscribed) return; // Prevent updates after unsubscribe
      console.log(`Calendar onEventsChange [${effectId}]: Received update (count):`, updatedEvents.length);
      // Log the actual IDs to check for duplicates from the source
      console.log(`Calendar onEventsChange [${effectId}]: Event IDs:`, updatedEvents.map(e => e.id)); 
      setEvents(updatedEvents);
    });

    // Return the cleanup function
    return () => {
      console.log(`Calendar useEffect [${effectId}]: Cleaning up listeners`);
      isCalendarSubscribed = false; // Mark as unsubscribed
      isEventSubscribed = false;  // Mark as unsubscribed
      unsubscribeCalendars();
      unsubscribeEvents();
    };
  }, [user]); // Dependency array only includes user

  const handleCreateCalendar = async (name: string, color: string) => {
    if (!user) return;
    try {
      await calendarService.saveCalendar({ name, color, userId: user.uid }, user.uid);
    } catch (error) {
      console.error('Error creating calendar:', error);
    }
  };

  const handleCreateEvent = async (event: Omit<CalendarEvent, 'id' | 'userId'>) => {
    console.log('handleCreateEvent: Triggered');
    if (!user) {
      console.log('handleCreateEvent: Aborted (no user)');
      return;
    }
    const eventData = { ...event, userId: user.uid };
    console.log('handleCreateEvent: Saving event:', eventData);
    try {
      await calendarService.saveEvent(eventData, user.uid); // Pass data and userId
      console.log('handleCreateEvent: Save successful');
      // State update happens via listener
    } catch (error) {
      console.error('handleCreateEvent: Error saving event:', error);
    }
  };

  const handleUpdateEvent = async (id: string, event: Partial<CalendarEvent>) => {
    if (!user) return;
    try {
      await calendarService.updateEvent(id, { ...event, userId: user.uid }, user.uid);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await calendarService.deleteEvent(id);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleAddCalendar = async () => {
    console.log('handleAddCalendar: Triggered');
    console.log('handleAddCalendar: Checking condition:', { user: !!user, name: newCalendarName.trim() });
    if (!user || !newCalendarName.trim()) {
      console.log(`handleAddCalendar: Aborted (user: ${!!user}, name empty: ${!newCalendarName.trim()})`);
      return;
    }
    const colors = ['blue', 'green', 'purple', 'red', 'yellow', 'indigo'];
    const newCalendar = {
      name: newCalendarName.trim(),
      color: newCalendarColor,
      userId: user.uid
    };
    console.log('handleAddCalendar: Saving calendar:', newCalendar);
    try {
      await calendarService.saveCalendar(newCalendar, user.uid);
      console.log('handleAddCalendar: Save successful');
      setIsCalendarModalOpen(false);
      console.log('handleAddCalendar: Input cleared');
    } catch (error) {
      console.error('handleAddCalendar: Error saving calendar:', error);
    }
  };

  const handleEditCalendar = (calendar: CalendarType) => {
    setEditingCalendar(calendar);
    setEditName(calendar.name);
    setEditColor(calendar.color);
    setModalMode('edit');
    setIsCalendarModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCalendar || !user) return;
    await calendarService.updateCalendar(editingCalendar.id, {
      name: editName,
      color: editColor,
      userId: user.uid
    }, user.uid);
    setIsCalendarModalOpen(false);
  };

  const handleDeleteCalendar = async () => {
    if (!editingCalendar || !user) return;
    await calendarService.deleteCalendar(editingCalendar.id);
    setIsCalendarModalOpen(false);
    setModalMode(null);
  };

  const handlePrev = () => {
    switch (view) {
      case 'day':
        setSelectedDate(subDays(selectedDate, 1));
        break;
      case 'week':
        setSelectedDate(subWeeks(selectedDate, 1));
        break;
      case 'month':
        setSelectedDate(subMonths(selectedDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (view) {
      case 'day':
        setSelectedDate(addDays(selectedDate, 1));
        break;
      case 'week':
        setSelectedDate(addWeeks(selectedDate, 1));
        break;
      case 'month':
        setSelectedDate(addMonths(selectedDate, 1));
        break;
    }
  };

  const getDateRangeText = () => {
    switch (view) {
      case 'day':
        return format(selectedDate, 'MMMM d, yyyy');
      case 'week': {
        const start = startOfWeek(selectedDate);
        const end = endOfWeek(selectedDate);
        return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
      }
      case 'month':
        return format(selectedDate, 'MMMM yyyy');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // AuthContext listener will handle redirect via ProtectedRoute
    } catch (error) {
      console.error("Error signing out:", error);
      // Optionally show an error message to the user
    }
  };

  console.log('Calendar Render: Events count:', events.length); // Log state before passing down
  // Log first few event IDs to spot duplicates in state
  console.log('Calendar Render: Event IDs in state:', events.slice(0, 5).map(e => e.id)); 

  const handleOpenCreateModal = (date: Date | null = null) => {
    setSelectedEventForModal(null);
    setSelectedDateForEvent(date || selectedDate || startOfToday());
    setIsCreateEventModalOpen(true);
  };

  const handleOpenEditModal = (event: CalendarEvent) => {
    setSelectedEventForModal(event);
    setSelectedDateForEvent(null);
    setIsCreateEventModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateEventModalOpen(false);
    setTimeout(() => {
       setSelectedEventForModal(null);
       setSelectedDateForEvent(null);
    }, 300);
  };

  const handleOpenSettingsModal = () => {
    setIsSettingsModalOpen(true);
  };

  const handleCloseSettingsModal = () => {
    setIsSettingsModalOpen(false);
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 overflow-hidden relative">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 dark:bg-gray-800 p-6 border-r border-gray-200 dark:border-gray-700 flex flex-col justify-between flex-shrink-0">
        {/* Top/Middle section: Calendars */}
        <div> 
          {/* Calendars Title and Add Button */}
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Calendars</h2>
            <button
              onClick={() => { 
                setModalMode('add'); 
                setNewCalendarName(''); // Clear name for add mode
                setNewCalendarColor('blue'); // Reset color to default for add mode
                setIsCalendarModalOpen(true); 
              }}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
              aria-label="Add new calendar"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Calendar List */}
          <ul className="space-y-2 mb-6">
            {calendars.map((cal) => (
              <li key={cal.id} className="flex items-center justify-between group">
                <div className="flex items-center space-x-2">
                  <span 
                    className="inline-block w-3 h-3 rounded" 
                    style={{ backgroundColor: {
                      blue: '#3B82F6',
                      green: '#10B981',
                      purple: '#8B5CF6',
                      red: '#EF4444',
                      yellow: '#F59E0B',
                      indigo: '#6366F1'
                    }[cal.color] || '#6B7280' }}
                  ></span>
                  <span className={`text-sm text-gray-700 dark:text-gray-300`}>
                    {cal.name}
                  </span>
                </div>
                <button
                  onClick={() => handleEditCalendar(cal)}
                  className="p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom section: Account/Logout - This will be pushed down by justify-between */}
        <div>
          {/* You can add Account details here later if needed */} 
          <button
            onClick={handleOpenSettingsModal}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Cog6ToothIcon className="h-5 w-5 mr-2" />
            Settings
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getDateRangeText()}
            </h2>
            <div className="ml-4 flex items-center space-x-2">
              <button
                type="button"
                onClick={handlePrev}
                className="rounded-md p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="rounded-md p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(startOfToday())}
                className="ml-4 rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Today
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setView('day')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                view === 'day'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => setView('week')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                view === 'week'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setView('month')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                view === 'month'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Month
            </button>
          </div>
        </div>

        {/* Scrollable Calendar Grid Area */}
        <div className="flex-1 overflow-y-auto">
          <CalendarGrid
            view={view}
            selectedDate={selectedDate}
            events={events}
            onEventCreate={handleCreateEvent}
            onEventEdit={handleUpdateEvent}
            onEventDelete={handleDeleteEvent}
            onDateClick={handleOpenCreateModal}
            onEventClick={handleOpenEditModal}
            calendars={calendars}
          />
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => handleOpenCreateModal()}
        className="absolute bottom-6 right-6 z-30 inline-flex items-center rounded-full bg-indigo-600 p-3 text-white shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        <PlusIconSolid className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Event Modal */}
      <CreateEventModal
        isOpen={isCreateEventModalOpen}
        onClose={handleCloseModal}
        onCreate={handleCreateEvent}
        onEdit={handleUpdateEvent}
        onEventDelete={handleDeleteEvent}
        selectedDate={selectedDateForEvent}
        event={selectedEventForModal}
        calendars={calendars}
      />

      {/* Add/Edit Calendar Modal */}
      <Transition.Root show={isCalendarModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => { setIsCalendarModalOpen(false); setModalMode(null); }}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                  <div className="px-6 py-5 space-y-5">
                    <div>
                      <div className="text-left">
                        <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
                          {modalMode === 'add' ? 'Add New Calendar' : 'Edit Calendar'}
                        </Dialog.Title>
                        <div className="mt-4 space-y-4">
                          <div>
                            <label htmlFor="calendar-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Calendar Name
                            </label>
                            <input
                              type="text"
                              id="calendar-name"
                              value={modalMode === 'add' ? newCalendarName : editName}
                              onChange={(e) => modalMode === 'add' ? setNewCalendarName(e.target.value) : setEditName(e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="calendar-color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Calendar Color
                            </label>
                            <div className="grid grid-cols-6 gap-2">
                              {['blue', 'green', 'purple', 'red', 'yellow', 'indigo'].map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => modalMode === 'add' ? setNewCalendarColor(color) : setEditColor(color)}
                                  className={`w-8 h-8 rounded-full border-2 ${
                                    (modalMode === 'add' ? newCalendarColor : editColor) === color
                                      ? 'border-gray-900 dark:border-white ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-800'
                                      : 'border-transparent hover:border-gray-400 dark:hover:border-gray-500'
                                  }`}
                                  style={{ backgroundColor: {
                                    blue: '#3B82F6',
                                    green: '#10B981',
                                    purple: '#8B5CF6',
                                    red: '#EF4444',
                                    yellow: '#F59E0B',
                                    indigo: '#6366F1'
                                  }[color] }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-5 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    {modalMode === 'edit' && (
                      <button
                        type="button"
                        className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
                        onClick={handleDeleteCalendar}
                      >
                        Delete Calendar
                      </button>
                    )}
                    {!modalMode && <div />}
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        className="rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                        onClick={() => { setIsCalendarModalOpen(false); setModalMode(null); }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                        onClick={modalMode === 'add' ? handleAddCalendar : handleSaveEdit}
                        disabled={(modalMode === 'add' && !newCalendarName.trim()) || (modalMode === 'edit' && !editName.trim())}
                      >
                        {modalMode === 'add' ? 'Save' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={handleCloseSettingsModal}
        user={user}
        onSignOut={handleSignOut}
        // TODO: Pass theme context/setter when implemented
      />
    </div>
  );
} 