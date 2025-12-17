/**
 * Day 1 实现：Store 接口定义
 * 
 * Store 是管理所有 atom 状态的核心
 * Day 1 只定义接口，Day 2-4 实现具体逻辑
 */

import type { Atom, WritableAtom } from './atom'

/**
 * Store - 状态管理器接口
 * 
 * 职责：
 * 1. 存储所有 atom 的状态
 * 2. 管理 atom 之间的依赖关系
 * 3. 处理状态更新和通知
 */
export interface Store {
  /**
   * get - 读取 atom 的值
   * 
   * @param atom - 要读取的 atom
   * @returns atom 的当前值
   * 
   * 功能：
   * - 如果是 primitive atom，返回存储的值
   * - 如果是 derived atom，执行 read 函数计算值
   * - 自动建立依赖关系（Day 2 实现）
   */
  get<Value>(atom: Atom<Value>): Value

  /**
   * set - 写入 atom 的值
   * 
   * @param atom - 要写入的 atom
   * @param args - 写入参数
   * @returns 写入结果
   * 
   * 功能：
   * - 执行 atom 的 write 函数
   * - 更新 atom 的状态
   * - 通知所有依赖此 atom 的订阅者（Day 3 实现）
   */
  set<Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result

  /**
   * sub - 订阅 atom 的变化
   * 
   * @param atom - 要订阅的 atom
   * @param listener - 变化时的回调函数
   * @returns 取消订阅的函数
   * 
   * 功能：
   * - 注册监听器
   * - 挂载 atom 及其依赖（Day 4 实现）
   * - 返回清理函数
   */
  sub<Value>(atom: Atom<Value>, listener: () => void): () => void
}

/**
 * createStore - 创建一个新的 store
 * 
 * Day 2 实现具体逻辑
 */
export function createStore(): Store {
  // TODO: Day 2 实现
  throw new Error('createStore will be implemented in Day 2')
}

/**
 * getDefaultStore - 获取默认的全局 store
 * 
 * Day 2 实现具体逻辑
 */
export function getDefaultStore(): Store {
  // TODO: Day 2 实现
  throw new Error('getDefaultStore will be implemented in Day 2')
}
