// 后台服务脚本 - 处理右键菜单

// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
    // 翻译选中文本
    chrome.contextMenus.create({
        id: 'translateToChineseMenu',
        title: '翻译成中文',
        contexts: ['selection']
    });

    // 翻译整段
    chrome.contextMenus.create({
        id: 'translateParagraph',
        title: '翻译整段',
        contexts: ['page', 'selection']
    });

    // 翻译全文
    chrome.contextMenus.create({
        id: 'translateFullPage',
        title: '翻译网页全文',
        contexts: ['page']
    });
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'translateToChineseMenu' && info.selectionText) {
        // 发送消息到内容脚本
        chrome.tabs.sendMessage(tab.id, {
            action: 'translate',
            text: info.selectionText
        });
    } else if (info.menuItemId === 'translateParagraph') {
        chrome.tabs.sendMessage(tab.id, {
            action: 'translateParagraph'
        });
    } else if (info.menuItemId === 'translateFullPage') {
        chrome.tabs.sendMessage(tab.id, {
            action: 'translateFullPage'
        });
    }
});
