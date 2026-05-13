import { describe, it, expect, vi } from 'vitest'
import {
    NAV_ITEMS,
    createActionItems,
    createCommandItems,
} from '@/lib/command-palette-items'

describe('command-palette-items — NAV_ITEMS', () => {
    it('contains all App_Shell sections (Req 6.2, 7.3)', () => {
        const hrefs = NAV_ITEMS.map((i) => i.href)
        // Dashboard = '/', плюс все маршруты App_Shell из tasks.md:
        // Questions, Tasks, Trainer, Mock, Profile, Status.
        expect(hrefs).toEqual([
            '/',
            '/questions',
            '/tasks',
            '/trainer',
            '/mock',
            '/profile',
            '/status',
        ])
    })

    it('every nav item has group="nav", href and no run', () => {
        for (const item of NAV_ITEMS) {
            expect(item.group).toBe('nav')
            expect(typeof item.href).toBe('string')
            expect(item.run).toBeUndefined()
        }
    })

    it('ids are unique and stable', () => {
        const ids = NAV_ITEMS.map((i) => i.id)
        expect(new Set(ids).size).toBe(ids.length)
        expect(ids.every((id) => id.startsWith('nav.'))).toBe(true)
    })

    it('every item has a non-empty, human-readable title', () => {
        for (const item of NAV_ITEMS) {
            expect(item.title.length).toBeGreaterThan(0)
        }
    })
})

describe('command-palette-items — createActionItems', () => {
    const makeDeps = () => ({
        router: { push: vi.fn() },
        signOut: vi.fn(),
    })

    it('produces the three actions required by Req 7.3', () => {
        const actions = createActionItems(makeDeps())
        expect(actions.map((a) => a.id)).toEqual([
            'action.create-mock',
            'action.start-training',
            'action.sign-out',
        ])
        for (const a of actions) {
            expect(a.group).toBe('action')
            expect(typeof a.run).toBe('function')
        }
    })

    it('"create mock" navigates to /mock/create', () => {
        const deps = makeDeps()
        const actions = createActionItems(deps)
        const create = actions.find((a) => a.id === 'action.create-mock')!
        create.run!()
        expect(deps.router.push).toHaveBeenCalledWith('/mock/create')
        expect(deps.signOut).not.toHaveBeenCalled()
    })

    it('"start training" navigates to /trainer', () => {
        const deps = makeDeps()
        const actions = createActionItems(deps)
        const train = actions.find((a) => a.id === 'action.start-training')!
        train.run!()
        expect(deps.router.push).toHaveBeenCalledWith('/trainer')
        expect(deps.signOut).not.toHaveBeenCalled()
    })

    it('"sign out" calls signOut and not router.push', () => {
        const deps = makeDeps()
        const actions = createActionItems(deps)
        const out = actions.find((a) => a.id === 'action.sign-out')!
        out.run!()
        expect(deps.signOut).toHaveBeenCalledTimes(1)
        expect(deps.router.push).not.toHaveBeenCalled()
    })

    it('returns a fresh array per call (no shared mutable state)', () => {
        const deps = makeDeps()
        const a = createActionItems(deps)
        const b = createActionItems(deps)
        expect(a).not.toBe(b)
        expect(a.length).toBe(b.length)
    })
})

describe('command-palette-items — createCommandItems', () => {
    const makeDeps = () => ({
        router: { push: vi.fn() },
        signOut: vi.fn(),
    })

    it('concatenates nav items followed by action items', () => {
        const items = createCommandItems(makeDeps())
        expect(items.slice(0, NAV_ITEMS.length).map((i) => i.id)).toEqual(
            NAV_ITEMS.map((i) => i.id)
        )
        const actionIds = items
            .slice(NAV_ITEMS.length)
            .map((i) => i.id)
        expect(actionIds).toEqual([
            'action.create-mock',
            'action.start-training',
            'action.sign-out',
        ])
    })

    it('all ids across nav + action are unique', () => {
        const items = createCommandItems(makeDeps())
        const ids = items.map((i) => i.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('exposes exactly two groups: "nav" and "action" (Req 7.3)', () => {
        const items = createCommandItems(makeDeps())
        const groups = new Set(items.map((i) => i.group))
        expect(groups).toEqual(new Set(['nav', 'action']))
    })
})
