/**
 * Day 1 实现：核心类型定义
 * 
 * 这个文件定义了 Jotai 的核心类型工具
 */

import type { Atom, WritableAtom } from './atom'

/**
 * Getter - 用于读取 atom 的值
 * 
 * 关键设计：
 * 1. 泛型函数，可以读取任何类型的 atom
 * 2. 调用 get(atom) 时会自动建立依赖关系（Day 2 实现）
 */
export type Getter = <Value>(atom: Atom<Value>) => Value

/**
 * Setter - 用于写入 atom 的值
 * 
 * 关键设计：
 * 1. 只能写入 WritableAtom
 * 2. 需要传入 atom 的写入参数（Args）
 * 3. 返回写入结果（Result）
 */
export type Setter = <Value, Args extends unknown[], Result>(
  atom: WritableAtom<Value, Args, Result>,
  ...args: Args
) => Result

/**
 * SetStateAction - 类似 React useState 的更新方式
 * 
 * 支持两种方式：
 * 1. 直接传值：set(atom, 5)
 * 2. 函数式更新：set(atom, prev => prev + 1)
 */
export type SetStateAction<Value> = Value | ((prev: Value) => Value)

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
