/**
 * 页面生命周期管理工具
 * 用于处理 Electron/Chromium 应用挂起和恢复时的性能优化
 */

export type PageState = 'active' | 'passive' | 'hidden' | 'frozen' | 'terminated'

interface PageLifecycleCallbacks {
  onHide?: () => void
  onShow?: () => void
  onFreeze?: () => void
  onResume?: () => void
}

class PageLifecycleManager {
  private callbacks: PageLifecycleCallbacks = {}
  private isHidden = false
  private isFrozen = false

  constructor() {
    this.init()
  }

  private init(): void {
    // 页面可见性变化
    document.addEventListener('visibilitychange', this.handleVisibilityChange)

    // 页面冻结/恢复 (Page Lifecycle API)
    document.addEventListener('freeze', this.handleFreeze)
    document.addEventListener('resume', this.handleResume)

    // 页面显示/隐藏
    window.addEventListener('pagehide', this.handlePageHide)
    window.addEventListener('pageshow', this.handlePageShow)

    // 窗口焦点变化
    window.addEventListener('blur', this.handleBlur)
    window.addEventListener('focus', this.handleFocus)

    // 监听主进程的窗口事件 (Electron 特有)
    if (typeof window.api !== 'undefined') {
      window.api.onWindowFocus(() => {
        this.isHidden = false
        this.callbacks.onShow?.()
      })
      window.api.onWindowBlur(() => {
        this.isHidden = true
        this.callbacks.onHide?.()
      })
      window.api.onWindowRestore(() => {
        this.isHidden = false
        this.callbacks.onShow?.()
      })
    }
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.isHidden = true
      this.callbacks.onHide?.()
    } else {
      this.isHidden = false
      this.callbacks.onShow?.()
    }
  }

  private handleFreeze = (): void => {
    this.isFrozen = true
    this.callbacks.onFreeze?.()
  }

  private handleResume = (): void => {
    this.isFrozen = false
    this.callbacks.onResume?.()
  }

  private handlePageHide = (): void => {
    this.callbacks.onHide?.()
  }

  private handlePageShow = (): void => {
    this.callbacks.onShow?.()
  }

  private handleBlur = (): void => {
    // 窗口失去焦点但不一定是隐藏
  }

  private handleFocus = (): void => {
    // 窗口获得焦点
    if (this.isHidden) {
      this.isHidden = false
      this.callbacks.onShow?.()
    }
  }

  setCallbacks(callbacks: PageLifecycleCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  getState(): PageState {
    if (this.isFrozen) return 'frozen'
    if (this.isHidden) return 'hidden'
    if (document.visibilityState === 'visible') return 'active'
    return 'passive'
  }

  isPageVisible(): boolean {
    return !this.isHidden && document.visibilityState === 'visible'
  }

  isPageActive(): boolean {
    return this.isPageVisible() && document.hasFocus()
  }

  destroy(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    document.removeEventListener('freeze', this.handleFreeze)
    document.removeEventListener('resume', this.handleResume)
    window.removeEventListener('pagehide', this.handlePageHide)
    window.removeEventListener('pageshow', this.handlePageShow)
    window.removeEventListener('blur', this.handleBlur)
    window.removeEventListener('focus', this.handleFocus)
  }
}

// 全局单例
let globalManager: PageLifecycleManager | null = null

export function getPageLifecycleManager(): PageLifecycleManager {
  if (!globalManager) {
    globalManager = new PageLifecycleManager()
  }
  return globalManager
}

/**
 * 节流函数 - 只在页面可见时执行
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttleWhenVisible<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null
  const manager = getPageLifecycleManager()

  const throttled = (...args: Parameters<T>): void => {
    lastArgs = args

    if (!manager.isPageVisible()) {
      // 页面不可见时，清除待执行的定时器
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      return
    }

    if (!timeoutId) {
      timeoutId = setTimeout(() => {
        if (lastArgs) {
          fn(...lastArgs)
        }
        timeoutId = null
      }, delay)
    }
  }

  return throttled
}

/**
 * 延迟执行 - 页面不可见时暂停，恢复后执行
 */
export function debounceWithLifecycle<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): { trigger: T; cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let pendingArgs: Parameters<T> | null = null
  const manager = getPageLifecycleManager()

  const cancel = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    pendingArgs = null
  }

  const trigger = (...args: Parameters<T>): void => {
    pendingArgs = args
    cancel()

    // 如果页面不可见，等待页面恢复后再执行
    if (!manager.isPageVisible()) {
      const checkAndExecute = (): void => {
        if (manager.isPageVisible() && pendingArgs) {
          fn(...pendingArgs)
          pendingArgs = null
        }
      }
      // 监听页面恢复
      const onShow = (): void => {
        checkAndExecute()
        manager.setCallbacks({ onShow: undefined })
      }
      manager.setCallbacks({ onShow })
      return
    }

    timeoutId = setTimeout(() => {
      if (pendingArgs) {
        fn(...pendingArgs)
        pendingArgs = null
      }
    }, delay)
  }

  return { trigger: trigger as T, cancel }
}
