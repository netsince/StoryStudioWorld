/*---------------------------------------------------------------------------------------------
 *  Copyright (c) netSince.com. All rights reserved.
 *  Licensed under the THE netSince.com's PROJECT PUBLIC LICENSE License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CharCode } from '../../../base/common/charCode.js';
import * as strings from '../../../base/common/strings.js';
import { WrappingIndent, IComputedEditorOptions, EditorOption } from '../config/editorOptions.js';
import { CharacterClassifier } from '../core/characterClassifier.js';
import { FontInfo } from '../config/fontInfo.js';
import { LineInjectedText } from '../textModelEvents.js';
import { InjectedTextOptions } from '../model.js';
import { ILineBreaksComputerFactory, ILineBreaksComputer, ModelLineProjectionData, ILineBreaksComputerContext } from '../modelLineProjectionData.js';

const enum CharacterClass {
	NONE = 0,
	BREAK_BEFORE = 1,
	BREAK_AFTER = 2,
	BREAK_IDEOGRAPHIC = 3
}

class WrappingCharacterClassifier extends CharacterClassifier<CharacterClass> {
	constructor(BREAK_BEFORE: string, BREAK_AFTER: string) {
		super(CharacterClass.NONE);
		for (let i = 0; i < BREAK_BEFORE.length; i++) {
			this.set(BREAK_BEFORE.charCodeAt(i), CharacterClass.BREAK_BEFORE);
		}
		for (let i = 0; i < BREAK_AFTER.length; i++) {
			this.set(BREAK_AFTER.charCodeAt(i), CharacterClass.BREAK_AFTER);
		}
	}

	public override get(charCode: number): CharacterClass {
		if (charCode >= 0 && charCode < 256) {
			return <CharacterClass>this._asciiMap[charCode];
		}
		if (
			(charCode >= 0x3040 && charCode <= 0x30FF)
			|| (charCode >= 0x3400 && charCode <= 0x4DBF)
			|| (charCode >= 0x4E00 && charCode <= 0x9FFF)
		) {
			return CharacterClass.BREAK_IDEOGRAPHIC;
		}
		return <CharacterClass>(this._map.get(charCode) || this._defaultValue);
	}
}

function canBreak(prevCharCode: number, prevCharCodeClass: CharacterClass, charCode: number, charCodeClass: CharacterClass, isKeepAll: boolean): boolean {
	return (
		charCode !== CharCode.Space
		&& (
			(prevCharCodeClass === CharacterClass.BREAK_AFTER && charCodeClass !== CharacterClass.BREAK_AFTER)
			|| (prevCharCodeClass !== CharacterClass.BREAK_BEFORE && charCodeClass === CharacterClass.BREAK_BEFORE)
			|| (!isKeepAll && prevCharCodeClass === CharacterClass.BREAK_IDEOGRAPHIC && charCodeClass !== CharacterClass.BREAK_AFTER)
			|| (!isKeepAll && charCodeClass === CharacterClass.BREAK_IDEOGRAPHIC && prevCharCodeClass !== CharacterClass.BREAK_BEFORE)
		)
	);
}

export class ProportionalLineBreaksComputerFactory implements ILineBreaksComputerFactory {
	public static create(options: IComputedEditorOptions): ProportionalLineBreaksComputerFactory {
		return new ProportionalLineBreaksComputerFactory(
			options.get(EditorOption.wordWrapBreakBeforeCharacters),
			options.get(EditorOption.wordWrapBreakAfterCharacters)
		);
	}

	private readonly classifier: WrappingCharacterClassifier;

	constructor(breakBeforeChars: string, breakAfterChars: string) {
		this.classifier = new WrappingCharacterClassifier(breakBeforeChars, breakAfterChars);
	}

	public createLineBreaksComputer(context: ILineBreaksComputerContext, fontInfo: FontInfo, tabSize: number, wrappingColumn: number, wrappingIndent: WrappingIndent, wordBreak: 'normal' | 'keepAll', wrapOnEscapedLineFeeds: boolean): ILineBreaksComputer {
		const lineNumbers: number[] = [];
		const previousBreakingData: (ModelLineProjectionData | null)[] = [];
		return {
			addRequest: (lineNumber: number, previousLineBreakData: ModelLineProjectionData | null) => {
				lineNumbers.push(lineNumber);
				previousBreakingData.push(previousLineBreakData);
			},
			finalize: () => {
				const result: (ModelLineProjectionData | null)[] = [];
				for (let i = 0, len = lineNumbers.length; i < len; i++) {
					const lineNumber = lineNumbers[i];
					const injectedText = context.getLineInjectedText(lineNumber);
					const lineText = context.getLineContent(lineNumber);
					result[i] = createLineBreaks(this.classifier, lineText, injectedText, fontInfo, tabSize, wrappingColumn, wrappingIndent, wordBreak);
				}
				return result;
			}
		};
	}
}

function createLineBreaks(
	classifier: WrappingCharacterClassifier,
	lineText: string,
	injectedText: LineInjectedText[] | null,
	fontInfo: FontInfo,
	tabSize: number,
	wrappingColumn: number,
	wrappingIndent: WrappingIndent,
	wordBreak: 'normal' | 'keepAll'
): ModelLineProjectionData | null {
	if (wrappingColumn === -1) {
		return null;
	}

	const len = lineText.length;
	if (len <= 1) {
		return null;
	}

	const isKeepAll = (wordBreak === 'keepAll');

	const containerWidth = wrappingColumn * fontInfo.typicalHalfwidthCharacterWidth;

	let firstNonWhitespaceIndex = 0;
	let wrappedTextIndentLength = 0;
	let availableWidth = containerWidth;

	if (wrappingIndent !== WrappingIndent.None) {
		firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(lineText);
		if (firstNonWhitespaceIndex === -1) {
			firstNonWhitespaceIndex = 0;
		} else {
			for (let i = 0; i < firstNonWhitespaceIndex; i++) {
				const charCode = lineText.charCodeAt(i);
				if (charCode === CharCode.Tab) {
					wrappedTextIndentLength += tabSize - (wrappedTextIndentLength % tabSize);
				} else {
					wrappedTextIndentLength += 1;
				}
			}
			const indentWidth = wrappedTextIndentLength * fontInfo.spaceWidth;
			if (indentWidth + fontInfo.typicalFullwidthCharacterWidth > containerWidth) {
				firstNonWhitespaceIndex = 0;
				wrappedTextIndentLength = 0;
			} else {
				availableWidth = containerWidth - indentWidth;
			}
		}
	}

	const additionalIndent = (wrappingIndent === WrappingIndent.DeepIndent ? 2 : wrappingIndent === WrappingIndent.Indent ? 1 : 0);
	const additionalIndentSize = tabSize * additionalIndent;
	wrappedTextIndentLength += additionalIndentSize;

	const charWidths: number[] = measureCharWidths(lineText, fontInfo, tabSize);

	const breakingOffsets: number[] = [];
	const breakingOffsetsVisibleColumn: number[] = [];

	let currentWidth = 0;
	let lastBreakOffset = firstNonWhitespaceIndex;
	let lastBreakWidth = 0;
	let candidateBreakOffset = 0;
	let candidateBreakWidth = 0;

	let prevCharCode = firstNonWhitespaceIndex === 0 ? CharCode.Null : lineText.charCodeAt(firstNonWhitespaceIndex - 1);
	let prevCharCodeClass = firstNonWhitespaceIndex === 0 ? CharacterClass.NONE : classifier.get(prevCharCode);

	for (let i = firstNonWhitespaceIndex; i < len; i++) {
		const charCode = lineText.charCodeAt(i);
		let charCodeClass: CharacterClass;
		let charWidth: number;

		if (strings.isHighSurrogate(charCode)) {
			charCodeClass = CharacterClass.NONE;
			charWidth = charWidths[i] + (i + 1 < len ? charWidths[i + 1] : 0);
			i++;
		} else {
			charCodeClass = classifier.get(charCode);
			charWidth = charWidths[i];
		}

		if (canBreak(prevCharCode, prevCharCodeClass, charCode, charCodeClass, isKeepAll)) {
			candidateBreakOffset = i;
			candidateBreakWidth = currentWidth;
		}

		currentWidth += charWidth;

		if (currentWidth > availableWidth) {
			if (candidateBreakOffset > lastBreakOffset) {
				breakingOffsets.push(candidateBreakOffset);
				breakingOffsetsVisibleColumn.push(Math.round(candidateBreakWidth / fontInfo.typicalHalfwidthCharacterWidth));
				lastBreakOffset = candidateBreakOffset;
				lastBreakWidth = candidateBreakWidth;
				currentWidth -= candidateBreakWidth;
				candidateBreakOffset = 0;
				candidateBreakWidth = 0;
			} else {
				breakingOffsets.push(i);
				breakingOffsetsVisibleColumn.push(Math.round((currentWidth - charWidth) / fontInfo.typicalHalfwidthCharacterWidth));
				lastBreakOffset = i;
				lastBreakWidth = currentWidth - charWidth;
				currentWidth = charWidth;
				candidateBreakOffset = 0;
				candidateBreakWidth = 0;
			}
		}

		prevCharCode = charCode;
		prevCharCodeClass = charCodeClass;
	}

	if (breakingOffsets.length === 0) {
		return null;
	}

	let injectionOptions: InjectedTextOptions[] | null = null;
	let injectionOffsets: number[] | null = null;
	if (injectedText) {
		injectionOptions = injectedText.map(t => t.options);
		injectionOffsets = injectedText.map(text => text.column - 1);
	}

	return new ModelLineProjectionData(injectionOffsets, injectionOptions, breakingOffsets, breakingOffsetsVisibleColumn, wrappedTextIndentLength);
}

function measureCharWidths(text: string, fontInfo: FontInfo, tabSize: number): number[] {
	const widths: number[] = [];
	const len = text.length;

	for (let i = 0; i < len; i++) {
		const charCode = text.charCodeAt(i);

		if (charCode === CharCode.Tab) {
			const prevColumns = widths.reduce((sum, w) => sum + Math.round(w / fontInfo.typicalHalfwidthCharacterWidth), 0);
			const tabWidth = tabSize - (prevColumns % tabSize);
			widths.push(tabWidth * fontInfo.typicalHalfwidthCharacterWidth);
		} else if (strings.isHighSurrogate(charCode)) {
			widths.push(fontInfo.typicalFullwidthCharacterWidth);
		} else if (strings.isFullWidthCharacter(charCode)) {
			widths.push(fontInfo.typicalFullwidthCharacterWidth);
		} else {
			widths.push(fontInfo.typicalHalfwidthCharacterWidth);
		}
	}

	return widths;
}
