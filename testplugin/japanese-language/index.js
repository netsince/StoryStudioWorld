function activate(api) {
  console.log('[Japanese Language Pack] Plugin activated');

  var languages = api.i18n.getAvailableLanguages();
  var jaExists = languages.some(function(lang) {
    return lang.code === 'ja';
  });

  if (jaExists) {
    console.log('[Japanese Language Pack] 日本語言語パックが正常に読み込まれました！');
    console.log('[Japanese Language Pack] Available languages:', languages.map(function(l) { return l.code; }).join(', '));
  } else {
    console.warn('[Japanese Language Pack] 言語ファイルが見つかりませんでした');
  }

  api.commands.register('japaneseLanguage.switchToJapanese', function() {
    api.i18n.setLanguage('ja');
    api.ui.showNotification('言語を日本語に切り替えました', 'info');
  });

  console.log('[Japanese Language Pack] Plugin ready!');
}

function deactivate() {
  console.log('[Japanese Language Pack] Plugin deactivated');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { activate: activate, deactivate: deactivate };
} else {
  exports.activate = activate;
  exports.deactivate = deactivate;
}
