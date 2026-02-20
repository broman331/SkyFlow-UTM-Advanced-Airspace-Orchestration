import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(import.meta.dirname, '../../.env') });

test.describe('Unified Authentication Flow', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log('BROWSER:', msg.text()));
        page.on('request', req => console.log('REQ:', req.url()));
        page.on('requestfailed', req => console.log('FAILED REQ:', req.url(), req.failure()?.errorText));

        // Go to local frontend
        await page.goto('/', { waitUntil: 'domcontentloaded' });
    });

    test('Users should be able to toggle the registration form, input credentials, and successfully create an account', async ({ page }) => {
        const uniqueEmail = `e2e_${Date.now()}@utm.test`;

        // Check default login - wait for it to be ready
        const loginHeader = page.locator('h2', { hasText: 'UTM Login' });
        await expect(loginHeader).toBeVisible({ timeout: 15000 });

        // Toggle to register
        const toggleBtn = page.locator('span', { hasText: /Need an account\?/ });
        await toggleBtn.click();
        await expect(page.locator('h2', { hasText: 'Pilot Registration' })).toBeVisible();

        // Fill form
        await page.locator('input[placeholder="Email Address"]').fill(uniqueEmail);
        await page.locator('input[placeholder="Password"]').fill('securepass');

        // Submit Registration
        await page.locator('button', { hasText: /^Register$/ }).click();

        // Expect Modal to disappear as Registration API logs user in and unmounts AuthModal
        await expect(page.locator('h2', { hasText: 'Pilot Registration' })).toBeHidden({ timeout: 15000 });

        // Logout should now be visible in main app
        await expect(page.locator('button', { hasText: 'Logout' })).toBeVisible({ timeout: 15000 });
    });

    test('An authenticated ADMIN user logging in should see the Admin Panel appear in the sidebar', async ({ request, page }) => {
        // First we register an admin directly to the test DB via Backend route simulation (seed)
        const adminEmail = `admin_${Date.now()}@utm.test`;
        const resp = await request.post('http://127.0.0.1:3000/api/auth/register', {
            data: { email: adminEmail, password: 'pass' }
        });
        expect(resp.ok()).toBeTruthy(); // Verify the creation actually succeeds

        // Elevated to ADMIN via quick Postgres script
        const { Pool } = await import('pg');
        console.log('E2E TEST DB URL IS:', process.env.DATABASE_URL);
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const updateRes = await pool.query(`UPDATE users SET role = 'ADMIN' WHERE email = $1 RETURNING *`, [adminEmail]);
        console.log('UPDATE ROW COUNT:', updateRes.rowCount, updateRes.rows);
        await pool.end();

        // Now we login UI - since we are already on the page from beforeEach, just fill it
        await page.locator('input[placeholder="Email Address"]').fill(adminEmail);
        await page.locator('input[placeholder="Password"]').fill('pass');

        // Monitor login response
        const loginResponsePromise = page.waitForResponse(response =>
            response.url().includes('/api/auth/login') && response.status() === 200
        );

        await page.locator('button', { hasText: 'Login' }).click();

        const loginResponse = await loginResponsePromise;
        const loginData = await loginResponse.json();
        console.log('LOGIN DATA:', loginData);

        // We should see the protected admin panel
        await expect(page.locator('h3', { hasText: /Admin Panel/ })).toBeVisible();
    });

    test('An authenticated PILOT user should NOT see the Admin Panel', async ({ page }) => {
        const pilotEmail = `pilot_${Date.now()}@utm.test`;

        // Register -> Auto Logs In
        await page.locator('span', { hasText: /Need an account\?/ }).click();
        await page.locator('input[placeholder="Email Address"]').fill(pilotEmail);
        await page.locator('input[placeholder="Password"]').fill('pass');
        await page.locator('button', { hasText: 'Register' }).click();

        // Ensure logged in
        await expect(page.locator('button', { hasText: 'Logout' })).toBeVisible();

        // The Pilot role should strictly NOT render Administrative panels
        await expect(page.locator('h3', { hasText: /Admin Panel/ })).toBeHidden();
    });
});
