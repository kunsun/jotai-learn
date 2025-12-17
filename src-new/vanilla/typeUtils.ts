/**
 * Day 1 实现：类型工具
 * 
 * 这个文件定义了类型提取工具
 * 
 * 注意：Getter/Setter/SetStateAction 定义在 atom.ts 中，避免循环引用
 */

import type { Atom, WritableAtom } from './atom'

// 从 atom.ts 重新导出核心类型，保持 API 兼容
export type {
  Getter,
  Setter,
  SetStateAction,
} from './atom'

/**
 * ExtractAtomValue - 从 Atom 类型中提取值类型
 * 
 * 示例：
 * ExtractAtomValue<Atom<number>> = number
 */
export type ExtractAtomValue<AtomType> = AtomType extends Atom<infer Value>
  ? Value
  : never

/**
 * ExtractAtomArgs - 从 WritableAtom 中提取参数类型
 * 
 * 示例：
 * ExtractAtomArgs<WritableAtom<number, [number], void>> = [number]
 */
export type ExtractAtomArgs<AtomType> = AtomType extends WritableAtom<
  unknown,
  infer Args,
  unknown
>
  ? Args
  : never

/**
 * ExtractAtomResult - 从 WritableAtom 中提取返回值类型
 * 
 * 示例：
 * ExtractAtomResult<WritableAtom<number, [number], void>> = void
 */
export type ExtractAtomResult<AtomType> = AtomType extends WritableAtom<
  unknown,
  unknown[],
  infer Result
>
  ? Result
  : never
