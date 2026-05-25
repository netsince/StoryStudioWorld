/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface ILocalizeInfo {
	key: string;
	comment: string[];
}

export interface ILocalizedString {
	original: string;
	value: string;
}

function _format(message: string, args: (string | number | boolean | undefined | null)[]): string {
	let result: string;

	if (args.length === 0) {
		result = message;
	} else {
		result = message.replace(/\{(\d+)\}/g, (match, rest) => {
			const index = rest[0];
			const arg = args[index];
			let result = match;
			if (typeof arg === 'string') {
				result = arg;
			} else if (typeof arg === 'number' || typeof arg === 'boolean' || arg === void 0 || arg === null) {
				result = String(arg);
			}
			return result;
		});
	}

	return result;
}

export function localize(info: ILocalizeInfo, message: string, ...args: (string | number | boolean | undefined | null)[]): string;
export function localize(key: string, message: string, ...args: (string | number | boolean | undefined | null)[]): string;
export function localize(data: ILocalizeInfo | string, message: string, ...args: (string | number | boolean | undefined | null)[]): string {
	return _format(message, args);
}

export function localize2(info: ILocalizeInfo, message: string, ...args: (string | number | boolean | undefined | null)[]): ILocalizedString;
export function localize2(key: string, message: string, ...args: (string | number | boolean | undefined | null)[]): ILocalizedString;
export function localize2(data: ILocalizeInfo | string, originalMessage: string, ...args: (string | number | boolean | undefined | null)[]): ILocalizedString {
	const value = _format(originalMessage, args);
	return {
		value,
		original: value
	};
}

export function getNLSMessages(): string[] {
	return [];
}

export function getNLSLanguage(): string | undefined {
	return undefined;
}

export interface INLSLanguagePackConfiguration {
	readonly translationsConfigFile: string;
	readonly messagesFile: string;
	readonly corruptMarkerFile: string;
}

export interface INLSConfiguration {
	readonly userLocale: string;
	readonly osLocale: string;
	readonly resolvedLanguage: string;
	readonly languagePack?: INLSLanguagePackConfiguration;
	readonly defaultMessagesFile: string;
	readonly locale: string;
	readonly availableLanguages: Record<string, string>;
	readonly _languagePackSupport?: boolean;
	readonly _languagePackId?: string;
	readonly _translationsConfigFile?: string;
	readonly _cacheRoot?: string;
	readonly _resolvedLanguagePackCoreLocation?: string;
	readonly _corruptedFile?: string;
}

export interface ILanguagePack {
	readonly hash: string;
	readonly label: string | undefined;
	readonly extensions: {
		readonly extensionIdentifier: { readonly id: string; readonly uuid?: string };
		readonly version: string;
	}[];
	readonly translations: Record<string, string | undefined>;
}

export type ILanguagePacks = Record<string, ILanguagePack | undefined>;
