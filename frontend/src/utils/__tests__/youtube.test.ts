import { 
  extractVideoId, 
  isValidVideoId, 
  isValidYouTubeURL, 
  normalizeYouTubeURL,
  extractTimestamp,
  TEST_YOUTUBE_URLS 
} from '../youtube';

// Test extractVideoId function
describe('extractVideoId', () => {
  test('extracts video ID from standard YouTube URLs', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  test('extracts video ID from short YouTube URLs', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  test('extracts video ID from mobile YouTube URLs', () => {
    expect(extractVideoId('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  test('extracts video ID from embed URLs', () => {
    expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  test('extracts video ID from YouTube Shorts URLs', () => {
    expect(extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractVideoId('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  test('extracts video ID from URLs with additional parameters', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ?t=42')).toBe('dQw4w9WgXcQ');
    expect(extractVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmRdnEQy4G3I2R-NK8Pdt1H_-rTUh')).toBe('dQw4w9WgXcQ');
  });

  test('returns null for invalid URLs', () => {
    expect(extractVideoId('https://vimeo.com/123456789')).toBeNull();
    expect(extractVideoId('https://www.youtube.com/watch')).toBeNull();
    expect(extractVideoId('not-a-url')).toBeNull();
    expect(extractVideoId('')).toBeNull();
  });
});

// Test isValidVideoId function
describe('isValidVideoId', () => {
  test('validates correct video IDs', () => {
    expect(isValidVideoId('dQw4w9WgXcQ')).toBe(true);
    expect(isValidVideoId('BKm45Az02YE')).toBe(true);
    expect(isValidVideoId('jNQXAC9IVRw')).toBe(true);
  });

  test('rejects invalid video IDs', () => {
    expect(isValidVideoId('invalid')).toBe(false); // too short
    expect(isValidVideoId('toolongvideoid')).toBe(false); // too long
    expect(isValidVideoId('dQw4w9WgXc@')).toBe(false); // invalid character
    expect(isValidVideoId('')).toBe(false);
  });
});

// Test isValidYouTubeURL function
describe('isValidYouTubeURL', () => {
  test('validates all valid YouTube URL formats', () => {
    TEST_YOUTUBE_URLS.valid.forEach(url => {
      expect(isValidYouTubeURL(url)).toBe(true);
    });
  });

  test('rejects invalid YouTube URLs', () => {
    TEST_YOUTUBE_URLS.invalid.forEach(url => {
      expect(isValidYouTubeURL(url)).toBe(false);
    });
  });
});

// Test normalizeYouTubeURL function
describe('normalizeYouTubeURL', () => {
  test('normalizes various URL formats to standard format', () => {
    const expected = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    
    expect(normalizeYouTubeURL('https://youtu.be/dQw4w9WgXcQ')).toBe(expected);
    expect(normalizeYouTubeURL('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(expected);
    expect(normalizeYouTubeURL('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(expected);
    expect(normalizeYouTubeURL('https://youtu.be/dQw4w9WgXcQ?t=42')).toBe(expected);
  });

  test('returns original URL for invalid YouTube URLs', () => {
    const invalidUrl = 'https://vimeo.com/123456789';
    expect(normalizeYouTubeURL(invalidUrl)).toBe(invalidUrl);
  });
});

// Test extractTimestamp function
describe('extractTimestamp', () => {
  test('extracts timestamp from URLs with t parameter', () => {
    expect(extractTimestamp('https://youtu.be/dQw4w9WgXcQ?t=42')).toBe(42);
    expect(extractTimestamp('https://youtu.be/dQw4w9WgXcQ?t=1m30s')).toBe(90);
    expect(extractTimestamp('https://youtu.be/dQw4w9WgXcQ?t=2m')).toBe(120);
  });

  test('returns null for URLs without timestamp', () => {
    expect(extractTimestamp('https://youtu.be/dQw4w9WgXcQ')).toBeNull();
    expect(extractTimestamp('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });
});

// Console test for manual verification
if (typeof window === 'undefined') {
  console.log('YouTube URL Validation Tests');
  console.log('============================');
  
  console.log('\nValid URLs:');
  TEST_YOUTUBE_URLS.valid.forEach(url => {
    const videoId = extractVideoId(url);
    const isValid = isValidYouTubeURL(url);
    console.log(`${isValid ? '✅' : '❌'} ${url} → ${videoId}`);
  });
  
  console.log('\nInvalid URLs:');
  TEST_YOUTUBE_URLS.invalid.forEach(url => {
    const videoId = extractVideoId(url);
    const isValid = isValidYouTubeURL(url);
    console.log(`${!isValid ? '✅' : '❌'} ${url} → ${videoId || 'null'}`);
  });
}