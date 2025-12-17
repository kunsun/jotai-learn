/**
 * Day 1 实现：Vanilla 模块入口
 * 
 * 导出所有纯 JavaScript 的核心 API
 */

// Atom 相关
export { atom } from './vanilla/atom'
export type { Atom, WritableAtom, PrimitiveAtom } from './vanilla/atom'

// Store 相关
export { createStore, getDefaultStore } from './vanilla/store'
export type { Store } from './vanilla/store'

// 类型工具
export type {
  Getter,
  Setter,
  SetStateAction,
  ExtractAtomValue,
  ExtractAtomArgs,
  ExtractAtomResult,
} from './vanilla/typeUtils'
