// __mocks__/chrome.js
global.chrome = {
    identity: {
      getAuthToken: jest.fn(),
    },
    tabs: {
      create: jest.fn(),
    },
    runtime: {
      getURL: jest.fn((path) => `chrome-extension://fake-id/${path}`),
      lastError: null,
    }
  };  