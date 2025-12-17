/**
 * Day 1 实现：React 模块入口
 * 
 * Day 5 会实现具体的 React hooks
 * Day 1 只做占位定义
 */

import type { Atom, WritableAtom } from './vanilla/atom'

/**
 * Provider - Context Provider（Day 5 实现）
 */
export function Provider({ children }: { children: React.ReactNode }) {
  // TODO: Day 5 实现
  throw new Error('Provider will be implemented in Day 5')
}

/**
 * useStore - 获取当前的 store（Day 5 实现）
 */
export function useStore() {
  // TODO: Day 5 实现
  throw new Error('useStore will be implemented in Day 5')
}

/**
 * useAtomValue - 读取 atom 的值（Day 5 实现）
 */
export function useAtomValue<Value>(atom: Atom<Value>): Value {
  // TODO: Day 5 实现
  throw new Error('useAtomValue will be implemented in Day 5')
}

/**
 * useSetAtom - 获取设置 atom 的函数（Day 5 实现）
 */
export function useSetAtom<Value, Args extends unknown[], Result>(
  atom: WritableAtom<Value, Args, Result>,
): (...args: Args) => Result {
  // TODO: Day 5 实现
  throw new Error('useSetAtom will be implemented in Day 5')
}

/**
 * useAtom - 同时读取和设置 atom（Day 5 实现）
 */
export function useAtom<Value, Args extends unknown[], Result>(
  atom: WritableAtom<Value, Args, Result>,
): [Value, (...args: Args) => Result] {
  // TODO: Day 5 实现
  throw new Error('useAtom will be implemented in Day 5')
}
