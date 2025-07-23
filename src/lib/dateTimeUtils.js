// Date and Time utility functions for consistent formatting
export const dateTimeUtils = {
  // Format date to Thai locale
  formatDate: (date, options = {}) => {
    const defaultOptions = {
      day: 'numeric',
      month: 'long', 
      year: 'numeric'
    };
    return new Date(date).toLocaleDateString('th-TH', { ...defaultOptions, ...options });
  },

  // Format time to Thai locale (24-hour format)
  formatTime: (date) => {
    return new Date(date).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  },

  // Format date and time together
  formatDateTime: (date) => {
    const dateStr = new Date(date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const timeStr = new Date(date).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return `${dateStr} เวลา ${timeStr}`;
  },

  // Format date for input fields (YYYY-MM-DD)
  formatDateForInput: (date) => {
    return new Date(date).toISOString().split('T')[0];
  },

  // Format time for input fields (HH:mm)
  formatTimeForInput: (date) => {
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // Format short date (DD/MM/YYYY)
  formatShortDate: (date) => {
    return new Date(date).toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  },

  // Format for calendar month header
  formatMonthYear: (date) => {
    return new Date(date).toLocaleDateString('th-TH', {
      month: 'long',
      year: 'numeric'
    });
  },

  // Format for weekday with date
  formatWeekdayDate: (date) => {
    return new Date(date).toLocaleDateString('th-TH', {
      weekday: 'long',
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  },

  // Format currency
  formatCurrency: (amount) => {
    return `฿${amount.toLocaleString('th-TH')}`;
  },

  // Get today's date for input default
  getTodayForInput: () => {
    return new Date().toISOString().split('T')[0];
  },

  // Get current time for input default  
  getCurrentTimeForInput: () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
};
