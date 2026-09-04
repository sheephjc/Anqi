import { expect, test } from '@playwright/test'

test('home and online lobby support a real two-player synchronized room', async ({ page, browser }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: /本地对战/ })).toBeVisible()
  await page.getByRole('link', { name: /联机对战/ }).click()
  await page.getByRole('textbox', { name: '你的昵称' }).fill('房主甲')
  await page.getByRole('button', { name: '创建房间' }).click()
  await expect(page.getByRole('heading', { name: '等待另一位玩家加入' })).toBeVisible()
  const roomCode = (await page.locator('.room-code-display strong').textContent())!.trim()
  expect(roomCode).toMatch(/^[1-9]\d{3}$/)

  const guestContext = await browser.newContext()
  const guest = await guestContext.newPage()
  await guest.goto('http://127.0.0.1:4173/online')
  await guest.getByRole('textbox', { name: '你的昵称' }).fill('客人乙')
  await guest.getByRole('textbox', { name: '四位房间号' }).fill(roomCode)
  await guest.getByRole('button', { name: '加入房间' }).click()

  await expect(page.getByTestId('xiangqi-board')).toBeVisible()
  await expect(guest.getByTestId('xiangqi-board')).toBeVisible()
  await expect(page.getByText(/房主甲 · (红方|黑方) · 房主/)).toBeVisible()
  await expect(guest.getByText(/客人乙 · (红方|黑方)/)).toBeVisible()
  await expect(page.getByText(/轮到你行棋|等待对方行棋/).first()).toBeVisible({ timeout: 4000 })

  const hostCamp = await page.locator('.match-card small').textContent()
  const redPage = hostCamp?.includes('红') ? page : guest
  const blackPage = hostCamp?.includes('黑') ? page : guest
  const blackGeneral = await blackPage.getByRole('button', { name: '黑方將' }).boundingBox()
  const redGeneral = await blackPage.getByRole('button', { name: '红方帥' }).boundingBox()
  expect(blackGeneral!.y).toBeGreaterThan(redGeneral!.y)

  await redPage.getByRole('button', { name: '暗棋，1路第10行' }).click()
  await redPage.locator('[data-cell="0,8"]').click()
  await expect(page.locator('.piece.is-hidden')).toHaveCount(29)
  await expect(guest.locator('.piece.is-hidden')).toHaveCount(29)
  await guest.reload()
  await expect(guest.locator('.piece.is-hidden')).toHaveCount(29, { timeout: 5000 })
  await expect(guest.getByRole('button', { name: '提示落点' })).toBeVisible()
  await guestContext.close()
})

test('plays a reveal and exposes only the moved identity', async ({ page }) => {
  await page.goto('/local?seed=42')
  await expect(page).toHaveTitle('暗棋')
  await expect(page.getByRole('heading', { name: '暗棋', exact: true })).toBeVisible()
  expect(await page.evaluate(() => getComputedStyle(document.body).userSelect)).toBe('none')
  await expect(page.locator('.piece.is-hidden')).toHaveCount(30)
  await expect(page.locator('.piece.is-revealed')).toHaveCount(2)
  await expect(page.getByRole('button', { name: '新的一局' })).toBeVisible()
  await expect(page.getByRole('button', { name: /悔棋/ })).toHaveCount(0)

  await page.getByRole('button', { name: '暗棋，1路第10行' }).click()
  await expect(page.locator('[data-cell="0,8"] .move-hint')).toBeVisible()
  const hintToggle = page.getByRole('button', { name: '提示落点' })
  await expect(hintToggle).toHaveAttribute('aria-pressed', 'true')
  await hintToggle.click()
  await expect(hintToggle).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.move-hint')).toHaveCount(0)
  await page.locator('[data-cell="0,8"]').click()

  await expect(page.locator('.piece.is-hidden')).toHaveCount(29)
  await expect(page.locator('.piece.is-revealed')).toHaveCount(3)
  await expect(page.getByText('黑方行棋').first()).toBeVisible()
  await hintToggle.click()
  await expect(hintToggle).toHaveAttribute('aria-pressed', 'true')
})

test('double-clicking the selected piece clears the selection', async ({ page }) => {
  await page.goto('/local?seed=42')
  const piece = page.getByRole('button', { name: '暗棋，1路第10行' })
  await piece.click()
  await expect(piece).toHaveClass(/is-selected/)
  await piece.dblclick()
  await expect(piece).not.toHaveClass(/is-selected/)
  await expect(page.getByText('红方行棋').first()).toBeVisible()
})

test('reveals a captured dark piece and flies it into the capture tray', async ({ page }) => {
  await page.goto('/local?seed=42')
  await page.getByRole('button', { name: '暗棋，1路第10行' }).click()
  await page.locator('[data-cell="1,9"]').click()

  const flight = page.getByTestId('capture-reveal-animation')
  await expect(flight).toBeVisible()
  expect(Number(await flight.evaluate((element) => getComputedStyle(element).zIndex))).toBeLessThan(
    Number(await page.locator('.piece').first().evaluate((element) => getComputedStyle(element).zIndex)),
  )
  await expect(flight.locator('.capture-reveal-front.captured-token')).toHaveCount(1)
  await expect(flight.locator('.capture-reveal-front i')).toHaveText('暗')
  await expect(page.locator('.captured-token.is-pending')).toHaveCount(1)
  await expect(flight).toHaveCount(0, { timeout: 3000 })
  await expect(page.locator('.captured-token.is-pending')).toHaveCount(0)
  await expect(page.getByRole('region', { name: '红方吃子' }).locator('.captured-token')).toHaveCount(1)
})

test('rules and responsive board remain usable', async ({ page }, testInfo) => {
  await page.goto('/local?seed=9')
  await page.getByRole('button', { name: '玩法' }).click()
  await expect(page.getByRole('dialog', { name: '暗棋规则' })).toBeVisible()
  await page.getByRole('button', { name: '明白了' }).click()
  await expect(page.getByRole('dialog', { name: '暗棋规则' })).toBeHidden()

  const board = page.getByTestId('xiangqi-board')
  await expect(board).toBeVisible()
  await expect(page.locator('.board-compass')).toHaveCount(0)
  await expect(page.locator('footer')).toHaveCount(0)
  await expect(page.locator('.sidebar-info-stack .info-card')).toHaveCount(3)
  const box = await board.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth))
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  if (testInfo.project.name === 'desktop-chromium') {
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true)
  }
})

test('renders the capture, check and checkmate calligraphy effects', async ({ page }) => {
  await page.goto('/local?seed=42&effect=capture')
  await expect(page.getByRole('status')).toHaveText('吃')
  await page.goto('/local?seed=42&effect=check')
  await expect(page.getByRole('status')).toHaveText('将')
  await page.goto('/local?seed=42&effect=checkmate')
  await expect(page.getByRole('status')).toHaveText('绝杀')
})
