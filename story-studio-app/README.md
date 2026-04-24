# story-studio-app

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ pnpm install
```

### Development

```bash
$ pnpm dev
```

### Build

```bash
# For windows
$ pnpm build:win

# For macOS
$ pnpm build:mac

# For Linux
$ pnpm build:linux
```

## QA:关于富文本支持

我们死都不会正式支持富文本，最起码我们在章中不会。

请问你是来写故事的还是来写MD的？哪家正经的网文平台支持富文本？WonderPen和作家助手都没富文本。你如果要用富文本，请去用插件或者VSCode。

## QA:关于AI支持

不会原生做AI，等到插件好了后会依靠插件做官方AI

但，如果在此之前，社区有AI fork，我们则不会再继续做

Moorld LTD 的 Moorld Editor 就是一个很好的基于 Story Studio World 的 AI原生编辑器。我对此表示很赞赏

## QA:我想自己做/提议功能

优先考虑插件、然后是fork、最后是issue pr

## QA:主题好难看/语言好少

以后的插件商城会开放主题包和语言包
