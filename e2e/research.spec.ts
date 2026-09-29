import { test, expect } from '@playwright/test';
test('researcher completes a persistent planning journey', async ({
  page
}) => {
  await page.goto('/login');
  await page.getByRole('button', {
    name: 'Create an account',
    exact: true
  }).click();
  await page.getByLabel('Email address').fill(`researcher-${Date.now()}@example.test`);
  await page.getByLabel('Password', {
    exact: true
  }).fill('research-password-123');
  await page.getByRole('button', {
    name: 'Create account →',
    exact: true
  }).click();
  await page.getByLabel('Your name').fill('Taylor');
  await page.getByLabel('Research field').fill('Education');
  await page.getByRole('button', {
    name: 'Enter your workspace'
  }).click();
  await expect(page.getByRole('heading', {
    name: 'Welcome back, Taylor.'
  })).toBeVisible();
  await page.getByRole('button', {
    name: 'New project',
    exact: true
  }).click();
  await page.getByLabel('Working title').fill('Student trust in AI');
  await page.getByRole('button', {
    name: 'Create project →'
  }).click();
  await page.getByLabel('Research topic', {
    exact: true
  }).fill('AI trust');
  await page.getByLabel('Problem statement').fill('How students develop trust remains unclear in this context.');
  await page.getByLabel('Proposed research gap').fill('Evidence of local experiences needs systematic comparison.');
  await expect(page.getByRole('status')).toContainText('All changes saved');
  await page.getByRole('button', {
    name: 'Questions & objectives',
    exact: true
  }).click();
  await page.getByRole('button', {
    name: 'Add question',
    exact: true
  }).click();
  await page.getByLabel('Research question 1', {
    exact: true
  }).fill('How do students describe trust in AI?');
  await page.getByRole('button', {
    name: 'Add objective',
    exact: true
  }).click();
  await page.getByLabel('Objective 1', {
    exact: true
  }).fill('Explore student descriptions of trust.');
  await expect(page.getByRole('status')).toContainText('All changes saved');
  await page.getByRole('button', {
    name: 'Literature matrix',
    exact: true
  }).click();
  await page.getByRole('button', {
    name: 'Add paper',
    exact: true
  }).click();
  await page.getByLabel('Paper title').fill('Illustrative source for workflow testing');
  await page.getByLabel('Key findings').fill('A test finding, not a real citation.');
  await page.getByLabel('Limitations', {
    exact: true
  }).fill('Synthetic test record.');
  await page.getByRole('button', {
    name: 'Save literature record'
  }).click();
  await expect(page.getByText('Unverified', {
    exact: true
  })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('All changes saved');
  await page.reload();
  await page.getByRole('button', {
    name: 'Questions & objectives',
    exact: true
  }).click();
  await expect(page.getByLabel('Research question 1', {
    exact: true
  })).toHaveValue('How do students describe trust in AI?');
  await page.getByRole('button', {
    name: 'Health Check',
    exact: false
  }).click();
  await expect(page.getByRole('heading', {
    name: 'Choose and justify a study design'
  })).toBeVisible();
  await page.getByRole('button', {
    name: 'Idea Lab',
    exact: true
  }).click();
  await page.getByRole('button', {
    name: 'Get planning suggestions'
  }).click();
  await expect(page.getByText('OFFLINE PLANNING AID', {
    exact: true
  })).toBeVisible();
  const id = page.url().split('/').pop()!;
  const data = await (await page.request.get(`/api/projects/${id}`)).json();
  const conflict = await page.request.put(`/api/projects/${id}`, {
    headers: {
      Origin: 'http://localhost:3000'
    },
    data: {
      revision: 1,
      document: {
        ...data.project.document,
        topic: 'stale'
      }
    }
  });
  expect(conflict.status()).toBe(409);
  const crossOrigin = await page.request.put(`/api/projects/${id}`, {
    headers: {
      Origin: 'https://attacker.example'
    },
    data: {
      revision: data.project.revision,
      document: data.project.document
    }
  });
  expect(crossOrigin.status()).toBe(403);
  const exported = await page.request.get(`/api/projects/${id}/export`);
  expect(exported.status()).toBe(200);
  expect((await exported.json()).versions.length).toBeGreaterThan(2);
  await page.getByRole('button', {
    name: 'Version history',
    exact: true
  }).click();
  await expect(page.getByText('Project created', {
    exact: true
  })).toBeVisible();
});
test('unauthenticated API access is rejected', async ({
  request
}) => {
  expect((await request.get('/api/projects')).status()).toBe(401);
});
