import { addService } from './firestore';

export const initializeSampleServices = async () => {
  const sampleServices = [
    {
      name: 'นวดไทยประยุกต์',
      category: 'นวดไทย',
      priceByDuration: {
        60: 300,
        90: 450,
        120: 600
      }
    },
    {
      name: 'นวดน้ำมันอโรม่า',
      category: 'อโรม่า',
      priceByDuration: {
        60: 400,
        90: 600,
        120: 800
      }
    },
    {
      name: 'นวดกดจุด (ริดเส้น)',
      category: 'กดจุด',
      priceByDuration: {
        30: 200,
        60: 350,
        90: 525
      }
    },
    {
      name: 'นวดฝ่าเท้า',
      category: 'ฝ่าเท้า',
      priceByDuration: {
        30: 250,
        45: 350
      }
    }
  ];

  try {
    for (const service of sampleServices) {
      await addService(service);
    }
    console.log('Sample services initialized successfully');
  } catch (error) {
    console.error('Error initializing sample services:', error);
  }
};
