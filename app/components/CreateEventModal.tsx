'use client';

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { format, parse, addHours } from 'date-fns';
import { CalendarEvent, Calendar as CalendarType } from '../lib/calendarService';
import { useAuth } from '../contexts/AuthContext';
import { ClipboardIcon, CheckIcon, TrashIcon, MapPinIcon, LinkIcon } from '@heroicons/react/24/outline';

// --- Simple Segmented Control Component ---
interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

function SegmentedControl<T extends string>({ options, value, onChange, disabled }: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 p-0.5" role="group">
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={`px-4 py-1 text-sm font-medium focus:z-10 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50
            ${index === 0 ? 'rounded-l-md' : ''}
            ${index === options.length - 1 ? 'rounded-r-md' : ''}
            ${value === option.value
              ? 'bg-white dark:bg-gray-600 text-indigo-700 dark:text-white shadow'
              : 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600/50'
            }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
// --- End Segmented Control ---

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (event: Omit<CalendarEvent, 'id' | 'userId'>) => Promise<void>;
  onEdit: (id: string, event: Partial<CalendarEvent>) => Promise<void>;
  onEventDelete: (id: string) => Promise<void>;
  selectedDate?: Date | null;
  event?: CalendarEvent | null;
  calendars: CalendarType[];
}

export default function CreateEventModal({
  isOpen,
  onClose,
  onCreate,
  onEdit,
  onEventDelete,
  selectedDate,
  event,
  calendars,
}: CreateEventModalProps) {
  const { user, loading: authLoading } = useAuth();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'in-person' | 'online'>('in-person');
  const [location, setLocation] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [calendarId, setCalendarId] = useState('');
  const [start, setStart] = useState<Date>(new Date());
  const [end, setEnd] = useState<Date>(addHours(new Date(), 1));
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState('');
  const [showCopied, setShowCopied] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      console.log('Modal opened. Event:', event, 'Selected Date:', selectedDate);
      setError('');
      setFormLoading(false);
      setIsDeleting(false);
      if (event) {
        setTitle(event.title || '');
        setType(event.type || 'in-person');
        setLocation(event.location || '');
        setMeetingUrl(event.meetingUrl || '');
        setCalendarId(event.calendarId || calendars[0]?.id || '');
        setStart(event.start || new Date());
        setEnd(event.end || addHours(event.start || new Date(), 1));
        setIsLive(event.isLive || false);
      } else if (selectedDate) {
        setTitle('');
        setType('in-person');
        setLocation('');
        setMeetingUrl('');
        setCalendarId(calendars[0]?.id || '');
        setStart(selectedDate);
        setEnd(addHours(selectedDate, 1));
        setIsLive(false);
      } else {
        setTitle('');
        setType('in-person');
        setLocation('');
        setMeetingUrl('');
        setCalendarId(calendars[0]?.id || '');
        setStart(new Date());
        setEnd(addHours(new Date(), 1));
        setIsLive(false);
      }
    } else {
    }
  }, [isOpen, event, selectedDate, calendars]);

  // Function to handle start date/time changes and adjust end time
  const handleStartDateChange = (newStartDate: Date) => {
    setStart(newStartDate);
    // If the current end time is before the new start time, adjust end time
    if (end < newStartDate) {
      // Set end time to be 1 hour after the new start time (or adjust as needed)
      setEnd(addHours(newStartDate, 1));
    }
  };

  // Function to handle end date/time changes, ensuring it's not before start
  const handleEndDateChange = (newEndDate: Date) => {
    if (newEndDate >= start) {
      setEnd(newEndDate);
    } else {
      // Optionally, provide feedback or automatically set to start time
       setEnd(start); // Set end time to be same as start time if invalid
       // Or setError("End time cannot be before start time.");
    }
  };

  if (authLoading || !user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFormLoading(true);

    if (!calendarId) {
      setError('Please select a calendar.');
      setFormLoading(false);
      return;
    }
    if (end <= start) {
      setError('End time must be after start time');
      setFormLoading(false);
      return;
    }

    try {
      if (event) {
        const eventUpdateData: Partial<CalendarEvent> = {
          title,
          type,
          location: type === 'in-person' ? location : undefined,
          meetingUrl: type === 'online' ? meetingUrl : undefined,
          calendarId,
          start,
          end,
          isLive,
        };
        console.log("Calling onEdit with:", event.id, eventUpdateData);
        await onEdit(event.id, eventUpdateData);
      } else {
        const eventCreateData: Omit<CalendarEvent, 'id' | 'userId'> = {
          title,
          type,
          location: type === 'in-person' ? location : undefined,
          meetingUrl: type === 'online' ? meetingUrl : undefined,
          calendarId,
          start,
          end,
          isLive,
        };
        console.log("Calling onCreate with:", eventCreateData);
        await onCreate(eventCreateData);
      }
      onClose();
    } catch (err) {
      console.error('Error saving event:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while saving the event');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    const textToCopy = type === 'online' ? meetingUrl : location;
    if (!textToCopy || !navigator.clipboard) {
      setError("Clipboard access not supported or no content to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(textToCopy);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      setError("Failed to copy to clipboard.");
      console.error('Clipboard error:', err);
    }
  };

  const handleDeleteClick = async () => {
    if (!event?.id) return;

    if (window.confirm('Are you sure you want to delete this event?')) {
      setIsDeleting(true);
      setError('');
      try {
        console.log(`Calling onEventDelete with id: ${event.id}`);
        await onEventDelete(event.id);
        onClose();
      } catch (err) {
        console.error('Error deleting event:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while deleting the event');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const initialStartTime = format(start || new Date(), 'HH:mm');
  const initialEndTime = format(end || addHours(start || new Date(), 1), 'HH:mm');

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <form onSubmit={handleSubmit}>
                  <div className="px-6 py-5 space-y-5">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
                      {event ? 'Edit Event' : 'Create Event'}
                    </Dialog.Title>

                    <div className="space-y-4">
                      <div>
                        <input
                          type="text"
                          id="title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Event Title"
                          className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white dark:bg-gray-700"
                          required
                          disabled={formLoading || isDeleting}
                        />
                      </div>

                      <div>
                        <label htmlFor="calendarId" className="sr-only">Calendar</label>
                        <select
                          id="calendarId"
                          value={calendarId}
                          onChange={(e) => setCalendarId(e.target.value)}
                          className="mt-1 block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white dark:bg-gray-700"
                          required
                          disabled={formLoading || isDeleting}
                        >
                          <option value="" disabled={!calendarId}>Select a calendar</option>
                          {calendars.map((cal) => (
                            <option key={cal.id} value={cal.id}>
                              {cal.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="startTime" className="block text-xs font-medium text-gray-500 dark:text-gray-400">Start</label>
                          <input
                            type="date"
                            id="startDate"
                            value={format(start, 'yyyy-MM-dd')}
                            onChange={(e) => {
                              const datePart = e.target.value;
                              const timePart = format(start, 'HH:mm');
                              const newDate = parse(`${datePart} ${timePart}`, 'yyyy-MM-dd HH:mm', new Date());
                              handleStartDateChange(newDate);
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                          <input
                            type="time"
                            id="startTime"
                            value={format(start, 'HH:mm')}
                            onChange={(e) => {
                              const timePart = e.target.value;
                              const datePart = format(start, 'yyyy-MM-dd');
                              const newDate = parse(`${datePart} ${timePart}`, 'yyyy-MM-dd HH:mm', new Date());
                              handleStartDateChange(newDate);
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>

                        <div>
                          <label htmlFor="endTime" className="block text-xs font-medium text-gray-500 dark:text-gray-400">End</label>
                          <input
                            type="date"
                            id="endDate"
                            value={format(end, 'yyyy-MM-dd')}
                            min={format(start, 'yyyy-MM-dd')}
                            onChange={(e) => {
                              const datePart = e.target.value;
                              const timePart = format(end, 'HH:mm');
                              const newDate = parse(`${datePart} ${timePart}`, 'yyyy-MM-dd HH:mm', new Date());
                              handleEndDateChange(newDate);
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                          <input
                            type="time"
                            id="endTime"
                            value={format(end, 'HH:mm')}
                            min={format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd') ? format(start, 'HH:mm') : undefined}
                            onChange={(e) => {
                              const timePart = e.target.value;
                              const datePart = format(end, 'yyyy-MM-dd');
                              const newDate = parse(`${datePart} ${timePart}`, 'yyyy-MM-dd HH:mm', new Date());
                              handleEndDateChange(newDate);
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="text-center">
                        <SegmentedControl
                          options={[
                            { label: 'In-Person', value: 'in-person' },
                            { label: 'Online', value: 'online' },
                          ]}
                          value={type}
                          onChange={setType}
                          disabled={formLoading || isDeleting}
                        />
                      </div>

                      {type === 'in-person' && (
                        <div>
                          <label htmlFor="location" className="sr-only">Location</label>
                          <div className="relative mt-1 rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                              <MapPinIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </div>
                            <input
                              type="text"
                              id="location"
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              className="block w-full rounded-md border-0 py-2 pl-10 pr-12 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white dark:bg-gray-700"
                              placeholder="Location"
                              disabled={formLoading || isDeleting}
                            />
                            <div className="absolute inset-y-0 right-0 flex py-1.5 pr-1.5">
                              <button 
                                type="button"
                                onClick={handleCopyToClipboard}
                                className="inline-flex items-center rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 font-sans text-xs text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
                                disabled={formLoading || isDeleting || !location}
                                aria-label="Copy Location"
                              >
                                {showCopied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardIcon className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {type === 'online' && (
                        <div>
                          <label htmlFor="meetingUrl" className="sr-only">Meeting URL</label>
                          <div className="relative mt-1 rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                              <LinkIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </div>
                            <input
                              type="url"
                              id="meetingUrl"
                              value={meetingUrl}
                              onChange={(e) => setMeetingUrl(e.target.value)}
                              className="block w-full rounded-md border-0 py-2 pl-10 pr-12 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white dark:bg-gray-700"
                              placeholder="https://..."
                              disabled={formLoading || isDeleting}
                            />
                            <div className="absolute inset-y-0 right-0 flex py-1.5 pr-1.5">
                              <button 
                                type="button"
                                onClick={handleCopyToClipboard}
                                className="inline-flex items-center rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 font-sans text-xs text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
                                disabled={formLoading || isDeleting || !meetingUrl}
                                aria-label="Copy URL"
                              >
                                {showCopied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardIcon className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="relative flex items-start">
                        <div className="flex h-5 items-center">
                          <input
                            id="isLive"
                            name="isLive"
                            type="checkbox"
                            checked={isLive}
                            onChange={(e) => setIsLive(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-600"
                            disabled={formLoading || isDeleting}
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="isLive" className="font-medium text-gray-700 dark:text-gray-300">
                            Mark as Live
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 mx-6 mb-2 rounded-md">
                      <div className="flex">
                        <div className="ml-3">
                          <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 sm:flex sm:flex-row-reverse sm:px-6">
                    <button
                      type="submit"
                      className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:ml-3 sm:w-auto disabled:opacity-50"
                      disabled={formLoading || isDeleting}
                    >
                      {formLoading ? 'Saving...' : (event ? 'Save Changes' : 'Create Event')}
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-600 px-4 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 sm:mt-0 sm:w-auto disabled:opacity-50"
                      onClick={onClose}
                      disabled={formLoading || isDeleting}
                    >
                      Cancel
                    </button>
                    {event && (
                      <button
                        type="button"
                        className="mt-3 inline-flex w-full justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:mt-0 sm:mr-auto sm:w-auto disabled:opacity-50"
                        onClick={handleDeleteClick}
                        disabled={formLoading || isDeleting}
                      >
                        {isDeleting ? 'Deleting...' : <TrashIcon className="h-5 w-5" />}
                      </button>
                    )}
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 