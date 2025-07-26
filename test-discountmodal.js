// Test DiscountModal Time Format
const testBooking = {
  id: 'test-123',
  customerName: 'ทดสอบ ระบบ',
  serviceId: 'service-1',
  serviceName: 'นวดไทยประยุกต์',
  duration: 90,
  startTime: new Date('2025-07-26T13:00:00'),
  status: 'in_progress'
};

const testServices = [
  {
    id: 'service-1',
    name: 'นวดไทยประยุกต์',
    category: 'นวดไทย',
    priceByDuration: {
      60: 300,
      90: 450,
      120: 600
    }
  }
];

// Test time format function
const formatTimeRange = (startTime, duration) => {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + (duration * 60000));
  
  const formatTime = (date) => {
    return date.toLocaleString('th-TH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };
  
  const startFormatted = formatTime(start);
  const endTimeOnly = end.toLocaleString('th-TH', {
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
  
  return `${startFormatted} - ${endTimeOnly}`;
};

// Test results
console.log('📅 Time Range Test:');
console.log('Input:', testBooking.startTime, 'Duration:', testBooking.duration, 'minutes');
console.log('Output:', formatTimeRange(testBooking.startTime, testBooking.duration));
console.log('Expected: "26 ก.ค. 13:00 - 14:30"');

// Test service lookup
console.log('\n🔍 Service Lookup Test:');
const foundService = testServices.find(s => s.id === testBooking.serviceId);
console.log('Found Service:', foundService?.name);
console.log('Price for 90 min:', foundService?.priceByDuration?.[90]);
