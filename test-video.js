// Test script to debug video streaming issues
const axios = require('axios');

async function testVideo(fileId) {
  const baseUrl = 'http://localhost:8000';

  console.log(`🧪 Testing video: ${fileId}`);
  console.log(`📺 Original URL: https://drive.google.com/uc?export=download&id=${fileId}`);

  try {
    // Test direct Google Drive access first
    console.log(`\n🌐 Testing direct Google Drive access`);
    const directResponse = await axios({
      method: 'HEAD',
      url: `https://drive.google.com/uc?export=download&id=${fileId}`,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    console.log('✅ Direct Google Drive access working');
    console.log(`📊 Content-Type: ${directResponse.headers['content-type']}`);
    console.log(`📊 Content-Length: ${directResponse.headers['content-length']}`);
    console.log(`📊 All headers:`, directResponse.headers);

    const contentType = directResponse.headers['content-type'];
    const supportedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/mkv'];

    if (contentType && !supportedTypes.some(type => contentType.includes(type.split('/')[1]))) {
      console.warn(`⚠️ WARNING: Content type "${contentType}" may not be supported by browsers`);
    }

  } catch (error) {
    console.error('❌ Direct Google Drive access failed:', error.message);
    console.error('Status:', error.response?.status);
    console.error('Response headers:', error.response?.headers);
  }

  try {
    // Test the video proxy endpoint
    console.log(`\n🔗 Testing proxy endpoint: ${baseUrl}/api/video/${fileId}`);
    const response = await axios({
      method: 'HEAD',
      url: `${baseUrl}/api/video/${fileId}`,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    console.log('✅ Proxy endpoint working');
    console.log(`📊 Content-Type: ${response.headers['content-type']}`);
    console.log(`📊 Content-Length: ${response.headers['content-length']}`);
    console.log(`📊 All headers:`, response.headers);

  } catch (error) {
    console.error('❌ Proxy endpoint failed:', error.message);
    console.error('Status:', error.response?.status);
    console.error('Response:', error.response?.data);
    console.error('Response headers:', error.response?.headers);
  }

  try {
    // Test the stream endpoint
    console.log(`\n📺 Testing stream endpoint: ${baseUrl}/api/stream/${fileId}`);
    const response = await axios({
      method: 'HEAD',
      url: `${baseUrl}/api/stream/${fileId}`,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    console.log('✅ Stream endpoint working');
    console.log(`📊 Content-Type: ${response.headers['content-type']}`);
    console.log(`📊 Content-Length: ${response.headers['content-length']}`);
    console.log(`📊 All headers:`, response.headers);

  } catch (error) {
    console.error('❌ Stream endpoint failed:', error.message);
    console.error('Status:', error.response?.status);
    console.error('Response:', error.response?.data);
    console.error('Response headers:', error.response?.headers);
  }

  try {
    // Test the test endpoint
    console.log(`\n🧪 Testing test endpoint: ${baseUrl}/api/test-video/${fileId}`);
    const response = await axios({
      method: 'GET',
      url: `${baseUrl}/api/test-video/${fileId}`,
      timeout: 10000,
    });

    console.log('✅ Test endpoint working');
    console.log(`📊 Test result:`, response.data);

  } catch (error) {
    console.error('❌ Test endpoint failed:', error.message);
    console.error('Status:', error.response?.status);
    console.error('Response:', error.response?.data);
  }
}

// Test with the file ID from your logs
const fileId = '10sbUXO_24FBnfGOoTwzMvMmcmN1y2jy1';
testVideo(fileId).then(() => {
  console.log('\n🎯 Test completed!');
}).catch(console.error);
