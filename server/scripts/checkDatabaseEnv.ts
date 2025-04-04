import '../loadEnv'; // Load environment variables

function checkDatabaseEnv() {
  console.log('Checking database environment variables...');
  
  const envVars = {
    DATABASE_URL: process.env.DATABASE_URL ? '✅ Set' : '❌ Not set',
    PGHOST: process.env.PGHOST ? '✅ Set' : '❌ Not set',
    PGPORT: process.env.PGPORT ? '✅ Set' : '❌ Not set',
    PGUSER: process.env.PGUSER ? '✅ Set' : '❌ Not set',
    PGPASSWORD: process.env.PGPASSWORD ? '✅ Set' : '❌ Not set',
    PGDATABASE: process.env.PGDATABASE ? '✅ Set' : '❌ Not set',
    NODE_ENV: process.env.NODE_ENV || 'development',
    USE_POSTGRES: process.env.USE_POSTGRES || 'false'
  };
  
  console.log('Environment variables status:');
  Object.entries(envVars).forEach(([key, value]) => {
    console.log(`- ${key}: ${value}`);
  });
  
  // Show non-sensitive details about DATABASE_URL if it exists
  if (process.env.DATABASE_URL) {
    const safeUrl = process.env.DATABASE_URL.replace(/:[^:@]*@/, ':****@');
    console.log(`\nDATABASE_URL components (password hidden):`);
    console.log(`URL: ${safeUrl}`);
    
    try {
      // Extract host and port from DATABASE_URL
      const match = process.env.DATABASE_URL.match(/postgres:\/\/[^:]+(?::[^@]+)?@([^:]+):(\d+)\/(.+)/);
      if (match) {
        console.log(`- Host: ${match[1]}`);
        console.log(`- Port: ${match[2]}`);
        console.log(`- Database: ${match[3].split('?')[0]}`);
      }
    } catch (error) {
      console.error('Error parsing DATABASE_URL:', error);
    }
  }
  
  // Suggest fixes
  if (!process.env.DATABASE_URL) {
    console.log('\n⚠️ Missing DATABASE_URL. Make sure to set it in your production environment.');
    console.log('Example: DATABASE_URL=postgres://username:password@hostname:5432/database_name');
  }
  
  if (process.env.NODE_ENV === 'production' && process.env.USE_POSTGRES !== 'true') {
    console.log('\n⚠️ USE_POSTGRES should be set to "true" in production environment');
  }
}

checkDatabaseEnv();