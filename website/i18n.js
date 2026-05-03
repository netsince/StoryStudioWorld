;(function () {
  'use strict'

  var STORAGE_KEY = 'ssw:website:lang'

  var translations = {
    zh: {
      nav_editor: '编辑器',
      nav_world: '世界观',
      nav_export: '导出',
      nav_plugin: '插件',
      nav_download: '下载',
      nav_download_app: '下载应用',
      hero_title_1: '创作',
      hero_title_2: '即自由',
      hero_desc_1: '离线。本地。完全属于你自己。',
      hero_desc_2: '一款为小说作者打造的桌面创作工具。',
      hero_download: '免费下载',
      hero_explore: '探索功能',
      editor_title_1: '为写作',
      editor_title_2: '而生的编辑器',
      editor_detail_1: '多标签页并行编辑，拖拽排序，像整理思绪一样整理章节。',
      editor_detail_2: '禅模式一键隐藏所有干扰，只留你和文字。',
      editor_detail_3: '自动保存，永不丢失。本地 SQLite 数据库，你的数据只属于你。',
      world_title_1: '构建你的',
      world_title_2: '世界观',
      world_detail_1: '独立的世界观面板，角色、地点、种族、历史，一切井井有条。',
      world_detail_2: '画廊系统为每个节点关联图片，角色立绘、场景图，所见即所得。',
      world_detail_3: '阅读编排自定义章节顺序，按你的节奏讲述故事。',
      export_title_1: '任意形态',
      export_title_2: '输出你的故事',
      export_pdf_desc: '专业排版，适合打印与分享',
      export_epub_desc: '电子书标准格式，全平台兼容',
      export_md_desc: '纯文本标记，版本控制友好',
      export_wiki_title: 'Wiki 网站',
      export_wiki_desc: '静态 HTML 维基，在线浏览你的世界观',
      export_docx_desc: 'Word 格式，便于二次编辑',
      plugin_title_1: '无限扩展',
      plugin_title_2: '由你定义',
      plugin_detail_1: 'JavaScript 插件系统，注册命令、扩展 UI、监听编辑器事件。',
      plugin_detail_2: '社区插件市场，字数统计、AI 助手、多语言包，即装即用。',
      plugin_detail_3: '完整的 API 文档，几行代码即可打造属于你的创作工具。',
      download_eyebrow: '开始创作',
      download_title_1: '你的故事',
      download_title_2: '在等你',
      download_desc: '完全免费，离线使用',
      download_github: '前往 GitHub Release 下载',
      page_title: 'Story Studio World — 创作即自由',
      page_desc: '专为小说创作者打造的桌面创作工具。离线、自由、无限可能。',
      mock_menu: '文件 编辑 选择 查看 转到 帮助',
      mock_act_write: '编写',
      mock_act_setting: '设定',
      mock_act_plugin: '插件',
      mock_act_outline: '章纲',
      mock_act_proofread: '校对',
      mock_act_memo: '便签',
      mock_act_snapshot: '快照',
      mock_sidebar_write: '编写',
      mock_sidebar_world: '世界设定',
      mock_sidebar_plugins: '已安装插件',
      mock_tree_story: '故事',
      mock_tree_vol1: '第一卷',
      mock_tree_ch2: '第二章',
      mock_tree_ch3: '第三章',
      mock_tree_vol2: '第二卷',
      mock_tree_protagonist: '主角',
      mock_tab_ch2: '第二章',
      mock_tab_ch1: '第一章',
      mock_status_words42: '字数 42',
      mock_status_networds38: '净字数 38',
      mock_status_para3: '段落 3',
      mock_status_autosave: '自动保存',
      mock_status_words24: '字数 24',
      mock_status_networds20: '净字数 20',
      mock_text_rain: '窗外的雨淅淅沥沥地下着，',
      mock_text_mountain: '她望着远处模糊的山影，',
      mock_text_melancholy: '心中涌起一阵难以言喻的惆怅。',
      mock_text_leave: '「该走了。」她轻声说道。',
      mock_cat_character: '人物',
      mock_cat_location: '地点',
      mock_cat_worldview: '世界观',
      mock_cat_item: '物品',
      mock_cat_other: '其他',
      mock_field_name: '角色',
      mock_field_gender: '性别',
      mock_field_background: '背景经历',
      mock_field_personality: '性格特征',
      mock_field_age: '年龄',
      mock_field_identity: '身份',
      mock_not_filled: '未填写',
      mock_gender_male: '男',
      mock_identity_value: '云隐山庄少庄主',
      mock_personality_desc: '性格清冷，不善言辞，却心怀天下。自幼习武，剑法超群。',
      mock_gallery: '图库',
      mock_plugin_wordcount: '字数统计',
      mock_plugin_ai: 'AI 写作助手',
      mock_plugin_darktheme: '深色主题包',
      mock_plugin_openfolder: '打开插件目录',
      mock_wiki_back: '← 返回目录',
      mock_wiki_toc: '目录',
      mock_wiki_bg: '背景经历',
      mock_wiki_personality: '性格特征',
      mock_wiki_appearance: '外貌描述',
      mock_wiki_bg_text: '自幼在云隐山庄长大，师从父亲学习剑法。',
      mock_wiki_personality_text: '性格清冷，不善言辞，却心怀天下。',
      mock_caption_editor: '分屏编辑 · 多标签页 · 禅模式',
      mock_caption_world: '世界观 · 画廊 · 阅读编排',
      mock_caption_plugin: '插件市场 · 自定义扩展 · 开放 API',
      mock_pdf_ch2: '第二章',
      mock_epub_ch2: '第二章',
      mock_md_ch2: '# 第二章',
      mock_md_rain: '窗外的雨淅淅沥沥地下着，',
      mock_md_mountain: '她望着远处模糊的山影。',
      mock_md_leave: '**该走了。**',
      mock_docx_ch2: '第二章'
    },
    en: {
      nav_editor: 'Editor',
      nav_world: 'World',
      nav_export: 'Export',
      nav_plugin: 'Plugins',
      nav_download: 'Download',
      nav_download_app: 'Download App',
      hero_title_1: 'Create',
      hero_title_2: 'Freely',
      hero_desc_1: 'Offline. Local. Entirely yours.',
      hero_desc_2: 'A desktop writing tool crafted for novelists.',
      hero_download: 'Free Download',
      hero_explore: 'Explore Features',
      editor_title_1: 'An Editor',
      editor_title_2: 'Built for Writing',
      editor_detail_1:
        'Multi-tab parallel editing with drag-and-drop sorting — organize chapters like organizing thoughts.',
      editor_detail_2:
        'Zen mode hides all distractions in one click, leaving only you and your words.',
      editor_detail_3:
        'Auto-save, never lose your work. Local SQLite database — your data belongs to you alone.',
      world_title_1: 'Build Your',
      world_title_2: 'World',
      world_detail_1:
        'Dedicated world-building panel — characters, locations, races, history, all neatly organized.',
      world_detail_2:
        'Gallery system links images to each node — character art, scene illustrations, WYSIWYG.',
      world_detail_3: 'Custom reading order for chapters — tell your story at your own pace.',
      export_title_1: 'Export in',
      export_title_2: 'Any Format',
      export_pdf_desc: 'Professional typesetting, ready for print and sharing',
      export_epub_desc: 'Standard e-book format, compatible across platforms',
      export_md_desc: 'Plain text markup, version control friendly',
      export_wiki_title: 'Wiki Site',
      export_wiki_desc: 'Static HTML wiki to browse your world online',
      export_docx_desc: 'Word format, easy to edit further',
      plugin_title_1: 'Infinite',
      plugin_title_2: 'Extensibility',
      plugin_detail_1:
        'JavaScript plugin system — register commands, extend UI, listen to editor events.',
      plugin_detail_2:
        'Community plugin marketplace — word count, AI assistant, language packs, install and go.',
      plugin_detail_3:
        'Complete API documentation — build your own writing tool in just a few lines of code.',
      download_eyebrow: 'Start Creating',
      download_title_1: 'Your Story',
      download_title_2: 'Awaits',
      download_desc: 'Free & offline',
      download_github: 'Download from GitHub Release',
      page_title: 'Story Studio World — Create Freely',
      page_desc: 'A desktop writing tool crafted for novelists. Offline, free, limitless.',
      mock_menu: 'File Edit Select View Go Help',
      mock_act_write: 'Write',
      mock_act_setting: 'Settings',
      mock_act_plugin: 'Plugins',
      mock_act_outline: 'Outline',
      mock_act_proofread: 'Proofread',
      mock_act_memo: 'Memo',
      mock_act_snapshot: 'Snapshot',
      mock_sidebar_write: 'Write',
      mock_sidebar_world: 'World Settings',
      mock_sidebar_plugins: 'Installed Plugins',
      mock_tree_story: 'Story',
      mock_tree_vol1: 'Volume 1',
      mock_tree_ch2: 'Chapter 2',
      mock_tree_ch3: 'Chapter 3',
      mock_tree_vol2: 'Volume 2',
      mock_tree_protagonist: 'Protagonist',
      mock_tab_ch2: 'Chapter 2',
      mock_tab_ch1: 'Chapter 1',
      mock_status_words42: 'Words 42',
      mock_status_networds38: 'Net 38',
      mock_status_para3: 'Paragraphs 3',
      mock_status_autosave: 'Auto Save',
      mock_status_words24: 'Words 24',
      mock_status_networds20: 'Net 20',
      mock_text_rain: 'Rain pattered against the window,',
      mock_text_mountain: 'She gazed at the distant, blurred mountains,',
      mock_text_melancholy: 'A nameless melancholy welled up inside her.',
      mock_text_leave: '"It\'s time to go," she whispered.',
      mock_cat_character: 'Characters',
      mock_cat_location: 'Locations',
      mock_cat_worldview: 'Worldview',
      mock_cat_item: 'Items',
      mock_cat_other: 'Other',
      mock_field_name: 'Name',
      mock_field_gender: 'Gender',
      mock_field_background: 'Background',
      mock_field_personality: 'Personality',
      mock_field_age: 'Age',
      mock_field_identity: 'Identity',
      mock_not_filled: 'Not filled',
      mock_gender_male: 'Male',
      mock_identity_value: 'Young Master of Yunyin Manor',
      mock_personality_desc:
        'Aloof and taciturn, yet harboring grand ambitions. Trained in swordsmanship from a young age.',
      mock_gallery: 'Gallery',
      mock_plugin_wordcount: 'Word Count',
      mock_plugin_ai: 'AI Writing Assistant',
      mock_plugin_darktheme: 'Dark Theme Pack',
      mock_plugin_openfolder: 'Open Plugin Folder',
      mock_wiki_back: '← Back to Index',
      mock_wiki_toc: 'Contents',
      mock_wiki_bg: 'Background',
      mock_wiki_personality: 'Personality',
      mock_wiki_appearance: 'Appearance',
      mock_wiki_bg_text: 'Raised at Yunyin Manor, trained in swordsmanship by his father.',
      mock_wiki_personality_text: 'Aloof and taciturn, yet harboring grand ambitions.',
      mock_caption_editor: 'Split View · Multi-tab · Zen Mode',
      mock_caption_world: 'Worldview · Gallery · Reading Order',
      mock_caption_plugin: 'Plugin Market · Custom Extensions · Open API',
      mock_pdf_ch2: 'Chapter 2',
      mock_epub_ch2: 'Chapter 2',
      mock_md_ch2: '# Chapter 2',
      mock_md_rain: 'Rain pattered against the window,',
      mock_md_mountain: 'She gazed at the distant mountains.',
      mock_md_leave: "**It's time to go.**",
      mock_docx_ch2: 'Chapter 2'
    }
  }

  function detectLanguage() {
    var saved = localStorage.getItem(STORAGE_KEY)
    if (saved && translations[saved]) return saved

    var navLangs = navigator.languages || [navigator.language || navigator.userLanguage || '']
    for (var i = 0; i < navLangs.length; i++) {
      var lang = navLangs[i].toLowerCase()
      if (lang.startsWith('zh')) return 'zh'
      if (lang === 'en' || lang.startsWith('en-')) return 'en'
    }
    return 'zh'
  }

  var currentLang = detectLanguage()

  function applyTranslations(lang) {
    var dict = translations[lang]
    if (!dict) return

    var elements = document.querySelectorAll('[data-i18n]')
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i]
      var key = el.getAttribute('data-i18n')
      if (dict[key] !== undefined) {
        el.textContent = dict[key]
      }
    }

    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
    document.title = dict.page_title || document.title

    var metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc && dict.page_desc) {
      metaDesc.setAttribute('content', dict.page_desc)
    }

    var ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle && dict.page_title) ogTitle.setAttribute('content', dict.page_title)
    var ogDesc = document.querySelector('meta[property="og:description"]')
    if (ogDesc && dict.page_desc) ogDesc.setAttribute('content', dict.page_desc)
    var twTitle = document.querySelector('meta[name="twitter:title"]')
    if (twTitle && dict.page_title) twTitle.setAttribute('content', dict.page_title)
    var twDesc = document.querySelector('meta[name="twitter:description"]')
    if (twDesc && dict.page_desc) twDesc.setAttribute('content', dict.page_desc)

    var btns = document.querySelectorAll('.lang-btn')
    for (var j = 0; j < btns.length; j++) {
      btns[j].classList.toggle('active', btns[j].getAttribute('data-lang') === lang)
    }
  }

  function setLanguage(lang) {
    if (!translations[lang]) return
    currentLang = lang
    localStorage.setItem(STORAGE_KEY, lang)
    applyTranslations(lang)
  }

  window._sswI18n = {
    get currentLang() {
      return currentLang
    },
    setLanguage: setLanguage,
    applyTranslations: applyTranslations
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyTranslations(currentLang)

    var switchEl = document.getElementById('langSwitch')
    if (switchEl) {
      switchEl.addEventListener('click', function (e) {
        var btn = e.target.closest('.lang-btn')
        if (btn) {
          var lang = btn.getAttribute('data-lang')
          if (lang) setLanguage(lang)
        }
      })
    }

    var mobileSwitch = document.querySelector('.mobile-lang-switch')
    if (mobileSwitch) {
      mobileSwitch.addEventListener('click', function (e) {
        var btn = e.target.closest('.lang-btn')
        if (btn) {
          var lang = btn.getAttribute('data-lang')
          if (lang) setLanguage(lang)
        }
      })
    }
  })
})()
