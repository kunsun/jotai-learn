/**
 * Day 1 实现：Atom 核心
 * 
 * 这是 Jotai 最核心的文件，定义了：
 * 1. Atom 和 WritableAtom 接口
 * 2. atom() 工厂函数
 * 3. 原始 atom 的默认读写实现
 */

import type { Getter, Setter, SetStateAction } from './typeUtils'
import type { Store } from './store'

/**
 * SetAtom - 用于 WritableAtom 的 read 函数中的 setSelf 类型
 */
type SetAtom<Args extends unknown[], Result> = <A extends Args>(
  ...args: A
) => Result

/**
 * Read - atom 的读取函数签名
 * 
 * @param get - 用于读取其他 atom 的值（同时建立依赖）
 * @param options.signal - AbortSignal，用于取消异步操作
 * @param options.setSelf - 只在 WritableAtom 中可用，用于自我更新
 * @returns atom 的值
 * 
 * 示例：
 * - 简单派生：(get) => get(countAtom) * 2
 * - 异步：async (get, { signal }) => await fetch('/api', { signal })
 */
type Read<Value, SetSelf = never> = (
  get: Getter,
  options: { readonly signal: AbortSignal; readonly setSelf: SetSelf },
) => Value

/**
 * Write - atom 的写入函数签名
 * 
 * @param get - 用于读取其他 atom 的值
 * @param set - 用于写入其他 atom
 * @param args - 外部传入的参数
 * @returns 写入结果
 * 
 * 示例：
 * - 简单写入：(get, set, newValue) => set(countAtom, newValue)
 * - 复杂逻辑：(get, set, amount) => set(countAtom, get(countAtom) + amount)
 */
type Write<Args extends unknown[], Result> = (
  get: Getter,
  set: Setter,
  ...args: Args
) => Result

/**
 * WithInitialValue - 标记 atom 有初始值
 * 
 * 用于区分：
 * - Primitive atom: 有 init
 * - Derived atom: 无 init
 */
type WithInitialValue<Value> = {
  init: Value
}

/**
 * OnUnmount - atom 卸载时的清理函数
 */
type OnUnmount = () => void

/**
 * OnMount - atom 挂载时的回调
 * 
 * @param setAtom - 用于设置自己的值
 * @returns 可选的清理函数
 * 
 * 示例：
 * onMount: (setAtom) => {
 *   const interval = setInterval(() => setAtom(Date.now()), 1000)
 *   return () => clearInterval(interval)
 * }
 */
type OnMount<Args extends unknown[], Result> = <
  S extends SetAtom<Args, Result>,
>(
  setAtom: S,
) => OnUnmount | void

/**
 * Atom - 只读 atom 接口
 * 
 * 特点：
 * - 只能读取，不能直接写入
 * - 通过 read 函数计算值
 * - 可以依赖其他 atom
 */
export interface Atom<Value> {
  toString: () => string
  read: Read<Value>
  debugLabel?: string
  debugPrivate?: boolean
  INTERNAL_onInit?: (store: Store) => void
}

/**
 * WritableAtom - 可写 atom 接口
 * 
 * 泛型参数：
 * - Value: atom 的值类型
 * - Args: write 函数的参数类型
 * - Result: write 函数的返回值类型
 * 
 * 特点：
 * - 继承 Atom，可以读取
 * - 有 write 函数，可以写入
 * - read 中可以使用 setSelf 自我更新
 */
export interface WritableAtom<
  Value,
  Args extends unknown[],
  Result,
> extends Atom<Value> {
  read: Read<Value, SetAtom<Args, Result>>
  write: Write<Args, Result>
  onMount?: OnMount<Args, Result>
}

/**
 * PrimitiveAtom - 原始 atom 类型
 * 
 * 特点：
 * - 最常用的 atom 类型
 * - 支持 set(atom, value) 或 set(atom, prev => prev + 1)
 * - 类似 React useState 的 API
 */
export type PrimitiveAtom<Value> = WritableAtom<
  Value,
  [SetStateAction<Value>],
  void
>

/**
 * 全局 atom 计数器
 * 用于生成唯一的 atom key
 */
let keyCount = 0

/**
 * atom() 函数重载声明
 */

// 1️⃣ 可写派生 atom
export function atom<Value, Args extends unknown[], Result>(
  read: Read<Value, SetAtom<Args, Result>>,
  write: Write<Args, Result>,
): WritableAtom<Value, Args, Result>

// 2️⃣ 只读派生 atom
export function atom<Value>(read: Read<Value>): Atom<Value>

// 3️⃣ 只写派生 atom
export function atom<Value, Args extends unknown[], Result>(
  initialValue: Value,
  write: Write<Args, Result>,
): WritableAtom<Value, Args, Result> & WithInitialValue<Value>

// 4️⃣ 无初始值的原始 atom
export function atom<Value>(): PrimitiveAtom<Value | undefined> &
  WithInitialValue<Value | undefined>

// 5️⃣ 原始 atom（最常用）
export function atom<Value>(
  initialValue: Value,
): PrimitiveAtom<Value> & WithInitialValue<Value>

/**
 * atom() 函数实现
 * 
 * 核心逻辑：
 * 1. 生成唯一 key
 * 2. 判断是 primitive 还是 derived
 * 3. 设置对应的 read 和 write 函数
 * 
 * @param read - 初始值 或 读取函数
 * @param write - 可选的写入函数
 */
export function atom<Value, Args extends unknown[], Result>(
  read?: Value | Read<Value, SetAtom<Args, Result>>,
  write?: Write<Args, Result>,
) {
  // 生成唯一 key：atom1, atom2, atom3, ...
  const key = `atom${++keyCount}`

  // 创建 atom 配置对象
  const config = {
    toString() {
      // 开发环境显示 debugLabel，生产环境只显示 key
      if (import.meta.env?.MODE !== 'production' && this.debugLabel) {
        return key + ':' + this.debugLabel
      }
      return key
    },
  } as WritableAtom<Value, Args, Result> & { init?: Value | undefined }

  // 判断：read 是函数 → 派生 atom
  if (typeof read === 'function') {
    config.read = read as Read<Value, SetAtom<Args, Result>>
  } else {
    // read 是值 → 原始 atom
    config.init = read // 保存初始值
    config.read = defaultRead // 使用默认读取
    config.write = defaultWrite as unknown as Write<Args, Result>
  }

  // 如果提供了自定义 write，覆盖默认实现
  if (write) {
    config.write = write
  }

  return config
}

/**
 * defaultRead - 原始 atom 的默认读取实现
 * 
 * 逻辑：直接读取自己的值
 * 
 * 注意：
 * - 使用 function 声明而不是箭头函数，以便访问 this
 * - this 指向当前 atom
 */
function defaultRead<Value>(this: Atom<Value>, get: Getter) {
  // get(this) 会从 store 中读取当前 atom 的值
  return get(this)
}

/**
 * defaultWrite - 原始 atom 的默认写入实现
 * 
 * 功能：
 * 1. 支持直接设置值：set(atom, 5)
 * 2. 支持函数式更新：set(atom, prev => prev + 1)
 * 
 * 实现：
 * - 判断 arg 是函数还是值
 * - 如果是函数，先 get 当前值，再调用函数计算新值
 * - 最后 set 新值
 */
function defaultWrite<Value>(
  this: PrimitiveAtom<Value>,
  get: Getter,
  set: Setter,
  arg: SetStateAction<Value>,
) {
  return set(
    this,
    typeof arg === 'function'
      ? // 函数式更新：先获取当前值，再计算新值
        (arg as (prev: Value) => Value)(get(this))
      : // 直接设置
        arg,
  )
}
