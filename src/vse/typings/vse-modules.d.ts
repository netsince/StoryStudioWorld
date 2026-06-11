// Type declarations for vse modules to skip type checking
declare module 'vs/base/browser/ui/inputbox/inputBox' {
  export class InputBox {
    constructor(container: HTMLElement, context?: any, options?: IInputOptions);
    value: string;
    setEnabled(enabled: boolean): void;
    setPlaceholder(placeholder: string): void;
    showMessage(message: IMessage): void;
    hideMessage(): void;
    dispose(): void;
    onDidChange: any;
    onDidHeightChange: any;
  }
  export interface IInputOptions {
    placeholder?: string;
    ariaLabel?: string;
    type?: string;
    flexibleHeight?: boolean;
    flexibleMaxHeight?: number;
    validationOptions?: any;
  }
  export const MessageType: {
    INFO: number;
    WARNING: number;
    ERROR: number;
  };
  export interface IMessage {
    type: number;
    content: string;
  }
  export interface IInputBoxStyles {}
}

declare module 'vs/platform/theme/browser/defaultStyles' {
  export const defaultInputBoxStyles: any;
}

// Generic declaration for all other vs/* modules
declare module 'vs/*' {
  const value: any;
  export default value;
}

declare module 'vs/base/*' {
  const value: any;
  export default value;
}

declare module 'vs/editor/*' {
  const value: any;
  export default value;
}

declare module 'vs/platform/*' {
  const value: any;
  export default value;
}