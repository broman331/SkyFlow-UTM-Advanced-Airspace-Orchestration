import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Runs cleanup after each test case (e.g., clearing JSDOM)
afterEach(() => {
    cleanup();
});
