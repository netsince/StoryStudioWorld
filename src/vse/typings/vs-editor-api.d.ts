declare module 'vs/editor/editor.api' {
  interface IPosition {
    lineNumber: number;
    column: number;
  }

  interface IRange {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  }

  interface ISelection {
    selectionStartLineNumber: number;
    selectionStartColumn: number;
    positionLineNumber: number;
    positionColumn: number;
  }

  interface Uri {
    toString(): string;
    fsPath: string;
    path: string;
    scheme: string;
  }

  interface IStandaloneCodeEditor {
    getValue(): string;
    setValue(value: string): void;
    getModel(): ITextModel | null;
    setModel(model: ITextModel | null): void;
    getSelection(): Selection | null;
    setSelection(selection: ISelection): void;
    focus(): void;
    dispose(): void;
    onDidChangeModelContent(listener: (e: IModelContentChangedEvent) => void): IDisposable;
    onDidChangeCursorPosition(listener: (e: ICursorPositionChangedEvent) => void): IDisposable;
    onDidFocusEditorText(listener: () => void): IDisposable;
    onDidBlurEditorText(listener: () => void): IDisposable;
    updateOptions(options: IEditorOptions): void;
    getOptions(): IEditorOptions;
    addAction(action: IActionDescriptor): IDisposable;
    executeCommand(source: string, handler: string): void;
    layout(): void;
    revealLine(lineNumber: number): void;
    revealLineInCenter(lineNumber: number): void;
    getScrollTop(): number;
    setScrollTop(scrollTop: number): void;
    getDomNode(): HTMLElement;
  }

  interface ITextModel {
    getValue(): string;
    setValue(value: string): void;
    getLineContent(lineNumber: number): string;
    getLineCount(): number;
    getEOL(): string;
    dispose(): void;
    onDidChangeContent(listener: (e: IModelContentChangedEvent) => void): IDisposable;
    getWordAtPosition(position: IPosition): IWordAtPosition | null;
    findMatches(
      searchString: string,
      searchScope: IRange | null,
      isRegex: boolean,
      matchCase: boolean,
      wordSeparators: string | null,
      captureMatches: boolean,
      limitResultCount?: number
    ): FindMatch[];
  }

  interface IEditorOptions {
    theme?: string;
    language?: string;
    value?: string;
    readOnly?: boolean;
    minimap?: { enabled?: boolean };
    fontSize?: number;
    fontFamily?: string;
    lineNumbers?: 'on' | 'off' | 'relative';
    scrollBeyondLastLine?: boolean;
    wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
    automaticLayout?: boolean;
    glyphMargin?: boolean;
    folding?: boolean;
    lineDecorationsWidth?: number;
    lineNumbersMinChars?: number;
    renderLineHighlight?: 'none' | 'line' | 'all';
    scrollbar?: {
      vertical?: 'auto' | 'visible' | 'hidden';
      horizontal?: 'auto' | 'visible' | 'hidden';
    };
  }

  interface IActionDescriptor {
    id: string;
    label: string;
    run: (editor: IStandaloneCodeEditor) => void;
    keybindings?: number[];
    contextMenuGroupId?: string;
  }

  interface IDisposable {
    dispose(): void;
  }

  interface IModelContentChangedEvent {
    changes: IModelContentChange[];
    isFlush: boolean;
  }

  interface IModelContentChange {
    range: IRange;
    rangeLength: number;
    text: string;
  }

  interface ICursorPositionChangedEvent {
    position: IPosition;
    secondaryPositions: IPosition[];
    source: string;
    reason: string;
  }

  interface IWordAtPosition {
    word: string;
    startColumn: number;
    endColumn: number;
  }

  interface FindMatch {
    range: IRange;
    matches: string[] | null;
  }

  class Position implements IPosition {
    lineNumber: number;
    column: number;
    constructor(lineNumber: number, column: number);
    equals(other: IPosition): boolean;
    clone(): Position;
  }

  class Range implements IRange {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
    constructor(
      startLineNumber: number,
      startColumn: number,
      endLineNumber: number,
      endColumn: number
    );
    equals(other: IRange): boolean;
    containsPosition(position: IPosition): boolean;
    containsRange(range: IRange): boolean;
  }

  class Selection implements ISelection {
    selectionStartLineNumber: number;
    selectionStartColumn: number;
    positionLineNumber: number;
    positionColumn: number;
    constructor(
      selectionStartLineNumber: number,
      selectionStartColumn: number,
      positionLineNumber: number,
      positionColumn: number
    );
    equals(other: ISelection): boolean;
    clone(): Selection;
  }

  const Uri: {
    parse(value: string): Uri;
    file(path: string): Uri;
    from(components: { scheme: string; path: string }): Uri;
  };

  const editor: {
    create(
      domElement: HTMLElement,
      options?: IEditorOptions
    ): IStandaloneCodeEditor;
    createModel(
      value: string,
      language?: string,
      uri?: Uri
    ): ITextModel;
    setModelLanguage(model: ITextModel, language: string): void;
    setTheme(theme: string): void;
    defineTheme(themeName: string, themeData: object): void;
    dispose(): void;
    IStandaloneCodeEditor: IStandaloneCodeEditor;
    ITextModel: ITextModel;
  };

  const languages: {
    register(language: { id: string }): IDisposable;
    setMonarchTokensProvider(
      languageId: string,
      languageDef: object
    ): IDisposable;
    setLanguageConfiguration(
      languageId: string,
      configuration: object
    ): IDisposable;
    registerCompletionItemProvider(
      languageId: string,
      provider: {
        provideCompletionItems: (
          model: ITextModel,
          position: Position
        ) => { suggestions: object[] };
        triggerCharacters?: string[];
      }
    ): IDisposable;
  };

  const MarkerSeverity: {
    Hint: number;
    Info: number;
    Warning: number;
    Error: number;
  };

  const MarkerTag: {
    Unnecessary: number;
    Deprecated: number;
  };

  const KeyCode: {
    [key: string]: number;
  };

  const KeyMod: {
    [key: string]: number;
    CtrlCmd: number;
    Shift: number;
    Alt: number;
    WinCtrl: number;
  };

  const Emitter: {
    new <T>(): { event: object; fire: (data: T) => void; dispose: () => void };
  };

  const CancellationTokenSource: {
    new (): { token: object; cancel: () => void; dispose: () => void };
  };

  const Token: {
    [key: string]: number;
  };

  const SelectionDirection: {
    LTR: number;
    RTL: number;
  };

  export default {
    editor,
    languages,
    Uri,
    Position,
    Range,
    Selection,
    MarkerSeverity,
    MarkerTag,
    KeyCode,
    KeyMod,
    Emitter,
    CancellationTokenSource,
    Token,
    SelectionDirection,
  };

  export {
    editor,
    languages,
    Uri,
    Position,
    Range,
    Selection,
    MarkerSeverity,
    MarkerTag,
    KeyCode,
    KeyMod,
    Emitter,
    CancellationTokenSource,
    Token,
    SelectionDirection,
  };
}