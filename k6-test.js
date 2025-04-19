import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '20s', target: 10 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'], // 95% of requests should be < 800ms
    http_req_failed: ['rate<0.01'],   // error rate < 1%
  },
};

// sample emails 
const emailSamples = [
  {
    subject: "⚠️ Action required: Account Suspended",
    content: "We noticed unusual activity. Click here to verify your identity: http://sus-site.com/login"
  },
  {
    subject: "Your receipt from Amazon",
    content: "Thanks for your purchase of the latest iPhone 16 Pro Max!"
  },
  {
    subject: "Password expired",
    content: "Your password has expired. Your account will be suspended. Reset Now!"
  },
  {
    subject: "⚠️ Your package was not delivered",
    content: "We couldn’t deliver your item. Reschedule here: http://some-shipping.com"
  },
  {
    subject: "Google security alert",
    content: "New sign-in from Chrome on Mac."
  }
];

export default function () {
  // random message selection
  const email = emailSamples[Math.floor(Math.random() * emailSamples.length)];

  const payload = JSON.stringify({
    subject: email.subject,
    content: email.content
  });

  const headers = {
    'Content-Type': 'application/json',
  };

  const res = http.post('https://phishnet-6beu.onrender.com/analyze', payload, { headers });

  check(res, {
    'is status 200': (r) => r.status === 200,
    'has result': (r) => r.body.includes("result"),
  });

  sleep(Math.random() * 2); // delay
}
