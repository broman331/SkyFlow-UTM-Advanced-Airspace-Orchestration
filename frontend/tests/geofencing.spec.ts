import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(import.meta.dirname, '../../.env') });

test.describe('Geofencing and Flight Intent Flow', () => {

    test.beforeEach(async ({ page }) => {
        // Go to local frontend
        await page.goto('/', { waitUntil: 'domcontentloaded' });
    });

    test('ADMIN should be able to create a Temporary Flight Restriction (TFR)', async ({ request, page }) => {
        const adminEmail = `admin_geo_${Date.now()}@utm.test`;

        // Seed Admin
        await request.post('http://127.0.0.1:3000/api/auth/register', {
            data: { email: adminEmail, password: 'pass' }
        });
        const { Pool } = await import('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        await pool.query(`UPDATE users SET role = 'ADMIN' WHERE email = $1`, [adminEmail]);
        await pool.end();

        // Login
        await page.locator('input[placeholder="Email Address"]').fill(adminEmail);
        await page.locator('input[placeholder="Password"]').fill('pass');
        await page.locator('button', { hasText: 'Login' }).click();

        // Verify Admin Panel
        await expect(page.locator('h3', { hasText: /Admin Panel/ })).toBeVisible();

        // Wait for map to load (check if the token missing overlay is NOT visible)
        await expect(page.locator('text=Mapbox Token Missing')).not.toBeVisible({ timeout: 10000 });

        // Select the Polygon Tool - try multiple selectors as Mapbox Draw can be flaky in tests
        const polygonTool = page.locator('.mapbox-gl-draw_polygon, .mapbox-gl-draw_ctrl-draw-btn.mapbox-gl-draw_polygon');
        await expect(polygonTool).toBeVisible({ timeout: 10000 });
        await polygonTool.click();

        // Draw a polygon on the map canvas
        const map = page.locator('.mapboxgl-canvas');
        await map.click({ position: { x: 400, y: 300 }, delay: 200 });
        await map.click({ position: { x: 450, y: 300 }, delay: 200 });
        await map.click({ position: { x: 425, y: 350 }, delay: 200 });
        await map.click({ position: { x: 400, y: 300 }, delay: 200 }); // Close polygon
        await page.keyboard.press('Enter', { delay: 100 });

        // Double check using a double click fallback to close if needed
        await map.dblclick({ position: { x: 400, y: 300 }, delay: 200 });

        // Wait a small amount for state update
        await page.waitForTimeout(500);

        // The Publish button should now be enabled
        const publishBtn = page.locator('button', { hasText: 'Publish TFR Polygon' });
        await expect(publishBtn).toBeEnabled({ timeout: 10000 });

        await publishBtn.click();

        // Check for success message
        await expect(page.locator('text=TFR Published Successfully!')).toBeVisible();
    });

    test('PILOT should be able to plan a flight route and see conflicts', async ({ request, page }) => {
        const pilotEmail = `pilot_geo_${Date.now()}@utm.test`;

        // Register/Login Pilot
        await page.locator('span', { hasText: /Need an account\?/ }).click();
        await page.locator('input[placeholder="Email Address"]').fill(pilotEmail);
        await page.locator('input[placeholder="Password"]').fill('pass');
        await page.locator('button', { hasText: 'Register' }).click();

        // Wait for map to load (check if the token missing overlay is NOT visible)
        await expect(page.locator('text=Mapbox Token Missing')).not.toBeVisible({ timeout: 10000 });

        // Select the Line Tool
        const lineTool = page.locator('.mapbox-gl-draw_line, .mapbox-gl-draw_ctrl-draw-btn.mapbox-gl-draw_line');
        await expect(lineTool).toBeVisible({ timeout: 10000 });
        await lineTool.click();

        // Draw a route (LineString) on the map canvas
        const map = page.locator('.mapboxgl-canvas');
        await expect(lineTool).toBeVisible({ timeout: 10000 }); // Re-assert visibility
        await lineTool.click(); // Explicitly click again before drawing

        // Draw a route (LineString) on the map canvas
        // The map variable is already defined above, so we don't redefine it.
        await map.click({ position: { x: 600, y: 300 }, delay: 200 });
        await map.click({ position: { x: 650, y: 300 }, delay: 200 });
        await map.click({ position: { x: 700, y: 350 }, delay: 200 });

        // Finish line string
        await page.keyboard.press('Enter', { delay: 100 });
        await map.dblclick({ position: { x: 700, y: 350 }, delay: 200 });

        await page.waitForTimeout(1000);

        // Verify Flight Planner acknowledges the route
        await expect(page.locator('text=Route Drawn. Ready to evaluate.')).toBeVisible({ timeout: 10000 });

        // SCENARIO 1: Intercept API to return 403 Conflict
        await page.route('**/api/flight-intent', async (route) => {
            if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 403,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Conflict detected', conflictingZone: 'Mock_TFR_Zone' })
                });
            } else {
                await route.continue();
            }
        });

        // Submit Intent
        const submitBtn = page.locator('button', { hasText: 'Submit Flight Intent' });
        await submitBtn.click();

        // Verify Error
        await expect(page.locator('text=Flight Rejected! Conflict with: Mock_TFR_Zone')).toBeVisible();

        // SCENARIO 2: Intercept API to return 200 Authorized
        await page.unroute('**/api/flight-intent'); // remove previous route
        await page.route('**/api/flight-intent', async (route) => {
            if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ authorized: true, message: 'Clear to fly' })
                });
            } else {
                await route.continue();
            }
        });

        // Submit Intent again
        await submitBtn.click();

        // Verify Success
        await expect(page.locator('text=Flight Authorized! You are cleared to fly.')).toBeVisible();
    });
});
