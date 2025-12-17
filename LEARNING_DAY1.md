# 📚 Jotai 源码学习 Day 1：架构总览 + Atom 定义

## 🏗️ 上午：整体架构（已完成）

### 1. 模块划分 (`src/index.ts`)
```typescript
export * from './vanilla.ts'  // 纯 JS 核心
export * from './react.ts'    // React 绑定
```

**设计要点**：
- **职责分离**：vanilla（框架无关） + react（React 专用）
- 对比 Zustand：Zustand 也是类似设计，但 Jotai 更彻底地分离了核心逻辑

---

### 2. Vanilla 核心入口 (`src/vanilla.ts`)

```typescript
// 核心 API
export { atom } from './vanilla/atom.ts'
export { createStore, getDefaultStore } from './vanilla/store.ts'

// 类型导出
export type { Atom, WritableAtom, PrimitiveAtom } from './vanilla/atom.ts'
export type { Getter, Setter, ExtractAtomValue, ... } from './vanilla/typeUtils.ts'
```

**3 大核心模块**：
1. **atom.ts** - 定义 atom（状态单元）
2. **store.ts** - 管理所有 atom 的状态
3. **typeUtils.ts** - 类型工具

---

### 3. React 绑定入口 (`src/react.ts`)

```typescript
export { Provider, useStore } from './react/Provider.ts'
export { useAtomValue } from './react/useAtomValue.ts'  // 读
export { useSetAtom } from './react/useSetAtom.ts'      // 写
export { useAtom } from './react/useAtom.ts'            // 读写
```

**对比 Zustand**：
| API | Zustand | Jotai |
|-----|---------|-------|
| 读取 | `useStore(selector)` | `useAtomValue(atom)` |
| 写入 | `set(...)` | `useSetAtom(atom)` |
| 读写 | `useStore(selector)` | `useAtom(atom)` |

---

## 🔬 下午：Atom 核心（`src/vanilla/atom.ts`）

### 核心类型定义

#### 1. **基础函数类型**
```typescript
// 读取依赖的函数
type Getter = <Value>(atom: Atom<Value>) => Value

// 写入依赖的函数
type Setter = <Value, Args extends unknown[], Result>(
  atom: WritableAtom<Value, Args, Result>,
  ...args: Args
) => Result
```

**理解要点**：
- `Getter` = 通过它读取其他 atom 的值，**同时自动建立依赖关系**
- `Setter` = 通过它写入其他 atom，触发更新传播

---

#### 2. **Read 签名 - Atom 如何计算值**
```typescript
type Read<Value, SetSelf = never> = (
  get: Getter,
  options: { readonly signal: AbortSignal; readonly setSelf: SetSelf },
) => Value
```

**参数解析**：
- `get` - 读取依赖 atom 的值
- `signal` - 用于取消异步操作（AbortController）
- `setSelf` - **仅在 WritableAtom 中可用**，用于自我更新

**示例**：
```typescript
// 只读派生 atom
const uppercaseAtom = atom((get) => {
  return get(textAtom).toUpperCase()  // get 建立依赖
})

// 异步 atom
const userAtom = atom(async (get, { signal }) => {
  const id = get(userIdAtom)
  const res = await fetch(`/api/user/${id}`, { signal })
  return res.json()
})
```

---

#### 3. **Write 签名 - Atom 如何响应更新**
```typescript
type Write<Args extends unknown[], Result> = (
  get: Getter,
  set: Setter,
  ...args: Args  // 外部传入的参数
) => Result
```

**示例**：
```typescript
// 只读 atom（没有 write）
const doubleAtom = atom((get) => get(countAtom) * 2)

// 可写 atom
const incrementAtom = atom(
  null,  // read 为 null（不关心读取值）
  (get, set) => {
    set(countAtom, get(countAtom) + 1)
  }
)
```

---

### 核心接口

#### 1. **Atom<Value>** - 只读 atom
```typescript
export interface Atom<Value> {
  toString: () => string              // 用于调试
  read: Read<Value>                   // 如何计算值
  debugLabel?: string                 // 调试标签
  INTERNAL_onInit?: (store: Store) => void  // 首次引用时触发
}
```

**特点**：
- ✅ 可以读取（通过 `get(atom)`）
- ❌ 不能直接写入（没有 `write` 方法）

---

#### 2. **WritableAtom<Value, Args, Result>** - 可写 atom
```typescript
export interface WritableAtom<Value, Args extends unknown[], Result> extends Atom<Value> {
  read: Read<Value, SetAtom<Args, Result>>  // 可以使用 setSelf
  write: Write<Args, Result>                // 如何响应更新
  onMount?: OnMount<Args, Result>           // 挂载时回调
}
```

**泛型参数**：
- `Value` - atom 的值类型
- `Args` - `write` 函数接受的参数类型
- `Result` - `write` 函数的返回值类型

**示例**：
```typescript
// PrimitiveAtom<number> = WritableAtom<number, [SetStateAction<number>], void>
const countAtom = atom(0)
// Args = [number | ((prev: number) => number)]
// Result = void

// 自定义 WritableAtom
const asyncIncrementAtom = atom(
  (get) => get(countAtom),
  async (get, set, amount: number) => {  // Args = [number]
    await delay(100)
    set(countAtom, get(countAtom) + amount)
    return 'done'  // Result = string
  }
)
```

---

#### 3. **PrimitiveAtom<Value>** - 原始 atom
```typescript
export type PrimitiveAtom<Value> = WritableAtom<
  Value,
  [SetStateAction<Value>],  // 接受值或更新函数
  void
>

type SetStateAction<Value> = Value | ((prev: Value) => Value)
```

**特点**：
- 有初始值（`init`）
- 标准的 `set(atom, newValue)` 或 `set(atom, prev => prev + 1)` 接口
- 这是最常用的类型

---

### atom() 函数重载

```typescript
// 1️⃣ 可写派生 atom
export function atom<Value, Args extends unknown[], Result>(
  read: Read<Value, SetAtom<Args, Result>>,
  write: Write<Args, Result>,
): WritableAtom<Value, Args, Result>

// 2️⃣ 只读派生 atom
export function atom<Value>(
  read: Read<Value>
): Atom<Value>

// 3️⃣ 只写派生 atom（罕见）
export function atom<Value, Args extends unknown[], Result>(
  initialValue: Value,
  write: Write<Args, Result>,
): WritableAtom<Value, Args, Result> & WithInitialValue<Value>

// 4️⃣ 无初始值的原始 atom
export function atom<Value>(): PrimitiveAtom<Value | undefined>

// 5️⃣ 原始 atom（最常用）
export function atom<Value>(
  initialValue: Value,
): PrimitiveAtom<Value> & WithInitialValue<Value>
```

---

### atom() 实现解析

```typescript
export function atom<Value, Args extends unknown[], Result>(
  read?: Value | Read<Value, SetAtom<Args, Result>>,
  write?: Write<Args, Result>,
) {
  const key = `atom${++keyCount}`  // 全局唯一 key
  
  const config = {
    toString() {
      return import.meta.env?.MODE !== 'production' && this.debugLabel
        ? key + ':' + this.debugLabel
        : key
    },
  } as WritableAtom<Value, Args, Result> & { init?: Value | undefined }
  
  // 判断：read 是函数 → 派生 atom
  if (typeof read === 'function') {
    config.read = read as Read<Value, SetAtom<Args, Result>>
  } else {
    // read 是值 → 原始 atom
    config.init = read        // 保存初始值
    config.read = defaultRead  // 使用默认读取
    config.write = defaultWrite as unknown as Write<Args, Result>
  }
  
  if (write) {
    config.write = write  // 覆盖 write
  }
  
  return config
}
```

**关键点**：
1. **每个 atom 有唯一 key**：`atom1`, `atom2`, ...
2. **判断逻辑**：
   - `typeof read === 'function'` → 派生 atom（需要计算）
   - 否则 → 原始 atom（直接存储值）
3. **原始 atom 使用默认实现**

---

### 默认实现

#### defaultRead - 原始 atom 的读取
```typescript
function defaultRead<Value>(this: Atom<Value>, get: Getter) {
  return get(this)  // 读取自己的值
}
```

**理解**：
- 原始 atom 不需要计算，直接返回存储的值
- `get(this)` 会从 store 中读取 `this` atom 的状态

---

#### defaultWrite - 原始 atom 的写入
```typescript
function defaultWrite<Value>(
  this: PrimitiveAtom<Value>,
  get: Getter,
  set: Setter,
  arg: SetStateAction<Value>,  // 值 或 更新函数
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
- 支持 `set(countAtom, 5)` - 直接设置
- 支持 `set(countAtom, c => c + 1)` - 函数式更新
- 对比 React `useState`：完全一致的 API！

---

## 🧩 核心设计对比

### Primitive vs Derived

| 类型 | 定义 | 特点 | 示例 |
|------|------|------|------|
| **Primitive** | `atom(initialValue)` | 有 `init`，直接存储值 | `atom(0)` |
| **Derived** | `atom((get) => ...)` | 无 `init`，从其他 atom 计算 | `atom((get) => get(a) * 2)` |

### Zustand vs Jotai

| 概念 | Zustand | Jotai |
|------|---------|-------|
| 状态单元 | `create((set, get) => ({ count: 0 }))` | `atom(0)` |
| 派生状态 | 在 selector 中计算 | `atom((get) => get(a) + 1)` |
| 依赖追踪 | selector 返回值变化 | `get()` 调用自动收集 |
| 更新逻辑 | 在 `set` 回调中 | 在 `write` 函数中 |

**Jotai 优势**：
- ✅ 更细粒度的订阅（atom 级别）
- ✅ 自动依赖追踪（不需要手动指定）
- ✅ 更强的组合性（atom 可以无限嵌套）

---

## 🎯 Hello 示例分析

```typescript
// examples/hello/src/App.tsx

// 1️⃣ 原始 atom - 有初始值 'hello'
const textAtom = atom<string>('hello')
// 类型：PrimitiveAtom<string> & WithInitialValue<string>
// config.init = 'hello'
// config.read = defaultRead
// config.write = defaultWrite

// 2️⃣ 派生 atom - 从 textAtom 计算
const uppercaseAtom = atom((get) => get(textAtom).toUpperCase())
// 类型：Atom<string>
// config.read = (get) => get(textAtom).toUpperCase()
// 没有 config.write（只读）

// 使用
const Input = () => {
  const [text, setText] = useAtom(textAtom)
  // text = store.get(textAtom)
  // setText = (value) => store.set(textAtom, value)
  return <input value={text} onChange={(e) => setText(e.target.value)} />
}

const Uppercase = () => {
  const [uppercase] = useAtom(uppercaseAtom)
  // uppercase = store.get(uppercaseAtom)
  //           = uppercaseAtom.read(get)
  //           = get(textAtom).toUpperCase()
  return <>{uppercase}</>
}
```

**依赖关系**：
```
textAtom (primitive)
    ↓ 依赖
uppercaseAtom (derived)
```

**更新流程**：
1. 用户输入 → `setText('HELLO')`
2. → `store.set(textAtom, 'HELLO')`
3. → 触发 `textAtom` 值更新
4. → `uppercaseAtom` 标记为 invalid（因为依赖 `textAtom`）
5. → `uppercaseAtom` 重新计算 → `'HELLO'.toUpperCase()` = `'HELLO'`
6. → 通知订阅者重新渲染

---

## 🔍 今日调试任务

### 断点位置

1. **atom() 创建**
   - 文件：`src/vanilla/atom.ts:109`
   - 断点：`const key = \`atom${++keyCount}\``
   - 观察：`read` 是函数还是值

2. **defaultRead**
   - 文件：`src/vanilla/atom.ts:131`
   - 观察：`get(this)` 如何读取值

3. **defaultWrite**
   - 文件：`src/vanilla/atom.ts:135`
   - 观察：`arg` 是函数还是值

### 运行 hello 示例

```bash
cd examples/hello
npm install
npm run dev
```

在 Chrome DevTools 中：
1. 打开 Sources 面板
2. 找到 `node_modules/jotai/vanilla/atom.ts`
3. 在 `atom()` 函数内打断点
4. 刷新页面，观察 `textAtom` 和 `uppercaseAtom` 的创建

---

## 📝 理解检查点

- [ ] 理解 `Getter` 和 `Setter` 的作用
- [ ] 区分 `Atom<Value>` 和 `WritableAtom<Value, Args, Result>`
- [ ] 理解 `PrimitiveAtom` 的类型定义
- [ ] 明白 `atom()` 如何区分 primitive 和 derived
- [ ] 理解 `defaultRead` 和 `defaultWrite` 的实现
- [ ] 能够解释 hello 示例的依赖关系

---

## 🚀 明天预告：Store 核心 - 状态读取

重点文件：
- `src/vanilla/store.ts` - Store 接口
- `src/vanilla/internals.ts` - `readAtomState` 核心逻辑

核心问题：
- `atomState` 如何存储状态？
- 依赖关系如何记录？
- `get()` 调用时如何自动建立依赖？
- 版本号（epoch number）的作用？
