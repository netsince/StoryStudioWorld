import React, { useEffect, useRef, useImperativeHandle } from 'react'
import {
  InputBox,
  IInputOptions,
  MessageType,
  IInputBoxStyles,
  IMessage
} from '../../../vse/base/browser/ui/inputbox/inputBox'
import { defaultInputBoxStyles } from '../../../vse/platform/theme/browser/defaultStyles'

export interface InputBoxProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  ariaLabel?: string
  disabled?: boolean
  type?: 'text' | 'password' | 'number'
  flexibleHeight?: boolean
  flexibleMaxHeight?: number
  message?: IMessage
  validation?: (value: string) => IMessage | null
  autoFocus?: boolean
  className?: string
  style?: React.CSSProperties
  inputBoxStyles?: IInputBoxStyles
}

export interface InputBoxRef {
  focus: () => void
  blur: () => void
  select: () => void
  getValue: () => string
  setValue: (value: string) => void
  showMessage: (message: IMessage) => void
  hideMessage: () => void
  validate: () => MessageType | undefined
}

const VseInputBox: React.FC<InputBoxProps & { ref?: React.Ref<InputBoxRef> }> = ({
  value = '',
  onChange,
  placeholder,
  ariaLabel,
  disabled = false,
  type = 'text',
  flexibleHeight = false,
  flexibleMaxHeight,
  message,
  validation,
  autoFocus = false,
  style,
  inputBoxStyles = defaultInputBoxStyles,
  ref
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputBoxRef = useRef<InputBox | null>(null)

  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // 记录最后一次由输入框自身变化产生的最新值，用于区分“用户主动输入”和“外部传入的数据变化”
  const lastValueRef = useRef(value)
  useEffect(() => {
    lastValueRef.current = value
  }, [value])

  // 创建 InputBox 实例
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 清理之前的内容（防止 Strict Mode 双重挂载）
    container.innerHTML = ''

    const options: IInputOptions = {
      placeholder,
      ariaLabel,
      type,
      flexibleHeight,
      flexibleMaxHeight,
      inputBoxStyles,
      validationOptions: validation ? { validation } : undefined
    }

    inputBoxRef.current = new InputBox(container, undefined, options)

    // 设置初始值
    if (value) {
      inputBoxRef.current.value = value
    }

    // 监听值变化
    const disposable = inputBoxRef.current.onDidChange((newValue) => {
      lastValueRef.current = newValue
      onChangeRef.current?.(newValue)
    })

    // 自动聚焦
    if (autoFocus) {
      inputBoxRef.current.focus()
    }

    return () => {
      disposable.dispose()
      inputBoxRef.current?.dispose()
      inputBoxRef.current = null
      container.innerHTML = ''
    }
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [])

  // 更新值（仅当值是由外部修改，而非当前输入框自身修改时，才同步值）
  useEffect(() => {
    if (inputBoxRef.current && lastValueRef.current !== value) {
      inputBoxRef.current.value = value
      lastValueRef.current = value
    }
  }, [value])

  // 更新 placeholder
  useEffect(() => {
    inputBoxRef.current?.setPlaceHolder(placeholder || '')
  }, [placeholder])

  // 更新 ariaLabel
  useEffect(() => {
    inputBoxRef.current?.setAriaLabel(ariaLabel || '')
  }, [ariaLabel])

  // 更新 disabled
  useEffect(() => {
    inputBoxRef.current?.setEnabled(!disabled)
  }, [disabled])

  // 更新 message
  useEffect(() => {
    if (message) {
      inputBoxRef.current?.showMessage(message)
    } else {
      inputBoxRef.current?.hideMessage()
    }
  }, [message])

  // 暴露方法给 ref
  useImperativeHandle(
    ref,
    () => ({
      focus: () => inputBoxRef.current?.focus(),
      blur: () => inputBoxRef.current?.blur(),
      select: () => inputBoxRef.current?.select(),
      getValue: () => inputBoxRef.current?.value || '',
      setValue: (newValue: string) => {
        if (inputBoxRef.current) {
          inputBoxRef.current.value = newValue
        }
      },
      showMessage: (msg: IMessage) => inputBoxRef.current?.showMessage(msg),
      hideMessage: () => inputBoxRef.current?.hideMessage(),
      validate: () => inputBoxRef.current?.validate()
    }),
    []
  )

  return <div ref={containerRef} style={style} />
}

export default VseInputBox
