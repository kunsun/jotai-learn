# 🎉 Day 1 实现总结：架构总览 + Atom 定义

## 📁 目录结构

```
src-new/
├── index.ts                # 主入口，统一导出
├── vanilla.ts              # Vanilla 模块入口
├── react.ts                # React 模块入口（Day 5 实现）
└── vanilla/
    ├── atom.ts             # ✅ Atom 核心 + Getter/Setter 定义
    ├── typeUtils.ts        # ✅ 类型提取工具（Extract*）
    └── store.ts            # 接口定义（Day 2-4 实现）
```

---

## ✅ Day 1 完成内容

### 1. Atom 核心 (`vanilla/atom.ts`)

这是核心文件，定义了 **Getter/Setter + Atom 接口 + atom() 函数**。

> ❗ **重要设计**：Getter/Setter 定义在 atom.ts 内部，避免与 Atom 的循环引用。

#### 1.1 核心类型定义

```typescript
// Getter - 读取 atom 的值，同时建立依赖关系
export type Getter = <Value>(atom: Atom<Value>) => Value

// Setter - 写入 atom 的值
export type Setter = <Value, Args extends unknown[], Result>(
  atom: WritableAtom<Value, Args, Result>,
  ...args: Args
) => Result

// SetStateAction - 类似 React useState 的更新方式
export type SetStateAction<Value> = Value | ((prev: Value) => Value)
```

**为什么定义在 atom.ts 中？**
- `Getter` 需要用到 `Atom<Value>` 类型
- `Atom` 的 `read` 函数需要用到 `Getter`
- 如果分开定义会产生循环引用
- **解决方案**：都定义在同一文件，单向依赖

#### 1.2 核心接口

```typescript
// 只读 atom
interface Atom<Value> {
  toString: () => string
  read: Read<Value>
  debugLabel?: string
  INTERNAL_onInit?: (store: Store) => void
}

// 可写 atom
interface WritableAtom<Value, Args, Result> extends Atom<Value> {
  read: Read<Value, SetAtom<Args, Result>>
  write: Write<Args, Result>
  onMount?: OnMount<Args, Result>
}

// 原始 atom（最常用）
type PrimitiveAtom<Value> = WritableAtom<Value, [SetStateAction<Value>], void>
```

#### 2.2 atom() 函数重载

支持 5 种创建方式：

```typescript
// 1️⃣ 原始 atom（最常用）
const countAtom = atom(0)
// PrimitiveAtom<number> & WithInitialValue<number>

// 2️⃣ 只读派生 atom
const doubleAtom = atom((get) => get(countAtom) * 2)
// Atom<number>

// 3️⃣ 可写派生 atom
const incrementAtom = atom(
  (get) => get(countAtom),
  (get, set, amount: number) => set(countAtom, get(countAtom) + amount)
)
// WritableAtom<number, [number], void>

// 4️⃣ 只写派生 atom（罕见）
const writeOnlyAtom = atom(null, (get, set) => {
  set(countAtom, get(countAtom) + 1)
})
// WritableAtom<null, [], void> & WithInitialValue<null>

// 5️⃣ 无初始值 atom
const maybeAtom = atom<number>()
// PrimitiveAtom<number | undefined> & WithInitialValue<number | undefined>
```

#### 2.3 核心实现逻辑

```typescript
export function atom<Value, Args extends unknown[], Result>(
  read?: Value | Read<Value, SetAtom<Args, Result>>,
  write?: Write<Args, Result>,
) {
  // 1️⃣ 生成唯一 key
  const key = `atom${++keyCount}`  // atom1, atom2, ...
  
  const config = {
    toString() {
      return import.meta.env?.MODE !== 'production' && this.debugLabel
        ? key + ':' + this.debugLabel
        : key
    },
  } as WritableAtom<Value, Args, Result> & { init?: Value | undefined }
  
  // 2️⃣ 判断是 primitive 还是 derived
  if (typeof read === 'function') {
    // 派生 atom：read 是计算函数
    config.read = read as Read<Value, SetAtom<Args, Result>>
  } else {
    // 原始 atom：read 是初始值
    config.init = read           // 保存初始值
    config.read = defaultRead     // 使用默认读取
    config.write = defaultWrite   // 使用默认写入
  }
  
  // 3️⃣ 自定义 write 覆盖默认
  if (write) {
    config.write = write
  }
  
  return config
}
```

**关键点**：
- ✅ 通过 `typeof read === 'function'` 区分 primitive 和 derived
- ✅ primitive atom 有 `init` 属性，derived atom 没有
- ✅ 每个 atom 有全局唯一的 key

#### 2.4 默认实现

```typescript
// 原始 atom 的默认读取：直接从 store 读值
function defaultRead<Value>(this: Atom<Value>, get: Getter) {
  return get(this)
}

// 原始 atom 的默认写入：支持值或函数
function defaultWrite<Value>(
  this: PrimitiveAtom<Value>,
  get: Getter,
  set: Setter,
  arg: SetStateAction<Value>,
) {
  return set(
    this,
    typeof arg === 'function'
      ? (arg as (prev: Value) => Value)(get(this))  // 函数式更新
      : arg,  // 直接设置
  )
}
```

**理解**：
- `defaultRead` 只是简单转发给 `get(this)`，实际逻辑在 store 中
- `defaultWrite` 实现了和 React useState 一样的 API

---

### 2. 类型提取工具 (`vanilla/typeUtils.ts`)

该文件提供类型提取工具，并重新导出 atom.ts 中的核心类型。

```typescript
// 从 atom.ts 重新导出，保持 API 兼容
export type { Getter, Setter, SetStateAction } from './atom'

// 类型提取工具
export type ExtractAtomValue<AtomType> = AtomType extends Atom<infer Value>
  ? Value
  : never

export type ExtractAtomArgs<AtomType> = AtomType extends WritableAtom<
  unknown,
  infer Args,
  unknown
>
  ? Args
  : never

export type ExtractAtomResult<AtomType> = AtomType extends WritableAtom<
  unknown,
  unknown[],
  infer Result
>
  ? Result
  : never
```

| 类型 | 作用 | 示例 |
|------|------|------|
| `ExtractAtomValue` | 提取 atom 的值类型 | `Atom<number>` → `number` |
| `ExtractAtomArgs` | 提取 write 参数类型 | `WritableAtom<number, [string], void>` → `[string]` |
| `ExtractAtomResult` | 提取 write 返回类型 | `WritableAtom<number, [string], boolean>` → `boolean` |

---

### 3. Store 接口 (`vanilla/store.ts`)

定义了 3 个核心方法（Day 2-4 实现）：

```typescript
interface Store {
  // 读取 atom 的值
  get<Value>(atom: Atom<Value>): Value
  
  // 写入 atom 的值
  set<Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result
  
  // 订阅 atom 的变化
  sub<Value>(atom: Atom<Value>, listener: () => void): () => void
}
```

**职责划分**：
- `get`: 读取 + 建立依赖（Day 2）
- `set`: 写入 + 更新传播（Day 3）
- `sub`: 订阅 + 生命周期（Day 4）

---

### 4. 入口文件

#### 4.1 `vanilla.ts` - Vanilla 模块入口
```typescript
export { atom } from './vanilla/atom'
export type { Atom, WritableAtom, PrimitiveAtom } from './vanilla/atom'
export { createStore, getDefaultStore } from './vanilla/store'
export type { Store } from './vanilla/store'
export type {
  Getter, Setter, SetStateAction,
  ExtractAtomValue, ExtractAtomArgs, ExtractAtomResult,
} from './vanilla/typeUtils'
```

#### 4.2 `react.ts` - React 模块入口（Day 5 实现）
```typescript
export function Provider({ children }: { children: React.ReactNode })
export function useStore()
export function useAtomValue<Value>(atom: Atom<Value>): Value
export function useSetAtom<Value, Args, Result>(atom: WritableAtom<Value, Args, Result>)
export function useAtom<Value, Args, Result>(atom: WritableAtom<Value, Args, Result>)
```

#### 4.3 `index.ts` - 主入口
```typescript
export * from './vanilla'
export * from './react'
```

---

## 🎯 核心设计理解

### 设计 1: Primitive vs Derived

| 特性 | Primitive Atom | Derived Atom |
|------|----------------|--------------|
| 定义方式 | `atom(initialValue)` | `atom((get) => ...)` |
| 有 init | ✅ | ❌ |
| read 实现 | `defaultRead` | 自定义函数 |
| write 实现 | `defaultWrite` | 可选 |
| 存储方式 | 直接存值 | 计算得出 |

**示例对比**：
```typescript
// Primitive - 有 init，直接存储
const textAtom = atom('hello')
// config.init = 'hello'
// config.read = defaultRead  → 从 store 读取
// config.write = defaultWrite → 直接设置值

// Derived - 无 init，依赖计算
const uppercaseAtom = atom((get) => get(textAtom).toUpperCase())
// config.init = undefined
// config.read = (get) => get(textAtom).toUpperCase()
// config.write = undefined（只读）
```

---

### 设计 2: 类型系统的精妙之处

#### 2.1 为什么 WritableAtom 有 3 个泛型参数？

```typescript
WritableAtom<Value, Args, Result>
```

**分离关注点**：
- `Value` - atom 的值类型（用于 read）
- `Args` - write 函数的参数（用于调用时的类型检查）
- `Result` - write 函数的返回值（用于异步操作、链式调用）

**示例**：
```typescript
// 计数器 atom
const countAtom = atom(0)
// WritableAtom<number, [SetStateAction<number>], void>
//               ^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^  ^^^^
//               值类型   参数：值或函数          无返回值

// 异步递增 atom
const asyncIncrementAtom = atom(
  (get) => get(countAtom),
  async (get, set, amount: number) => {
    await delay(100)
    set(countAtom, get(countAtom) + amount)
    return 'success'
  }
)
// WritableAtom<number, [number], Promise<string>>
//               ^^^^^^  ^^^^^^^^  ^^^^^^^^^^^^^^^^
//               值类型   参数      返回值
```

#### 2.2 为什么 Read 的第二个泛型参数是 SetSelf？

```typescript
type Read<Value, SetSelf = never> = (
  get: Getter,
  options: { readonly signal: AbortSignal; readonly setSelf: SetSelf },
) => Value
```

**实现自我更新**：
- 只读 atom：`SetSelf = never`，options.setSelf 不可用
- 可写 atom：`SetSelf = SetAtom<Args, Result>`，可以通过 setSelf 更新自己

**示例**：
```typescript
// 只读 atom - setSelf 不可用
const doubleAtom = atom((get) => get(countAtom) * 2)
// Read<number, never>
// options.setSelf 类型为 never，无法调用

// 可写 atom - 可以用 setSelf
const counterAtom = atom(
  (get, { setSelf }) => {
    // 可以调用 setSelf 更新自己
    return 0
  },
  (get, set, newValue: number) => {
    // write 逻辑
  }
)
```

---

### 设计 3: defaultRead 和 defaultWrite 的巧妙之处

#### 为什么用 function 而不是箭头函数？

```typescript
// ✅ 正确：function 声明
function defaultRead<Value>(this: Atom<Value>, get: Getter) {
  return get(this)  // this 指向当前 atom
}

// ❌ 错误：箭头函数没有 this
const defaultRead = <Value>(get: Getter) => {
  return get(???)  // 无法知道是哪个 atom
}
```

**原因**：
- atom 配置对象会把 `defaultRead` 赋值给 `config.read`
- 调用时：`atomConfig.read.call(atomConfig, get, options)`
- `this` 自动绑定为 `atomConfig`，即当前 atom

#### defaultWrite 如何实现函数式更新？

```typescript
function defaultWrite<Value>(
  this: PrimitiveAtom<Value>,
  get: Getter,
  set: Setter,
  arg: SetStateAction<Value>,
) {
  return set(
    this,
    typeof arg === 'function'
      ? (arg as (prev: Value) => Value)(get(this))  // 先 get，再计算
      : arg,  // 直接用值
  )
}
```

**工作流程**：
```typescript
// 场景 1: 直接设置
store.set(countAtom, 5)
// → defaultWrite(get, set, 5)
// → set(countAtom, 5)

// 场景 2: 函数式更新
store.set(countAtom, (prev) => prev + 1)
// → defaultWrite(get, set, (prev) => prev + 1)
// → set(countAtom, (get(countAtom) + 1))
// → set(countAtom, 计算后的新值)
```

---

## 🔍 和原版 Jotai 的对比

### 相同点
- ✅ 类型定义完全一致
- ✅ atom() 重载逻辑一致
- ✅ defaultRead/defaultWrite 实现一致
- ✅ 模块划分结构一致
- ✅ **Getter/Setter 定义在 atom.ts 内部，避免循环引用**

### 设计 4: 避免循环引用

**问题**：如果 Getter 定义在 typeUtils.ts，会产生循环引用：
```
typeUtils.ts ──import──> atom.ts
     │                      │
     └── Getter 用 Atom <───┘ Atom 用 Getter
```

**解决方案**：将 Getter/Setter 定义在 atom.ts 内部
```
atom.ts (独立，无循环)
   ├── type Getter = ...  ← 定义在这里
   ├── type Setter = ...  ← 定义在这里
   ├── interface Atom     ← 可以直接用 Getter
   └── interface WritableAtom

typeUtils.ts ──import──> atom.ts（单向依赖）
   ├── export type { Getter, Setter } from './atom'  ← 重新导出
   └── type ExtractAtomValue = ...
```

**为什么 `import type` 的循环引用也能工作？**
- `import type` 在编译后被完全擦除
- 类型检查是静态分析，不需要运行时
- 但为了代码清晰，仍建议避免循环引用

### 简化点
- 📦 暂未实现 Store（Day 2-4）
- 📦 暂未实现 React Hooks（Day 5）
- 📦 暂未实现 BuildingBlocks 扩展机制
- 📦 暂未实现 unstable_onInit 等边缘功能

---

## 📝 知识点检查

### 必须理解
- [ ] `typeof read === 'function'` 如何区分 primitive 和 derived
- [ ] `defaultRead` 为什么用 `function` 而不是箭头函数
- [ ] `defaultWrite` 如何支持函数式更新
- [ ] `WritableAtom<Value, Args, Result>` 三个泛型的作用
- [ ] `SetSelf` 的作用和使用场景
- [ ] **为什么 Getter/Setter 定义在 atom.ts 而不是单独文件**

### 可以尝试
- [ ] 手写一个 primitive atom 的创建过程
- [ ] 手写一个 derived atom 的创建过程
- [ ] 解释 `atom(0)` 和 `atom((get) => 0)` 的区别

---

## 🚀 Day 2 预告：Store 核心 - 状态读取

### 明天要实现的核心数据结构

```typescript
// AtomState - 每个 atom 的运行时状态
type AtomState = {
  d: Map<Atom, number>  // dependencies - 我依赖谁
  p: Set<Atom>          // pending promises - 等待的异步依赖
  n: number             // epoch number - 版本号
  v?: Value             // value - 当前值
  e?: Error             // error - 错误
}
```

### 明天的核心问题
1. ❓ `readAtomState` 如何执行 atom.read？
2. ❓ `get(depAtom)` 调用时如何自动记录依赖？
3. ❓ 如何通过版本号判断是否需要重新计算？
4. ❓ 如何处理异步 atom？

### 明天的实现目标
- ✅ 实现 `createStore()`
- ✅ 实现 `readAtomState()` - 核心读取逻辑
- ✅ 实现依赖收集机制
- ✅ 实现缓存和版本号机制

---

## 🎓 学习建议

### 1. 阅读顺序
1. 先看 `atom.ts` 前半部分 - 理解 Getter/Setter/Atom 类型
2. 再看 `atom.ts` 后半部分 - 理解 atom() 函数实现
3. 最后看 `typeUtils.ts` - 理解类型提取工具
4. 对照原版 `src/vanilla/atom.ts` - 查看差异

### 2. 调试技巧
在浏览器控制台：
```javascript
import { atom } from './src-new/index'

// 创建 primitive atom
const countAtom = atom(0)
console.log(countAtom)
// { init: 0, read: [Function: defaultRead], write: [Function: defaultWrite], toString: ... }

// 创建 derived atom
const doubleAtom = atom((get) => get(countAtom) * 2)
console.log(doubleAtom)
// { read: [Function], toString: ... }
// 注意：没有 init 和 write
```

### 3. 对比学习
打开两个编辑器窗口：
- 左边：`src-new/vanilla/atom.ts`（你的实现）
- 右边：`src/vanilla/atom.ts`（原版）

逐行对比，理解设计意图。

---

## 📊 完成度

```
Day 1: ████████████████████ 100%
  ✅ 目录结构
  ✅ typeUtils.ts
  ✅ atom.ts
  ✅ store.ts 接口
  ✅ 入口文件
  ✅ 学习文档

Day 2: ░░░░░░░░░░░░░░░░░░░░ 0%
Day 3: ░░░░░░░░░░░░░░░░░░░░ 0%
Day 4: ░░░░░░░░░░░░░░░░░░░░ 0%
Day 5: ░░░░░░░░░░░░░░░░░░░░ 0%
```

---

恭喜完成 Day 1！🎉

明天我们将实现 Store 的核心逻辑，理解 Jotai 最精妙的依赖追踪机制！
