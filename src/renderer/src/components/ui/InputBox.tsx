import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { InputBox as VSEInputBox, IInputOptions, IInputBoxStyles } from 'vs/base/browser/ui/inputbox/inputBox'
import 'vs/base/browser/ui/inputbox/inputBox.css'

export interface InputBoxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onFocus?: () => void
  onBlur?: () => void
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
  inputBoxStyles?: IInputBoxStyles
  flexibleHeight?: boolean
  flexibleMaxHeight?: number
  ariaLabel?: string
}

export interface InputBoxRef {
  focus: () => void
  getElement: () => HTMLElement
  getValue: () => string
  setValue: (value: string) => void
}

const defaultInputBoxStyles: IInputBoxStyles = {
  inputBackground: 'var(--input-bg, #3c3c3c)',
  inputForeground: 'var(--foreground, #cccccc)',
  inputBorder: 'var(--border-color, #454545)',
  inputValidationInfoBorder: '#55AAFF',
  inputValidationInfoBackground: '#063B49',
  inputValidationInfoForeground: '#ffffff',
  inputValidationWarningBorder: '#B89500',
  inputValidationWarningBackground: '#352A05',
  inputValidationWarningForeground: '#ffffff',
  inputValidationErrorBorder: '#BE1100',
  inputValidationErrorBackground: '#5A1D1D',
  inputValidationErrorForeground: '#ffffff'
}

export const InputBox = forwardRef<InputBoxRef, InputBoxProps>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputBoxRef = useRef<VSEInputBox | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const options: IInputOptions = {
      placeholder: props.placeholder || '',
      ariaLabel: props.ariaLabel || '',
      flexibleHeight: props.flexibleHeight,
      flexibleMaxHeight: props.flexibleMaxHeight,
      inputBoxStyles: props.inputBoxStyles || defaultInputBoxStyles
    }

    const inputBox = new VSEInputBox(containerRef.current, undefined, options)
    inputBoxRef.current = inputBox

    // Set initial value
    if (props.value) {
      inputBox.value = props.value
    }

    // Listen for changes
    inputBox.onDidChange((newValue: string) => {
      props.onChange(newValue)
    })

    // Handle focus/blur
    const inputElement = inputBox.inputElement
    if (props.onFocus) {
      inputElement.addEventListener('focus', props.onFocus)
    }
    if (props.onBlur) {
      inputElement.addEventListener('blur', props.onBlur)
    }

    return () => {
      if (props.onFocus) {
        inputElement.removeEventListener('focus', props.onFocus)
      }
      if (props.onBlur) {
        inputElement.removeEventListener('blur', props.onBlur)
      }
      inputBox.dispose()
    }
  }, [])

  // Sync value changes from outside
  useEffect(() => {
    if (inputBoxRef.current && inputBoxRef.current.value !== props.value) {
      inputBoxRef.current.value = props.value
    }
  }, [props.value])

  // Sync placeholder
  useEffect(() => {
    if (inputBoxRef.current && props.placeholder) {
      inputBoxRef.current.setPlaceHolder(props.placeholder)
    }
  }, [props.placeholder])

  // Sync disabled state
  useEffect(() => {
    if (inputBoxRef.current) {
      if (props.disabled) {
        inputBoxRef.current.disable()
      } else {
        inputBoxRef.current.enable()
      }
    }
  }, [props.disabled])

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    focus: () => inputBoxRef.current?.focus(),
    getElement: () => inputBoxRef.current?.element || containerRef.current!,
    getValue: () => inputBoxRef.current?.value || '',
    setValue: (value: string) => {
      if (inputBoxRef.current) {
        inputBoxRef.current.value = value
      }
    }
  }), [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (props.onKeyDown) {
      props.onKeyDown(e)
    }
  }

  return (
    <div
      ref={containerRef}
      className={props.className}
      style={props.style}
      onKeyDown={handleKeyDown}
    />
  )
})

InputBox.displayName = 'InputBox'
