// Debug script to check services data in Firebase
import { getServices } from './src/lib/firestore.js';

const debugServices = async () => {
  try {
    console.log('🔍 Fetching services from Firebase...');
    const services = await getServices();
    
    console.log('📊 Services count:', services.length);
    
    services.forEach((service, index) => {
      console.log(`\n🔸 Service ${index + 1}:`);
      console.log('  ID:', service.id);
      console.log('  Name:', service.name);
      console.log('  Category:', service.category);
      console.log('  PriceByDuration:', service.priceByDuration);
      
      if (service.priceByDuration) {
        Object.entries(service.priceByDuration).forEach(([duration, price]) => {
          console.log(`    ${duration} นาที: ฿${price.toLocaleString()}`);
        });
      } else {
        console.log('  ⚠️ No priceByDuration found!');
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching services:', error);
  }
};

debugServices();
